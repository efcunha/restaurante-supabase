import React, { createContext, useState, useContext, useEffect, useRef, ReactNode } from 'react';
import { Alert, InteractionManager } from 'react-native';
import { supabase } from '../config/SupabaseConfig';
import { User } from '@supabase/supabase-js';

// Services
import AuthPersistenceService, { PersistenceUser } from '../services/AuthPersistenceService';
import BiometricAuthService from '../services/BiometricAuthService';
import { Permissions, hasPermission, normalizeRole } from '../auth/roles';

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
  nome?: string; // Legacy field
  funcao?: string;
  companyId?: string;
  company?: {
    id: string;
    [key: string]: any;
  } | null;
  customClaims?: CustomClaims;
  [key: string]: any;
}

interface AuthContextType {
  user: AppUser | null;
  role: string | null;
  loading: boolean;
  login: (email: string, senha: string) => Promise<boolean>;
  logout: () => Promise<void>;
  register: (email: string, password: string) => Promise<{ success: boolean; user?: User; error?: any }>;
  sessionKey: number;
  hasPermission: (perm: string) => boolean;
  Permissions: typeof Permissions;
  refreshCustomClaims: () => Promise<void>;
  getCustomClaims: () => CustomClaims | null;
  
  // MFA & Biometric Placeholders (for interface compatibility)
  mfaResolver: any | null; 
  setMfaResolver: (resolver: any | null) => void;
  loginWithBiometric: () => Promise<{ success: boolean; error?: string }>;
  biometricAvailable: boolean;
  biometricType?: string;
  isPasswordRecovery: boolean;
  clearPasswordRecovery: () => Promise<void>;
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
  
  // Security State
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<string | undefined>(undefined);
  // Implementation note: MFA Resolver is less standard in Supabase than Firebase, keeping null for now
  const [mfaResolver, setMfaResolver] = useState<any | null>(null);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  const isManualLoginRef = useRef<boolean>(false);
  const passwordRecoveryModeRef = useRef<boolean>(false);

  const setPasswordRecoveryMode = (enabled: boolean) => {
    passwordRecoveryModeRef.current = enabled;
    setIsPasswordRecovery(enabled);
  };

  const clearRecoveryHashInBrowser = () => {
    if (typeof window === 'undefined' || !window.location.hash) {
      return;
    }

    const cleanUrl = `${window.location.pathname}${window.location.search}`;
    window.history.replaceState({}, document.title, cleanUrl);
  };

  const hasRecoveryHashInBrowser = () => {
    return typeof window !== 'undefined' && window.location.hash.includes('type=recovery');
  };

  // Check Biometrics on Mount
  useEffect(() => {
    const checkBiometric = async () => {
      const availability = await BiometricAuthService.isAvailable();
      setBiometricAvailable(availability.available);
      setBiometricType(availability.biometricType);
    };
    checkBiometric();
  }, []);

