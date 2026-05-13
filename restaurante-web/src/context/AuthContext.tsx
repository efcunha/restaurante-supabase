import React, { createContext, useState, useContext, useEffect, useRef, ReactNode } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../config/SupabaseConfig';
import { User } from '@supabase/supabase-js';

// Services
import AuthPersistenceService, { PersistenceUser } from '../services/AuthPersistenceService';
import BiometricAuthService from '../services/BiometricAuthService';
import MFAService, { MFAVerificationResolver } from '../services/MFAService';
import { featureFlags } from '../config/featureFlags';
import { Permissions, hasPermission, normalizeRole } from '../auth/roles';
import logger from '../utils/logger';

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
  mfaResolver: MFAVerificationResolver | null;
  setMfaResolver: (resolver: MFAVerificationResolver | null) => void;
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
  const [mfaResolver, setMfaResolver] = useState<MFAVerificationResolver | null>(null);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  const isManualLoginRef = useRef<boolean>(false);
  const passwordRecoveryModeRef = useRef<boolean>(false);
  const reloadInFlightForUserRef = useRef<string | null>(null);
  const lastReloadUserRef = useRef<string | null>(null);
  const lastReloadAtRef = useRef<number>(0);

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

    if (normalized.includes('mfa obrigatorio') || normalized.includes('mfa')) {
      return raw;
    }

    return raw || 'Erro desconhecido';
  };

  const resolveUserRole = async (userId: string): Promise<string | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (error) {
      throw new Error(`Nao foi possivel carregar perfil para validacao de MFA: ${error.message}`);
    }

    return normalizeRole(data?.role || null);
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

  const shouldLogAuthEvent = (event: string, hasSessionUser: boolean): boolean => {
    // INITIAL_SESSION/SIGNED_OUT without session are expected during bootstrap.
    if (!hasSessionUser && (event === 'INITIAL_SESSION' || event === 'SIGNED_OUT')) {
      return false;
    }
    return true;
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

    const scheduleReloadUserData = async (
      sbUser: User,
      options?: { rotateSessionKey?: boolean }
    ) => {
      const rotateSessionKey = options?.rotateSessionKey ?? true;

      // Avoid duplicate reloads fired in quick succession for the same user
      const now = Date.now();
      const sameUserBurst =
        lastReloadUserRef.current === sbUser.id &&
        now - lastReloadAtRef.current < 1500;

      if (reloadInFlightForUserRef.current === sbUser.id || sameUserBurst) {
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

    // initAuth: only responsible for releasing the loading gate.
    // Profile loading is handled by onAuthStateChange(INITIAL_SESSION) in background.
    // This prevents a deadlock where loading=true blocks rendering while the profile
    // fetch hangs (token refresh, slow network, cold Supabase connection, etc.).
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;

        if (session?.user && hasRecoveryHashInBrowser()) {
          clearRecoveryHashInBrowser();
          setPasswordRecoveryMode(true);
        }
        // Release the loading spinner regardless of whether the profile has loaded.
        // onAuthStateChange fires INITIAL_SESSION and loads the profile in background.
        // When reloadUserData finishes, setUser() is called and the app opens.
      } catch (e) {
        logger.error('[SupabaseAuth] Init error', e, { phase: 'initAuth' });
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!mounted) return;

        if (shouldLogAuthEvent(event, Boolean(session?.user))) {
          logger.debug('[SupabaseAuth] Auth event', {
            event,
            hasSessionUser: Boolean(session?.user)
          });
        }

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

        if (
          event === 'SIGNED_IN' ||
          event === 'TOKEN_REFRESHED' ||
          event === 'INITIAL_SESSION' ||
          event === 'MFA_CHALLENGE_VERIFIED'
        ) {
          logger.debug('[SupabaseAuth] Processing auth event', {
            isManualLogin: isManualLoginRef.current,
            event
          });
          // Manual login is handled entirely by login() — skip here to avoid double reload.
          if (!isManualLoginRef.current) {
            // Fire profile reload in background — do NOT await before releasing loading.
            // loading is already controlled by initAuth (released after getSession).
            scheduleReloadUserData(session.user, {
              rotateSessionKey: event !== 'TOKEN_REFRESHED',
            }).catch(e => logger.error('[SupabaseAuth] Background reload failed', e, { event }));
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
      const reloadStartTime = Date.now();
      logger.debug('[AuthContext] reloadUserData called', { hasUserId: Boolean(sbUser.id) });
      try {
          // 1. Fetch Profile (Simple, no joins first to avoid lock)
          const fetchProfileStartTime = Date.now();
          logger.debug('[AuthContext] Fetching profile table only');
          
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', sbUser.id)
            .single();
          const profileDuration = Date.now() - fetchProfileStartTime;
          
          logger.debug('[AuthContext] Profile fetch finished', {
            hasProfile: Boolean(profile),
            hasProfileError: Boolean(profileError),
            duration: profileDuration
          });

          if (profileError || !profile) {
              const errMsg = profileError?.message || 'No profile found';
              logger.warn('[SupabaseAuth] Profile fetch failed', { 
                error: errMsg,
                duration: profileDuration
              });
              setLoading(false);
              return;
          }

          // 2. Fetch Company (Separate call)
          let companyData = null;
          if (profile.company_id) {
            const fetchCompanyStartTime = Date.now();
            logger.debug('[AuthContext] Fetching company data', { hasCompanyId: true });
               const { data: comp, error: compError } = await supabase
                 .from('companies')
                 .select('*')
                 .eq('id', profile.company_id)
                 .single();
               
            const companyDuration = Date.now() - fetchCompanyStartTime;
            if (compError) logger.warn('[AuthContext] Company fetch error', { 
              hasCompanyError: true,
              duration: companyDuration,
              error: compError.message
            });
               companyData = comp;
            logger.debug('[AuthContext] Company fetch finished', { 
              hasCompanyData: Boolean(companyData),
              duration: companyDuration
            });
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

            logger.debug('[AuthContext] Setting authenticated user state', {
              role: appUser.funcao,
              hasCompanyId: Boolean(companyId)
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
          logger.error('[SupabaseAuth] Error reloading user data', error, { phase: 'reloadUserData' });
          // Don't fail silently - set loading to false so UI can respond
          setLoading(false);
      }
  };

  const login = async (email: string, senha: string): Promise<boolean> => {
      const loginStartTime = Date.now();
      try {
          setLoading(true);
          isManualLoginRef.current = true;
          setMfaResolver(null);
          logger.debug('[SupabaseAuth] Login started', { email: email.slice(0, 5) + '...' });

          // Session fixation hardening: clear stale session before credential login.
          const { data: existingSessionData } = await supabase.auth.getSession();
          if (existingSessionData?.session) {
            await supabase.auth.signOut();
          }

          const signInStartTime = Date.now();
          const { data, error } = await supabase.auth.signInWithPassword({
              email,
              password: senha
          });
          const signInDuration = Date.now() - signInStartTime;
          logger.debug('[SupabaseAuth] signInWithPassword completed', { duration: signInDuration });

          if (error) throw error;
          
          if (data.session?.user) {
              const normalizedRole = await resolveUserRole(data.session.user.id);
              const requiresMfa =
                featureFlags.requireMFA &&
                normalizedRole !== null &&
                MFAService.isRequiredForRole(normalizedRole);

              if (requiresMfa) {
                const { data: assuranceData, error: assuranceError } =
                  await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

                if (assuranceError) {
                  throw new Error(`Falha ao validar nivel de autenticacao MFA: ${assuranceError.message}`);
                }

                const needsAal2 =
                  assuranceData?.nextLevel === 'aal2' && assuranceData?.currentLevel !== 'aal2';

                if (needsAal2) {
                  const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
                  if (factorsError) {
                    throw new Error(`Falha ao listar fatores MFA: ${factorsError.message}`);
                  }

                  const primaryTotpFactor = factorsData?.totp?.[0];
                  if (!primaryTotpFactor) {
                    await supabase.auth.signOut();
                    throw new Error('MFA obrigatorio para sua role, mas nenhum fator TOTP foi cadastrado. Configure o MFA no painel administrativo.');
                  }

                  const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
                    factorId: primaryTotpFactor.id,
                  });

                  if (challengeError || !challengeData?.id) {
                    throw new Error(challengeError?.message || 'Falha ao iniciar desafio MFA.');
                  }

                  setMfaResolver({
                    factorId: primaryTotpFactor.id,
                    challengeId: challengeData.id,
                  });
                  setLoading(false);
                  return false;
                }
              }

              // Store credentials for Biometric Login Replay
              try {
                  const bioStartTime = Date.now();
                  const hasBiometrics = await BiometricAuthService.hasEnrolledBiometrics();
                  if (hasBiometrics) {
                    await BiometricAuthService.storeCredentials(data.session.user.id, email, senha);
                     // Also link device if needed? Logic was in enrollUser but simplest is just storing creds here.
                  }
                  const bioDuration = Date.now() - bioStartTime;
                  logger.debug('[SupabaseAuth] Biometric store completed', { duration: bioDuration });
              } catch (bioError) {
                  logger.warn('[SupabaseAuth] Failed to update biometric creds', { hasBiometricError: true });
              }

              const reloadStartTime = Date.now();
              await reloadUserData(data.session.user, { rotateSessionKey: true });
              const reloadDuration = Date.now() - reloadStartTime;
              logger.debug('[SupabaseAuth] reloadUserData completed', { duration: reloadDuration });
              
              const totalDuration = Date.now() - loginStartTime;
              logger.debug('[SupabaseAuth] Login completed', { totalDuration, signInDuration, reloadDuration });
              
              setLoading(false);
              isManualLoginRef.current = false;
              return true;
          }
          return false;

      } catch (error: any) {
          const totalDuration = Date.now() - loginStartTime;
          logger.error('[SupabaseAuth] Login error', error, { phase: 'login', totalDuration });
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
          logger.error('[SupabaseAuth] Logout error', error, { phase: 'logout' });
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

          const { data: existingSessionData } = await supabase.auth.getSession();
          if (existingSessionData?.session) {
            await supabase.auth.signOut();
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
          logger.error('[SupabaseAuth] Bio login error', error, { phase: 'biometricLogin' });
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
