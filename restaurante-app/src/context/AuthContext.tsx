import React, { createContext, useState, useContext, useEffect, useRef, ReactNode } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  User as FirebaseUser, 
  MultiFactorResolver,
  getMultiFactorResolver
} from 'firebase/auth';
import { auth, db } from '../config/firebaseConfig';
import { buscarFuncionarioPorUid } from '../services/FuncionariosService';
import { normalizeRole, hasPermission, Permissions } from '../auth/roles';
import { getDoc, doc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { isFeatureEnabled } from '../config/featureFlags';

// Import New Services
import AuthPersistenceService from '../services/AuthPersistenceService';
import BiometricAuthService from '../services/BiometricAuthService';

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

/**
 * Context Interface for Authentication
 * Defines the shape of the AuthContext, including user state, permissions, and auth methods.
 */
interface AuthContextType {
  /** Current authenticated user object */
  user: AppUser | null;
  /** Current user role (e.g., 'admin', 'manager', 'waiter') */
  role: string | null;
  /** Loading state for auth operations */
  loading: boolean;
  /**
   * Method to log in using email and password.
   * @param email User email
   * @param senha User password
   * @returns Promise resolving to true if login successful, false otherwise.
   */
  login: (email: string, senha: string) => Promise<boolean>;
  /**
   * Method to log out the current user and clear session data.
   */
  logout: () => Promise<void>;
  /**
   * Register a new user (usually for creating new companies).
   */
  register: (email: string, password: string) => Promise<{ success: boolean; user?: FirebaseUser; error?: any }>;
  /** Unique session key to force re-renders or cache invalidation */
  sessionKey: number;
  /** Check if user has specific permission based on role */
  hasPermission: (perm: string) => boolean;
  /** Permission constants */
  Permissions: typeof Permissions;
  /** Force refresh of custom claims from Firebase */
  refreshCustomClaims: () => Promise<void>;
  /** Get current custom claims */
  getCustomClaims: () => CustomClaims | null;
  
  // --- MFA & Biometric ---
  /** Resolver for Multi-Factor Authentication challenges */
  mfaResolver: MultiFactorResolver | null;
  /** Set the MFA resolver state */
  setMfaResolver: (resolver: MultiFactorResolver | null) => void;
  /**
   * Attempt to login using stored biometric credentials.
   * @returns Promise resolving to true if successful.
   */
  loginWithBiometric: () => Promise<boolean>;
  /** Flag indicating if biometric hardware is available */
  biometricAvailable: boolean;
  /** Type of biometrics available (e.g., 'Face ID', 'Touch ID') */
  biometricType?: string;
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
  // --- State Definitions ---
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [role, setRole] = useState<string | null>(null);
  const [sessionKey, setSessionKey] = useState<number>(1);
  const [customClaims, setCustomClaims] = useState<CustomClaims | null>(null);
  
  // --- Security State ---
  const [mfaResolver, setMfaResolver] = useState<MultiFactorResolver | null>(null);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<string | undefined>(undefined);

  const isManualLoginRef = useRef<boolean>(false);
  const claimsRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Feature flag para usar custom claims
  const useCustomClaims = isFeatureEnabled('useCustomClaims');

  // Check Biometric Availability on Mount
  useEffect(() => {
    const checkBiometric = async () => {
      const availability = await BiometricAuthService.isAvailable();
      setBiometricAvailable(availability.available);
      setBiometricType(availability.biometricType);
    };
    checkBiometric();
  }, []);

  // Initialize Auth & Restore Session
  useEffect(() => {
    let mounted = true;
    
    // Safety timeout: Ensure loading never sticks for more than 5s
    const loadingTimeout = setTimeout(() => {
        if (mounted && loading) {
            console.warn('[Auth] Initialization timed out. Forcing app load.');
            setLoading(false);
        }
    }, 5000);

    const initAuth = async () => {
      try {
        setLoading(true);
        
        // 1. Try to restore persisted session
        const authState = await AuthPersistenceService.restoreAuthState();
        
        if (authState && authState.sessionToken) {
           console.log('[Auth] Restoring persisted session...');
           
           try {
             // 2. Validate session with Firebase
             if (auth.currentUser) {
                // User is already recognized by Firebase SDK
                await reloadUserData(auth.currentUser);
             } 
           } catch (e) {
             console.error('[Auth] Failed to restore session:', e);
             await AuthPersistenceService.clearAuthState();
           }
        }
      } catch (error) {
        console.error('[Auth] Error initializing:', error);
      } finally {
        // We let onAuthStateChanged handle the final "loading = false"
      }
    };

    initAuth();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (!mounted) return;

      try {
        const { isIgnorandoMudancaAuth } = await import('../services/FuncionariosService');
        if (isIgnorandoMudancaAuth()) return;
      } catch (err) {
        console.warn('Error importing FuncionariosService', err);
      }

      if (!firebaseUser) {
        // User logged out
        if (mounted) {
          setUser(null);
          setRole(null);
          setCustomClaims(null);
          isManualLoginRef.current = false;
          setLoading(false);
        }
        return;
      }

      // User logged in (or session restored by Firebase)
      if (mounted) {
        // Validate with our Persistence Service rules (e.g. 30 days max)
        const isExpired = await AuthPersistenceService.isSessionExpired();
        if (isExpired && !isManualLoginRef.current) {
          console.warn('[Auth] Session expired according to persistence rules.');
          await logout();
          return;
        }

        if (!isManualLoginRef.current) {
             // Automatic reload
             await reloadUserData(firebaseUser);
        }
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(loadingTimeout);
      unsubscribe();
    };
  }, []);

  // Helper to load user data from Firestore/Claims
  const reloadUserData = async (firebaseUser: FirebaseUser) => {
    try {
        // Obter custom claims
        let claims: CustomClaims | null = null;
        if (useCustomClaims) {
          try {
            const idTokenResult = await firebaseUser.getIdTokenResult();
            claims = {
              companyId: idTokenResult.claims.companyId as string,
              role: idTokenResult.claims.role as string,
              mfaEnabled: idTokenResult.claims.mfaEnabled as boolean,
              mfaVerified: idTokenResult.claims.mfaVerified as boolean,
              updatedAt: idTokenResult.claims.updatedAt as number
            };
            setCustomClaims(claims);
          } catch (e) {
            console.warn('[Auth] Error loading claims', e);
          }
        }

        const result = await buscarFuncionarioPorUid(firebaseUser.uid);
        if (result.success) {
           let companyData: AppUser['company'] = null;
           if (result.funcionario.companyId) {
              const companyDoc = await getDoc(doc(db, 'companies', result.funcionario.companyId));
              if (companyDoc.exists()) {
                companyData = { id: companyDoc.id, ...companyDoc.data() };
              }
           }

           const appUser: AppUser = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              ...result.funcionario,
              company: companyData,
              customClaims: claims || undefined
           };
           
           setUser(appUser);
           setRole(normalizeRole(result.funcionario.funcao));
           setSessionKey(Date.now());
           
           if (useCustomClaims) startClaimsRefreshInterval();

           // Persist/Update Auth Validation State
           const token = await firebaseUser.getIdToken();
           await AuthPersistenceService.persistAuthState(firebaseUser, token, firebaseUser.refreshToken);

        } else {
           // Invalid functional user
           console.warn('[Auth] User not found in funcionarios collection');
           await logout();
           Alert.alert('Acesso negado', 'Usuário não cadastrado como funcionário.');
        }
    } catch (error) {
       console.error('[Auth] Error reloading user data:', error);
    }
  };


  const login = async (email: string, senha: string): Promise<boolean> => {
    try {
      setLoading(true);
      isManualLoginRef.current = true; // Mark as manual to avoid "Session restored" races if needed

      // Sign In
      const userCredential = await signInWithEmailAndPassword(auth, email, senha);
      
      // Proceed to load data
      await reloadUserData(userCredential.user);
      
      setLoading(false);
      return true;

    } catch (error: any) {
      console.error('[Auth] Login error:', error);
      isManualLoginRef.current = false;
      setLoading(false);

      // Handle MFA required
      if (error.code === 'auth/multi-factor-auth-required') {
         const resolver = getMultiFactorResolver(auth, error);
         setMfaResolver(resolver);
         // The modal watching `mfaResolver` should open now
         return false; 
      }

      let message = 'Erro desconhecido.';
      const errorMessages: Record<string, string> = {
        'auth/invalid-credential': 'Email ou senha incorretos.',
        'auth/user-not-found': 'Email ou senha incorretos.',
        'auth/wrong-password': 'Email ou senha incorretos.',
        'auth/invalid-email': 'O endereço de email é inválido.',
        'auth/too-many-requests': 'Muitas tentativas. Tente novamente mais tarde.',
        'auth/user-disabled': 'Conta desativada.',
      };
      
      if (error.code && errorMessages[error.code]) {
        message = errorMessages[error.code];
      } else if (error.message) {
        message = error.message;
      }

      Alert.alert('Falha no Login', message);
      return false;
    }
  };

  const loginWithBiometric = async (): Promise<boolean> => {
    try {
        setLoading(true);
        
        // 1. Get last enrolled user
        const lastUserId = await BiometricAuthService.getLastEnrolledUser();
        if (!lastUserId) {
             Alert.alert('Biometria', 'Nenhum usuário com biometria habilitada neste dispositivo.');
             setLoading(false);
             return false;
        }

        // 2. Authenticate with Biometrics
        const result = await BiometricAuthService.authenticate(lastUserId);
        
        if (!result.success) {
             if (result.error && !result.fallbackToPassword) Alert.alert('Erro', result.error);
             setLoading(false);
             return false;
        }
        
        // 3. Retrieve Credentials
        const credentials = await BiometricAuthService.getCredentials(lastUserId);
        if (!credentials) {
             Alert.alert('Erro', 'Credenciais biométricas não encontradas or expiraram. Faça login com senha novamente.');
             setLoading(false);
             return false;
        }

        // 4. Sign In with Firebase
        const userCredential = await signInWithEmailAndPassword(auth, credentials.email, credentials.password);
        await reloadUserData(userCredential.user);
        
        setLoading(false);
        return true;

    } catch (e: any) {
        console.error('[Auth] Biometric login error:', e);
        Alert.alert('Erro', 'Falha na autenticação biométrica: ' + (e.message || 'Erro desconhecido'));
        setLoading(false);
        return false;
    }
  };

  const logout = async () => {
    try {
      stopClaimsRefreshInterval();
      isManualLoginRef.current = false;
      
      const uid = user?.uid;

      setUser(null);
      setRole(null);
      setCustomClaims(null);
      setMfaResolver(null);
      setLoading(false);
      setSessionKey(Date.now());

      // Clear Services
      if (uid) {
         await BiometricAuthService.clearSessionToken(uid);
      }
      await AuthPersistenceService.clearAuthState();
      await AsyncStorage.clear();
      await signOut(auth);

    } catch (error) {
       console.error('[Auth] Logout error', error);
       // Handle gracefully
       setUser(null);
       setLoading(false);
    }
  };

  // Custom Claims Logic
  const refreshCustomClaims = async (): Promise<void> => {
    if (!useCustomClaims || !auth.currentUser) return;

    try {
      const functions = getFunctions();
      const refreshClaimsFunction = httpsCallable(functions, 'refreshUserClaims');
      
      await refreshClaimsFunction({
        userId: auth.currentUser.uid,
        companyId: user?.companyId,
        role: user?.funcao
      });

      await auth.currentUser.getIdToken(true);
      const idTokenResult = await auth.currentUser.getIdTokenResult();
      
      const newClaims: CustomClaims = {
        companyId: idTokenResult.claims.companyId as string,
        role: idTokenResult.claims.role as string,
        mfaEnabled: idTokenResult.claims.mfaEnabled as boolean,
        mfaVerified: idTokenResult.claims.mfaVerified as boolean,
        updatedAt: idTokenResult.claims.updatedAt as number
      };

      setCustomClaims(newClaims);
      if (user) {
        setUser({ ...user, customClaims: newClaims });
      }
    } catch (error) {
      console.error('[Auth] ❌ Erro ao atualizar custom claims:', error);
    }
  };

  const startClaimsRefreshInterval = () => {
    stopClaimsRefreshInterval();
    claimsRefreshIntervalRef.current = setInterval(() => {
      refreshCustomClaims();
    }, 5 * 60 * 1000);
  };

  const stopClaimsRefreshInterval = () => {
    if (claimsRefreshIntervalRef.current) {
      clearInterval(claimsRefreshIntervalRef.current);
      claimsRefreshIntervalRef.current = null;
    }
  };

  useEffect(() => {
    return () => stopClaimsRefreshInterval();
  }, []);

  const getCustomClaims = (): CustomClaims | null => customClaims;

  // Delegate register
  const register = async (email: string, password: string) => {
      try {
          setLoading(true);
          // Standard firebase create
          const cred = await createUserWithEmailAndPassword(auth, email, password);
          return { success: true, user: cred.user };
      } catch (e) {
          return { success: false, error: e };
      } finally {
          setLoading(false);
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
      getCustomClaims,
      // New Exports
      mfaResolver,
      setMfaResolver,
      loginWithBiometric,
      biometricAvailable,
      biometricType
    }}>
      {children}
    </AuthContext.Provider>
  );
};

