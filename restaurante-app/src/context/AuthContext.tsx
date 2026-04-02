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
  const reloadInFlightForUserRef = useRef<string | null>(null);
  const lastReloadUserRef = useRef<string | null>(null);
  const lastReloadAtRef = useRef<number>(0);

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

  const scheduleReloadUserData = async (
    sbUser: User,
    options?: { rotateSessionKey?: boolean }
  ) => {
    const rotateSessionKey = options?.rotateSessionKey ?? true;
    const now = Date.now();

    const sameUserBurst =
      lastReloadUserRef.current === sbUser.id &&
      now - lastReloadAtRef.current < 1500;

    if (reloadInFlightForUserRef.current === sbUser.id || sameUserBurst) {
      appendLog(`↩️ Reload deduplicado para user=${sbUser.id.slice(0, 8)}`);
      return;
    }

    reloadInFlightForUserRef.current = sbUser.id;
    lastReloadUserRef.current = sbUser.id;
    lastReloadAtRef.current = now;

    try {
      await reloadUserData(sbUser, { rotateSessionKey });
    } finally {
      if (reloadInFlightForUserRef.current === sbUser.id) {
        reloadInFlightForUserRef.current = null;
      }
    }
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
                  await scheduleReloadUserData(session.user, {
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
          const fetchProfileStartTime = Date.now();
          console.log('[AuthContext] Fetching profile table only...');
          appendLog(`⏳ Buscando perfil...`);
          
const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', sbUser.id)
            .single();
          const profileDuration = Date.now() - fetchProfileStartTime;

          console.log('[AuthContext] Profile result:', { 
            hasProfile: Boolean(profile), 
            hasError: Boolean(profileError),
            duration: profileDuration
          });
          appendLog(`✓ Perfil: ${profileDuration}ms (erro: ${profileError?.message ?? 'nenhum'})`);

          if (profileError || !profile) {
              const errMsg = profileError?.message || 'Perfil não encontrado';
              console.warn('[SupabaseAuth] Profile fetch failed', { 
                error: errMsg,
                duration: profileDuration
              });
              appendLog(`❌ Erro ao buscar perfil: ${errMsg}`);
              setLoading(false);
              return;
          }

          // 2. Fetch Company (Separate call)
          let companyData = null;
          if (profile.company_id) {
               const fetchCompanyStartTime = Date.now();
               console.log('[AuthContext] Fetching company data...', profile.company_id);
               appendLog(`⏳ Buscando empresa...`);
               const { data: comp, error: compError } = await supabase
                 .from('companies')
                 .select('*')
                 .eq('id', profile.company_id)
                 .single();
               
               const companyDuration = Date.now() - fetchCompanyStartTime;
               if (compError) {
                 console.warn('[AuthContext] Company fetch error', { 
                   error: compError.message,
                   duration: companyDuration
                 });
                 appendLog(`❌ Erro empresa: ${compError.message}`);
               }
               companyData = comp;
               console.log('[AuthContext] Company data:', { hasData: Boolean(companyData), duration: companyDuration });
               appendLog(`✓ Empresa: ${companyDuration}ms`);
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
      const loginStartTime = Date.now();
      try {
          setLoading(true);
          isManualLoginRef.current = true;
          appendLog('🔐 Login iniciado...');

          const signInStartTime = Date.now();
          const { data, error } = await supabase.auth.signInWithPassword({
              email,
              password: senha
          });
          const signInDuration = Date.now() - signInStartTime;
          appendLog(`✓ signInWithPassword: ${signInDuration}ms`);

          if (error) throw error;
          
          if (data.session?.user) {
              // SEC-W1-003: No password storage for biometric replay
              // Biometric auth uses server-side session refresh, not password replay
              
              const reloadStartTime = Date.now();
              await reloadUserData(data.session.user, { rotateSessionKey: true });
              const reloadDuration = Date.now() - reloadStartTime;
              appendLog(`✓ reloadUserData: ${reloadDuration}ms`);
              
              const totalDuration = Date.now() - loginStartTime;
              appendLog(`✅ Login concluído em ${totalDuration}ms`);
              
              setLoading(false);
              isManualLoginRef.current = false;
              return true;
          }
          return false;

      } catch (error: any) {
          const totalDuration = Date.now() - loginStartTime;
          appendLog(`❌ Login falhou em ${totalDuration}ms: ${error?.message ?? String(error)}`);
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
          // For users with biometrics enrolled, do NOT call signOut.
          // signOut clears the Supabase SDK's own SecureStore session keys,
          // making biometric login impossible (no session to restore).
          // Mobile biometric pattern: "logout" = clear UI state only; the session
          // stays persisted so biometric re-login can restore it.
          const enrolledUser = await BiometricAuthService.getLastEnrolledUser();
          const hasBiometrics = !!enrolledUser && enrolledUser === user?.uid;

          if (!hasBiometrics) {
              // Full sign-out: invalidates server session and clears local state.
              await supabase.auth.signOut();
              await AuthPersistenceService.clearAuthState();
          } else {
              console.log('[SupabaseAuth] Biometrics enrolled — UI-only logout, session preserved for biometric re-login');
          }

          // Clear UI state regardless
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

          // Step 1: Verify biometric locally (proves device possession)
          const authResult = await BiometricAuthService.authenticate(lastUserId);
          if (!authResult.success) {
              setLoading(false);
              return { success: false, error: authResult.error };
          }

          // Step 2: Restore Supabase session.
          // Primary: use the session already persisted by the Supabase SDK in SecureStore.
          // This works because logout() for biometric users does NOT call signOut(),
          // leaving the SDK's own persisted session intact.
          let sessionUser = null;

          const { data: existingSessionData, error: existingSessionError } = await supabase.auth.getSession();
          if (!existingSessionError && existingSessionData?.session?.user) {
              // Validate that the persisted session belongs to the enrolled user
              if (existingSessionData.session.user.id === lastUserId) {
                  sessionUser = existingSessionData.session.user;
                  console.log('[SupabaseAuth] Biometric login: restored persisted session');
              } else {
                  console.warn('[SupabaseAuth] Persisted session user mismatch — enrolled:', lastUserId, 'session:', existingSessionData.session.user.id);
              }
          }

          // Fallback: try refreshing with stored refresh token
          if (!sessionUser) {
              console.warn('[SupabaseAuth] No persisted session — trying stored refresh token...');
              const storedRefreshToken = await BiometricAuthService.getRefreshToken(lastUserId);

              if (storedRefreshToken) {
                  const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession({
                      refresh_token: storedRefreshToken,
                  });
                  if (!refreshError && refreshData?.session?.user) {
                      sessionUser = refreshData.session.user;
                      // Update stored token after successful rotation
                      if (refreshData.session.refresh_token) {
                          await BiometricAuthService.storeRefreshToken(lastUserId, refreshData.session.refresh_token);
                      }
                      console.log('[SupabaseAuth] Biometric login: session restored via stored refresh token');
                  } else {
                      console.warn('[SupabaseAuth] Stored refresh token failed:', refreshError?.message);
                  }
              }
          }

          if (!sessionUser) {
              setLoading(false);
              return {
                  success: false,
                  error: 'Sessão biométrica indisponível. Faça login com email e senha para reativar.',
              };
          }

          // Step 3: Reload user profile data
          await reloadUserData(sessionUser, { rotateSessionKey: true });
          setLoading(false);
          return { success: true };

      } catch (error: any) {
          setLoading(false);
          console.error('[SupabaseAuth] Bio login error', error);
          return { success: false, error: error.message || 'Falha ao autenticar com biometria' };
      } finally {
          isManualLoginRef.current = false;
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