  // Initialize Auth
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
       try {
         // Check active session first
         const { data: { session } } = await supabase.auth.getSession();
         
         if (session?.user) {
             if (hasRecoveryHashInBrowser()) {
             clearRecoveryHashInBrowser();
                 setPasswordRecoveryMode(true);
                 setLoading(false);
                 return;
             }
             console.log('[SupabaseAuth] Session restored', session.user.id);
           await reloadUserData(session.user, { rotateSessionKey: true });
         } else {
             setLoading(false);
         }
       } catch (e) {
         console.error('[SupabaseAuth] Init error', e);
         setLoading(false);
       }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!mounted) return;
        
        console.log(`[SupabaseAuth] Auth event: ${event}`, session?.user?.id);

        if (event === 'SIGNED_OUT' || !session?.user) {
          setPasswordRecoveryMode(false);
            setUser(null);
            setRole(null);
            setCustomClaims(null);
            setLoading(false);
            return;
        }

        if (event === 'PASSWORD_RECOVERY') {
          clearRecoveryHashInBrowser();
          setPasswordRecoveryMode(true);
          setUser(null);
          setRole(null);
          setCustomClaims(null);
          setLoading(false);
          return;
        }

        if (passwordRecoveryModeRef.current) {
          setLoading(false);
          return;
        }

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
             // Avoid double reload if we did it manually in login()
             console.log('[SupabaseAuth] Processing SIGNED_IN. Manual?', isManualLoginRef.current);
             if (!isManualLoginRef.current) {
                 // Defer background refresh to avoid jank/timeout during interactions (e.g. scrolling)
               InteractionManager.runAfterInteractions(async () => {
                     await reloadUserData(session.user, {
                       rotateSessionKey: event !== 'TOKEN_REFRESHED'
                     });
                     setLoading(false);
                 });
                 // Ideally cancel if unmounted, but interaction handle cancellation is tricky in effect return.
                 // Since reloadUserData handles errors gracefully, it's safer to let it run.
             }
        }
    });

    return () => {
        mounted = false;
        subscription.unsubscribe();
    };
  }, []);

  const reloadUserData = async (
    sbUser: User,
    options?: { rotateSessionKey?: boolean }
  ) => {
      const rotateSessionKey = options?.rotateSessionKey ?? true;
      console.log('[AuthContext] reloadUserData called for:', sbUser.id);
      try {
          // 1. Fetch Profile (Simple, no joins first to avoid lock)
          // 1. Fetch Profile (Simple, no joins first to avoid lock)
          console.log('[AuthContext] Fetching profile table only...');
          
          // TIMEOUT WRAPPER - Increased to 10 seconds to handle slow RLS policies
          const fetchPromise = supabase
            .from('profiles')
            .select('*') // No join
            .eq('id', sbUser.id)
            .single();
            
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('TIMEOUT_FETCH_PROFILE')), 15000)
          );
          
          const { data: profile, error: profileError } = await Promise.race([fetchPromise, timeoutPromise]) as any;

          console.log('[AuthContext] Profile result:', { profile, error: profileError });

          if (profileError || !profile) {
              console.warn('[SupabaseAuth] No profile found for user', sbUser.id);
              setLoading(false);
              return;
          }

          // 2. Fetch Company (Separate call)
          let companyData = null;
          if (profile.company_id) {
               console.log('[AuthContext] Fetching company data...', profile.company_id);
               const { data: comp, error: compError } = await supabase
                 .from('companies')
                 .select('*')
                 .eq('id', profile.company_id)
                 .single();
               
               if (compError) console.warn('[AuthContext] Company fetch error', compError);
               companyData = comp;
               console.log('[AuthContext] Company data:', companyData);
          }

          // 2. Map Key Data
          const companyId = profile.company_id;
          const userRole = profile.role || 'waiter';
          // 3. Construct AppUser
          // Map profiles columns to AppUser legacy fields
          const appUser: AppUser = {
              uid: sbUser.id,
              email: sbUser.email,
              name: profile.full_name,
              nome: profile.full_name, // legacy
              funcao: normalizeRole(userRole),
              companyId: companyId,
              company: companyData,
              customClaims: {
                  companyId,
                  role: userRole,
                  updatedAt: Date.now()
              }
          };

          const newClaims: CustomClaims = {
            companyId,
            role: userRole,
            updatedAt: Date.now()
          };

          console.log('[AuthContext] Setting user:', {
              uid: appUser.uid, 
              funcao: appUser.funcao, 
              roleOriginal: userRole, 
              companyId
          });

          setUser(appUser);
          setRole(normalizeRole(userRole));
          setCustomClaims(newClaims);
          if (rotateSessionKey) {
            setSessionKey(Date.now());
          }

          // 4. Persistence Hook (Generic)
          // We map Supabase User + props to PersistenceUser interface
          const persistenceUser: PersistenceUser = {
              uid: sbUser.id,
              email: sbUser.email,
              role: userRole,
              companyId: companyId,
              displayName: profile.full_name
          };
          
          await AuthPersistenceService.persistAuthState(
              persistenceUser, 
              (await supabase.auth.getSession()).data.session?.access_token || '', 
              (await supabase.auth.getSession()).data.session?.refresh_token
          );

      } catch (error) {
          console.error('[SupabaseAuth] Error reloading user data:', error);
          // Don't fail silently - set loading to false so UI can respond
          setLoading(false);
      }
  };

  const login = async (email: string, senha: string): Promise<boolean> => {
      try {
          setLoading(true);
          isManualLoginRef.current = true;

          const { data, error } = await supabase.auth.signInWithPassword({
              email,
              password: senha
          });

          if (error) throw error;
          
          if (data.session?.user) {
              // Store credentials for Biometric Login Replay
              try {
                  const hasBiometrics = await BiometricAuthService.hasEnrolledBiometrics();
                  if (hasBiometrics) {
                    await BiometricAuthService.storeCredentials(data.session.user.id, email, senha);
                     // Also link device if needed? Logic was in enrollUser but simplest is just storing creds here.
                  }
              } catch (bioError) {
                  console.warn('[SupabaseAuth] Failed to update biometric creds', bioError);
              }

              await reloadUserData(data.session.user, { rotateSessionKey: true });
              
              setLoading(false);
              isManualLoginRef.current = false;
              return true;
          }
          return false;

      } catch (error: any) {
          console.error('[SupabaseAuth] Login error:', error);
          setLoading(false);
          isManualLoginRef.current = false;
            setPasswordRecoveryMode(false);
          Alert.alert('Login Failed', error.message || 'Erro desconhecido');
          return false;
      }
  };

  const logout = async () => {
      try {
          await supabase.auth.signOut();
          await AuthPersistenceService.clearAuthState();
          setPasswordRecoveryMode(false);
          setUser(null);
          setRole(null);
          setCustomClaims(null);
      } catch (error) {
          console.error('[SupabaseAuth] Logout error', error);
      }
  };

  const register = async (email: string, password: string) => {
      // Supabase basic register
      const { data, error } = await supabase.auth.signUp({
          email,
          password
      });
      return { success: !error, user: data.user || undefined, error };
  };

  const refreshCustomClaims = async () => {
      if (user?.uid) {
         // Re-fetch profile logic
         // For Supabase, usually just re-fetching the profile row is enough
         // or refreshing the session if using JWT claims
         const { data: { session } } = await supabase.auth.refreshSession();
         if (session?.user) await reloadUserData(session.user, { rotateSessionKey: false });
      }
  };

  const loginWithBiometric = async () => {
      try {
          isManualLoginRef.current = true;
          setLoading(true);

          const lastUserId = await BiometricAuthService.getLastEnrolledUser();
          if (!lastUserId) {
              setLoading(false);
              return { success: false, error: 'Biometria não configurada para nenhum usuário.' };
          }

          const authResult = await BiometricAuthService.authenticate(lastUserId);
          if (!authResult.success) {
               setLoading(false);
               return { success: false, error: authResult.error };
          }

          const creds = await BiometricAuthService.getCredentials(lastUserId);
          if (!creds) {
               setLoading(false);
               return { success: false, error: 'Credenciais expiradas.' };
          }

          const { data, error } = await supabase.auth.signInWithPassword({
              email: creds.email,
              password: creds.password
          });

          if (error) throw error;
          if (data.session?.user) {
              await reloadUserData(data.session.user, { rotateSessionKey: true });
              setLoading(false);
              return { success: true };
          }
          
          return { success: false, error: 'Erro desconhecido' };

      } catch (error: any) {
          setLoading(false);
          console.error('[SupabaseAuth] Bio login error', error);
          return { success: false, error: error.message };
      }
  };

      const clearPasswordRecovery = async () => {
        await logout();
        setPasswordRecoveryMode(false);
      };

  const getCustomClaims = () => customClaims;

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
      mfaResolver,
      setMfaResolver,
      loginWithBiometric,
      biometricAvailable,
      biometricType,
      isPasswordRecovery,
      clearPasswordRecovery
    }}>
      {children}
    </AuthContext.Provider>
  );
};
