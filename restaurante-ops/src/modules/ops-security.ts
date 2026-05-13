import { supabase } from '../auth/supabase.js';

const MFA_ALLOWED_ROLES = new Set(['admin', 'gerente']);

type CompanySettingsRecord = Record<string, unknown>;

interface CompanyRow {
  settings: CompanySettingsRecord | null;
}

interface ProfileRow {
  id: string;
  full_name: string | null;
  role: string | null;
  company_id: string | null;
}

interface OpsSecuritySettingsPayload {
  requireMfa: boolean;
}

interface AdminMfaFactor {
  id: string;
  factorType: string;
  status: string;
  friendlyName: string | null;
}

export interface OpsMfaUserRow {
  userId: string;
  email: string;
  fullName: string | null;
  role: string;
  factorCount: number;
  verifiedFactorCount: number;
  factors: AdminMfaFactor[];
}

function normalizeRole(role: string | null | undefined): string | null {
  const value = String(role || '').trim().toLowerCase();
  if (!value) return null;
  if (value === 'manager') return 'gerente';
  return value;
}

function extractOpsSecuritySettings(settings: CompanySettingsRecord | null | undefined): OpsSecuritySettingsPayload {
  const candidate = settings?.opsSecurity;
  if (!candidate || typeof candidate !== 'object') {
    return { requireMfa: false };
  }

  const requireMfa = (candidate as Record<string, unknown>).requireMfa;
  return {
    requireMfa: requireMfa === true,
  };
}

export async function getOpsSecuritySettings(companyId: string): Promise<OpsSecuritySettingsPayload> {
  const { data, error } = await supabase
    .from('companies')
    .select('settings')
    .eq('id', companyId)
    .single<CompanyRow>();

  if (error) {
    throw new Error('Nao foi possivel carregar as configuracoes de seguranca do painel ops.');
  }

  return extractOpsSecuritySettings(data?.settings);
}

export async function updateOpsRequireMfa(companyId: string, requireMfa: boolean): Promise<OpsSecuritySettingsPayload> {
  const { data, error } = await supabase
    .from('companies')
    .select('settings')
    .eq('id', companyId)
    .single<CompanyRow>();

  if (error) {
    throw new Error('Nao foi possivel carregar as configuracoes atuais do ops.');
  }

  const currentSettings = (data?.settings || {}) as CompanySettingsRecord;
  const updatedSettings = {
    ...currentSettings,
    opsSecurity: {
      ...(typeof currentSettings.opsSecurity === 'object' && currentSettings.opsSecurity !== null
        ? currentSettings.opsSecurity as Record<string, unknown>
        : {}),
      requireMfa,
    },
  };

  const { error: updateError } = await supabase
    .from('companies')
    .update({ settings: updatedSettings, updated_at: new Date().toISOString() })
    .eq('id', companyId);

  if (updateError) {
    throw new Error('Nao foi possivel salvar a configuracao de MFA do painel ops.');
  }

  return { requireMfa };
}

export async function listOpsMfaUsers(companyId: string): Promise<OpsMfaUserRow[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, company_id')
    .eq('company_id', companyId)
    .in('role', ['admin', 'gerente', 'manager'])
    .order('full_name', { ascending: true })
    .returns<ProfileRow[]>();

  if (error) {
    throw new Error('Nao foi possivel listar os usuarios elegiveis para gestao de MFA.');
  }

  const profiles = (data || [])
    .map((profile) => ({ ...profile, role: normalizeRole(profile.role) }))
    .filter((profile): profile is ProfileRow & { role: string } => !!profile.role && MFA_ALLOWED_ROLES.has(profile.role));

  const users = await Promise.all(profiles.map(async (profile) => {
    const [{ data: userData, error: userError }, { data: factorData, error: factorError }] = await Promise.all([
      supabase.auth.admin.getUserById(profile.id),
      supabase.auth.admin.mfa.listFactors({ userId: profile.id }),
    ]);

    if (userError) {
      throw new Error('Nao foi possivel carregar os dados de um dos usuarios administrativos.');
    }

    if (factorError) {
      throw new Error('Nao foi possivel carregar os autenticadores MFA de um dos usuarios administrativos.');
    }

    const factors = (factorData?.factors || []).map((factor) => ({
      id: factor.id,
      factorType: factor.factor_type,
      status: factor.status,
      friendlyName: factor.friendly_name ?? null,
    }));

    return {
      userId: profile.id,
      email: userData.user?.email || 'sem-email',
      fullName: profile.full_name,
      role: profile.role,
      factorCount: factors.length,
      verifiedFactorCount: factors.filter((factor) => factor.status === 'verified').length,
      factors,
    } satisfies OpsMfaUserRow;
  }));

  return users;
}

export async function resetUserMfaFactors(companyId: string, userId: string): Promise<number> {
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, company_id')
    .eq('id', userId)
    .single<{ id: string; company_id: string | null }>();

  if (profileError || !profile || profile.company_id !== companyId) {
    throw new Error('O usuario selecionado nao pertence a empresa autorizada para este painel.');
  }

  const { data, error } = await supabase.auth.admin.mfa.listFactors({ userId });
  if (error) {
    throw new Error('Nao foi possivel consultar os autenticadores MFA do usuario.');
  }

  const factors = data?.factors || [];
  for (const factor of factors) {
    const { error: deleteError } = await supabase.auth.admin.mfa.deleteFactor({
      userId,
      id: factor.id,
    });

    if (deleteError) {
      throw new Error('Nao foi possivel remover os autenticadores MFA do usuario.');
    }
  }

  return factors.length;
}

interface TotpSecret {
  id: string;
  uri: string;
  qrCode: string;
}

interface MFASetupResult {
  secret: TotpSecret;
  qrCodeUrl: string;
  backupCodes: string[];
}

/**
 * Start MFA enrollment for current user (admin/gerente)
 * Returns secret and QR code URL for TOTP setup via Supabase client-side auth
 */
export async function startUserMfaEnrollment(displayName: string = 'Restaurante Ops Admin'): Promise<MFASetupResult> {
  // This enrollment is initiated from web/app clients
  // User will receive QR code and backup codes to configure their authenticator
  // The actual enrollment completion happens client-side via supabase.auth.mfa.challengeAndVerify
  
  throw new Error(
    'MFA enrollment deve ser configurado via aplicativo web (restaurante-web.app.br). ' +
    'Acesse o painel de Admin > Configurar MFA (2FA) para escanear o QR code com seu Google/Microsoft Authenticator.'
  );
}

/**
 * For ops server: verify user MFA factor exists
 */
export async function userHasVerifiedMfa(userId: string): Promise<boolean> {
  const { data, error } = await supabase.auth.admin.mfa.listFactors({
    userId,
  });

  if (error) {
    throw new Error('Nao foi possivel verificar status de MFA do usuario.');
  }

  const verifiedFactors = (data?.factors || []).filter(
    (factor) => factor.factor_type === 'totp' && factor.status === 'verified',
  );
  return verifiedFactors.length > 0;
}