import React, { createContext, useState, useContext, useEffect, useCallback, useRef, ReactNode } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, User as FirebaseUser, UserCredential } from 'firebase/auth';
import { auth, db } from '../config/firebaseConfig';
import { buscarFuncionarioPorUid } from '../services/FuncionariosService';
import { normalizeRole, hasPermission, Permissions } from '../auth/roles';
import { getDoc, doc, DocumentData } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { isFeatureEnabled } from '../config/featureFlags';

// Tipos
export interface CustomClaims {
  companyId?: string;
  role?: string;
  mfaEnabled?: boolean;
  mfaVerified?: boolean;
  updatedAt?: number;
}

export interface AppUser {
  uid: string;
  email?: string | null;
  name?: string;
  nome?: string; // Legacy/Firestore field
  funcao?: string;
  companyId?: string;
  company?: {
    id: string;
    [key: string]: any;
  } | null;
  customClaims?: CustomClaims;
  [key: string]: any; // Allow other fields from firestore
}

interface AuthContextType {
  user: AppUser | null;
  role: string | null;
  loading: boolean;
  login: (email: string, senha: string) => Promise<boolean>;
  logout: () => Promise<void>;
  register: (email: string, password: string) => Promise<{ success: boolean; user?: FirebaseUser; error?: any }>;
  sessionKey: number;
  hasPermission: (perm: string) => boolean;
  Permissions: typeof Permissions;
  refreshCustomClaims: () => Promise<void>;
  getCustomClaims: () => CustomClaims | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [role, setRole] = useState<string | null>(null);
  const [sessionKey, setSessionKey] = useState<number>(1);
  const [customClaims, setCustomClaims] = useState<CustomClaims | null>(null);
  const isManualLoginRef = useRef<boolean>(false);
  const claimsRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Feature flag para usar custom claims
  const useCustomClaims = isFeatureEnabled('useCustomClaims');

