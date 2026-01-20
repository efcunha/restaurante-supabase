import React, { createContext, useState, useContext, useCallback, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebaseConfig';
import { buscarFuncionarioPorUid } from '../services/funcionarios';
import { normalizeRole, hasPermission, Permissions } from '../auth/roles';

// Constantes simples
const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  // Ref para controlar se o componente ainda está montado
  const isMountedRef = useRef(true);
  
  // Ref para armazenar o unsubscribe do listener
  const unsubscribeRef = useRef(null);

  // Função para limpar listeners de forma segura
  const cleanupListeners = useCallback(() => {
    console.log('🧹 Iniciando limpeza de listeners de autenticação...');
    
    try {
      if (unsubscribeRef.current) {
        console.log('📞 Removendo listener de autenticação...');
        unsubscribeRef.current();
        unsubscribeRef.current = null;
        console.log('✅ Listener de autenticação removido com sucesso');
      } else {
        console.log('ℹ️ Nenhum listener ativo para remover');
      }
    } catch (error) {
      console.error('❌ Erro ao remover listener de autenticação:', error);
      // Não propagar o erro - apenas logar para debugging
      // Garantir que a referência seja limpa mesmo com erro
      unsubscribeRef.current = null;
    }
  }, []);

  // Função para limpar listeners durante logout (se necessário)
  const cleanupListenersOnLogout = useCallback(() => {
    // Durante logout normal, não removemos os listeners
    // Eles devem permanecer ativos para detectar mudanças de estado
    console.log('ℹ️ Logout: mantendo listeners ativos para detectar mudanças de estado');
  }, []);

  // Função para limpar estados de forma segura
  const clearAuthStates = useCallback(() => {
    if (isMountedRef.current) {
      setUser(null);
      setRole(null);
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, senha) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, senha);
      // Buscar dados do funcionário
      const result = await buscarFuncionarioPorUid(userCredential.user.uid);
      if (result.success) {
        const r = normalizeRole(result.funcionario.funcao);
        setUser(result.funcionario);
        setRole(r);
        return true;
      } else {
        await signOut(auth);
        Alert.alert('Acesso negado', 'Usuário não cadastrado como funcionário. Contate o administrador.');
        return false;
      }
    } catch (error) {
      
      let errorMessage = 'Erro ao fazer login';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMessage = 'Email ou senha incorretos';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Email inválido';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Muitas tentativas. Tente novamente mais tarde';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Erro de rede - verifique sua conexão';
      }
      
      Alert.alert('Erro no login', errorMessage);
      return false;
    }
  }, []);

  // Escutar mudanças de autenticação
  useEffect(() => {
    isMountedRef.current = true;
    
    console.log('🔧 Configurando listener de autenticação...');
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser && isMountedRef.current) {
          console.log('👤 Usuário autenticado detectado, buscando dados...');
          // Buscar dados do funcionário no Firestore
          const result = await buscarFuncionarioPorUid(firebaseUser.uid);
          
          if (result.success && isMountedRef.current) {
            const r = normalizeRole(result.funcionario.funcao);
            setUser(result.funcionario);
            setRole(r);
            console.log('✅ Dados do usuário carregados com sucesso');
          } else if (isMountedRef.current) {
            console.log('❌ Usuário não encontrado no sistema, limpando estados');
            clearAuthStates();
          }
        } else if (isMountedRef.current) {
          console.log('🚪 Usuário não autenticado, limpando estados');
          clearAuthStates();
        }
      } catch (error) {
        console.error('❌ Erro no listener de autenticação:', error);
        if (isMountedRef.current) {
          clearAuthStates();
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    });

    unsubscribeRef.current = unsubscribe;
    console.log('✅ Listener de autenticação configurado');

    return () => {
      console.log('🧹 Desmontando AuthProvider, limpando recursos...');
      isMountedRef.current = false;
      
      // Usar a função de limpeza segura
      cleanupListeners();
    };
  }, [clearAuthStates, cleanupListeners]);

  const logout = useCallback(async () => {
    if (isLoggingOut) {
      console.log('Logout já em andamento, ignorando nova tentativa');
      return;
    }

    console.log('🚪 Iniciando logout...');
    setIsLoggingOut(true);

    try {
      // Limpar estados locais primeiro
      clearAuthStates();

      // Fazer signOut do Firebase
      await signOut(auth);
      console.log('✅ Logout concluído com sucesso');

    } catch (error) {
      console.error('❌ Erro durante logout:', error);
      // Garantir que os estados sejam limpos mesmo com erro
      clearAuthStates();
    } finally {
      if (isMountedRef.current) {
        setIsLoggingOut(false);
      }
    }
  }, [isLoggingOut, clearAuthStates]);

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        loading,
        isLoggingOut,
        login,
        logout,
        hasPermission: (perm) => hasPermission(role, perm),
        Permissions,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
