import React, { createContext, useState, useContext, useEffect, useRef, ReactNode } from 'react';
import { Alert, Linking } from 'react-native';
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

  // Debug / diagnostics — shows on-screen when initialization fails
  initError: string | null;
  debugLog: string[];
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

  // --- On-screen diagnostics ---
  const [initError, setInitError] = useState<string | null>(null);
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const appendLog = (msg: string) => {
    const ts = new Date().toTimeString().slice(0, 8);
    setDebugLog(prev => [...prev.slice(-30), `${ts}  ${msg}`]);
  };

  const setPasswordRecoveryMode = (enabled: boolean) => {
    passwordRecoveryModeRef.current = enabled;
    setIsPasswordRecovery(enabled);
  };

  const mapLoginErrorMessage = (error: unknown): string => {
    const raw = error instanceof Error ? error.message : String(error || '');
    const normalized = raw.toLowerCase();

    if (normalized.includes('invalid login credentials')) {
      return 'Email ou senha inválidos';
    }

    if (normalized.includes('email not confirmed')) {
      return 'Email ainda não confirmado. Verifique sua caixa de entrada.';
    }

    if (normalized.includes('too many requests') || normalized.includes('rate limit')) {
      return 'Muitas tentativas de login. Aguarde alguns minutos e tente novamente.';
    }

    return raw || 'Erro desconhecido';
  };

  const extractRecoverySession = (url: string) => {
    const [, hash = ''] = url.split('#');
    const params = new URLSearchParams(hash);

    return {
      accessToken: params.get('access_token'),
      refreshToken: params.get('refresh_token'),
      type: params.get('type'),
    };
  };

  const processRecoveryUrl = async (url?: string | null) => {
    if (!url) {
      return false;
    }

    const { accessToken, refreshToken, type } = extractRecoverySession(url);
    if (type !== 'recovery' || !accessToken || !refreshToken) {
      return false;
    }

    try {
      appendLog('Recovery link detectado');
      setPasswordRecoveryMode(true);
      setLoading(true);

      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (error) {
        throw error;
      }

      setLoading(false);
      return true;
    } catch (error: any) {
      appendLog(`❌ Recovery link invalido: ${error?.message ?? String(error)}`);
      setPasswordRecoveryMode(false);
      setLoading(false);
      Alert.alert('Recuperacao de senha', 'Nao foi possivel validar o link de redefinicao. Solicite um novo email.');
      return false;
    }
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

  useEffect(() => {
    let mounted = true;

    const loadInitialUrl = async () => {
      try {
        const initialUrl = await Linking.getInitialURL();
        if (mounted) {
          await processRecoveryUrl(initialUrl);
        }
      } catch (error) {
        console.warn('[SupabaseAuth] Initial recovery URL failed', error);
      }
    };

    loadInitialUrl();

    const subscription = Linking.addEventListener('url', ({ url }) => {
      processRecoveryUrl(url).catch((error) => {
        console.warn('[SupabaseAuth] Recovery URL event failed', error);
      });
    });

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  // Initialize Auth — uses onAuthStateChange only (Supabase v2 recommended pattern).
  // The INITIAL_SESSION event fires on mount with the current session state (from SecureStore),
  // eliminating the need for a separate getSession() call.
  useEffect(() => {
    let mounted = true;

    appendLog('AuthContext montado');
    appendLog(`SUPABASE_URL: ${process.env.EXPO_PUBLIC_SUPABASE_URL ? '✅' : '❌ AUSENTE'}`);
    appendLog(`SUPABASE_KEY: ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ? '✅' : '❌ AUSENTE'}`);

    // Safety timeout — if onAuthStateChange never fires (network/config issue), unblock UI
    const safetyTimer = setTimeout(() => {
      if (mounted) {
        const msg = 'Timeout (15s): onAuthStateChange nao disparou. Verifique conexao e variaveis de ambiente SUPABASE.';
        appendLog('⏱️ ' + msg);
        setInitError(msg);
        setLoading(false);
      }
    }, 15000);

    let listenerReady = false;
    try {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (!mounted) return;
          if (!listenerReady) {
            clearTimeout(safetyTimer);
            listenerReady = true;
          }

          const logLine = `event=${event} user=${session?.user?.id?.slice(0,8) ?? 'none'}`;
          appendLog(logLine);
          console.log(`[SupabaseAuth] Auth event: ${event}`, session?.user?.id);

          // No session or explicit logout → release loading so Login screen renders
          if (!session?.user || event === 'SIGNED_OUT') {
              setPasswordRecoveryMode(false);
              setUser(null);
              setRole(null);
              setCustomClaims(null);
              setLoading(false);
              return;
          }

            if (event === 'PASSWORD_RECOVERY') {
              appendLog('Modo recuperacao de senha ativado');
              setPasswordRecoveryMode(true);
              setUser(null);
              setRole(null);
              setCustomClaims(null);
              setLoading(false);
              return;
            }

            if (passwordRecoveryModeRef.current) {
              appendLog(`Sessao em recovery (${event})`);
              setLoading(false);
              return;
            }

          // Session available — load profile data
            if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
              appendLog(`Carregando perfil (${event})...`);
              console.log('[SupabaseAuth] Processing', event, '— Manual?', isManualLoginRef.current);
              if (!isManualLoginRef.current) {
                  try {
                  await reloadUserData(session.user, {
                  rotateSessionKey: event !== 'TOKEN_REFRESHED'
                  });
                  } catch (e: any) {
                      const errMsg = `Erro ao carregar perfil: ${e?.message ?? String(e)}`;
                      appendLog('❌ ' + errMsg);
                      setInitError(errMsg);
                      setLoading(false);
                  }
              }
          }
      });

      return () => {
          mounted = false;
          clearTimeout(safetyTimer);
          subscription.unsubscribe();
      };
    } catch (e: any) {
      const errMsg = `Falha ao criar listener Supabase: ${e?.message ?? String(e)}`;
      appendLog('❌ ' + errMsg);
      setInitError(errMsg);
      setLoading(false);
      return () => { mounted = false; clearTimeout(safetyTimer); };
    }
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

          // ✅ Libera o loading AGORA — não espera a persistência para mostrar a tela
          setLoading(false);
          appendLog('✅ Usuário carregado, loading liberado');

          // 4. Persistence Hook — fire-and-forget, não bloqueia a UI
          const persistenceUser: PersistenceUser = {
              uid: sbUser.id,
              email: sbUser.email,
              role: userRole,
              companyId: companyId,
              displayName: profile.full_name
          };

          supabase.auth.getSession().then(({ data: sessionData }) => {
              AuthPersistenceService.persistAuthState(
                  persistenceUser,
                  sessionData.session?.access_token || '',
                  sessionData.session?.refresh_token
              ).catch(e => console.warn('[AuthContext] persistAuthState failed (non-blocking):', e));
          }).catch(e => console.warn('[AuthContext] getSession for persist failed:', e));

      } catch (error: any) {
          const errMsg = `Erro ao carregar dados do usuário: ${error?.message ?? String(error)}`;
          console.error('[SupabaseAuth] Error reloading user data:', error);
          appendLog('❌ ' + errMsg);
          setInitError(errMsg);
          setLoading(false);
      }
  };

  const login = async (email: string, senha: string): Promise<boolean> => {
      try {
          setLoading(true);
          isManualLoginRef.current = true;

        await supabase.auth.signOut();

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
          Alert.alert('Erro no Login', mapLoginErrorMessage(error));
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
      clearPasswordRecovery,
      initError,
      debugLog,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