  useEffect(() => {
    let mounted = true;

    // DESABILITAR PERSISTÊNCIA FIREBASE COMPLETAMENTE
    const initAuth = async () => {
      try {
        // Forçar logout inicial
        await signOut(auth);
        await AsyncStorage.clear();

        // Limpar estados
        if (mounted) {
          setUser(null);
          setRole(null);
          isManualLoginRef.current = false;
          setLoading(false);
        }
      } catch (error) {
        if (mounted) {
          setUser(null);
          setRole(null);
          isManualLoginRef.current = false;
          setLoading(false);
        }
      }
    };

    initAuth();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (!mounted) return;

      const { isIgnorandoMudancaAuth } = require('../services/FuncionariosService');

      if (isIgnorandoMudancaAuth()) {
        return;
      }

      if (firebaseUser && isManualLoginRef.current) {
        return;
      }

      if (firebaseUser && !isManualLoginRef.current) {
        try {
          await signOut(auth);
          await AsyncStorage.clear();
        } catch (error) { // ignore
        }
      }

      if (mounted) {
        setUser(null);
        setRole(null);
        isManualLoginRef.current = false;
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const login = async (email: string, senha: string): Promise<boolean> => {
    try {
      setLoading(true);

      // PRIMEIRO: Garantir logout completo
      try {
        await signOut(auth);
        await AsyncStorage.clear();
      } catch (e) { // ignore
      }

      // SEGUNDO: Marcar como login manual
      isManualLoginRef.current = true;

      // TERCEIRO: Fazer login
      console.log('[Auth] Tentando login Firebase Auth...');
      const userCredential: UserCredential = await signInWithEmailAndPassword(auth, email, senha);
      console.log('[Auth] ✅ Auth OK, UID:', userCredential.user.uid);

      // Aguardar token de auth propagar
      await new Promise(resolve => setTimeout(resolve, 1000));

      // QUARTO: Obter custom claims se feature flag habilitado
      let claims: CustomClaims | null = null;
      if (useCustomClaims) {
        try {
          const idTokenResult = await userCredential.user.getIdTokenResult();
          claims = {
            companyId: idTokenResult.claims.companyId as string,
            role: idTokenResult.claims.role as string,
            mfaEnabled: idTokenResult.claims.mfaEnabled as boolean,
            mfaVerified: idTokenResult.claims.mfaVerified as boolean,
            updatedAt: idTokenResult.claims.updatedAt as number
          };
          setCustomClaims(claims);
          console.log('[Auth] ✅ Custom claims carregados:', claims);
        } catch (claimsError) {
          console.warn('[Auth] ⚠️ Erro ao carregar custom claims, continuando sem eles:', claimsError);
        }
      }

      console.log('[Auth] Buscando funcionário no Firestore...');
      const result = await buscarFuncionarioPorUid(userCredential.user.uid);
      console.log('[Auth] Resultado busca:', result);

      if (result.success) {
        // Obter dados da empresa
        let companyData: AppUser['company'] = null;
        if (result.funcionario.companyId) {
          try {
            const companyDoc = await getDoc(doc(db, 'companies', result.funcionario.companyId));
            if (companyDoc.exists()) {
              companyData = { id: companyDoc.id, ...companyDoc.data() };
              console.log('[Auth] 🏢 Empresa carregada:', companyData?.name);
            }
          } catch (companyError) {
            console.error('[Auth] ❌ Erro ao carregar empresa:', companyError);
          }
        }

        // QUINTO: Definir estados manualmente
        const appUser: AppUser = {
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          ...result.funcionario,
          company: companyData,
          customClaims: claims || undefined
        };
        
        setUser(appUser);
        setRole(normalizeRole(result.funcionario.funcao));
        setSessionKey(k => k + 1);
        setLoading(false);

        // SEXTO: Iniciar refresh automático de custom claims (a cada 5 minutos)
        if (useCustomClaims) {
          startClaimsRefreshInterval();
        }

        return true;
      } else {
        await signOut(auth);
        isManualLoginRef.current = false;
        
        const errorMsg = result.error || 'Erro desconhecido';
        
        Alert.alert(
          'Acesso negado',
          `Usuário não cadastrado como funcionário.\n\n` +
          `UID: ${userCredential.user.uid}\n` +
          `Email: ${userCredential.user.email}\n\n` +
          `Erro: ${errorMsg}\n\n` +
          `Se o erro for "permission-denied", as regras do Firestore não foram aplicadas corretamente.`
        );
        setLoading(false);
        return false;
      }
    } catch (error: any) {
      console.error('[Auth] ❌ Erro no login:', error);
      isManualLoginRef.current = false;

      let message = 'Ocorreu um erro ao fazer login.';

      // Mapeamento de erros comuns do Firebase para mensagens amigáveis
      const errorMessages: Record<string, string> = {
        'auth/invalid-credential': 'Email ou senha incorretos.',
        'auth/user-not-found': 'Email ou senha incorretos.',
        'auth/wrong-password': 'Email ou senha incorretos.',
        'auth/invalid-email': 'O endereço de email é inválido.',
        'auth/too-many-requests': 'Muitas tentativas incorretas. Tente novamente mais tarde.',
        'auth/user-disabled': 'Esta conta foi desativada.',
        'auth/network-request-failed': 'Verifique sua conexão com a internet.'
      };

      if (error.code && errorMessages[error.code]) {
        message = errorMessages[error.code];
      } else if (error.code) {
        message = `Erro não esperado (${error.code})`;
      } else {
        message = error.message || 'Erro desconhecido.';
      }

      Alert.alert(
        'Falha no Login',
        message
      );

      setLoading(false);
      return false;
    }
  };

  const logout = async () => {
    try {
      // PRIMEIRO: Parar refresh de custom claims
      stopClaimsRefreshInterval();

      // SEGUNDO: Limpar flag de login manual
      isManualLoginRef.current = false;

      // TERCEIRO: Limpar estados IMEDIATAMENTE
      setUser(null);
      setRole(null);
      setCustomClaims(null);
      setLoading(false);
      setSessionKey(Date.now());

      // QUARTO: Limpar Firebase e AsyncStorage
      await signOut(auth);
      await AsyncStorage.clear();
    } catch (error) {
      // Mesmo com erro, garantir limpeza local
      stopClaimsRefreshInterval();
      isManualLoginRef.current = false;
      setUser(null);
      setRole(null);
      setCustomClaims(null);
      setLoading(false);
      setSessionKey(Date.now());
      AsyncStorage.clear().catch(() => { });
    }
  };

  /**
   * Refresh custom claims do usuário atual
   * Chama Cloud Function para atualizar claims e recarrega token
   */
  const refreshCustomClaims = async (): Promise<void> => {
    if (!useCustomClaims || !auth.currentUser) {
      return;
    }

    try {
      const functions = getFunctions();
      const refreshClaimsFunction = httpsCallable(functions, 'refreshUserClaims');
      
      // Chama Cloud Function para atualizar claims
      await refreshClaimsFunction({
        userId: auth.currentUser.uid,
        companyId: user?.companyId,
        role: user?.funcao
      });

      // Força reload do token para obter novos claims
      await auth.currentUser.getIdToken(true);

      // Obtém novos claims
      const idTokenResult = await auth.currentUser.getIdTokenResult();
      const newClaims: CustomClaims = {
        companyId: idTokenResult.claims.companyId as string,
        role: idTokenResult.claims.role as string,
        mfaEnabled: idTokenResult.claims.mfaEnabled as boolean,
        mfaVerified: idTokenResult.claims.mfaVerified as boolean,
        updatedAt: idTokenResult.claims.updatedAt as number
      };

      setCustomClaims(newClaims);
      
      // Atualiza user com novos claims
      if (user) {
        setUser({
          ...user,
          customClaims: newClaims
        });
      }

      console.log('[Auth] ✅ Custom claims atualizados:', newClaims);
    } catch (error) {
      console.error('[Auth] ❌ Erro ao atualizar custom claims:', error);
    }
  };

  /**
   * Retorna custom claims atuais
   */
  const getCustomClaims = (): CustomClaims | null => {
    return customClaims;
  };

  /**
   * Inicia intervalo de refresh automático de custom claims (a cada 5 minutos)
   */
  const startClaimsRefreshInterval = () => {
    // Limpa intervalo anterior se existir
    stopClaimsRefreshInterval();

    // Cria novo intervalo
    claimsRefreshIntervalRef.current = setInterval(() => {
      refreshCustomClaims();
    }, 5 * 60 * 1000); // 5 minutos

    console.log('[Auth] ✅ Refresh automático de custom claims iniciado');
  };

  /**
   * Para intervalo de refresh automático
   */
  const stopClaimsRefreshInterval = () => {
    if (claimsRefreshIntervalRef.current) {
      clearInterval(claimsRefreshIntervalRef.current);
      claimsRefreshIntervalRef.current = null;
      console.log('[Auth] ⏹️ Refresh automático de custom claims parado');
    }
  };

  // Cleanup ao desmontar componente
  useEffect(() => {
    return () => {
      stopClaimsRefreshInterval();
    };
  }, []);

  const register = async (email: string, password: string): Promise<{ success: boolean; user?: FirebaseUser; error?: any }> => {
    try {
      setLoading(true);
      // PRIMEIRO: Garantir logout
      try {
        await signOut(auth);
        await AsyncStorage.clear();
      } catch (e) { // ignore
      }

      // SEGUNDO: Marcar como login manual para evitar auto-logout
      isManualLoginRef.current = true;

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // Opcional: recarregar ou definir user/role se necessário, mas para registro inicial 
      // talvez a gente só queira o objeto user e deixar o componente lidar com DB
      setLoading(false);
      return { success: true, user: userCredential.user };
    } catch (error) {
      console.error('[Auth] ❌ Erro no registro:', error);
      isManualLoginRef.current = false;
      setLoading(false);
      return { success: false, error };
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      role,
      loading,
      login,
      logout,
      register,
      sessionKey,
      hasPermission: (perm: string) => hasPermission(role, perm),
      Permissions,
      refreshCustomClaims,
      getCustomClaims
    }}>
      {children}
    </AuthContext.Provider>
  );
};
