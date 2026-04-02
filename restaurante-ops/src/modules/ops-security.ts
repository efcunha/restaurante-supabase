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
    throw new Error('Nao foi possivel carregar as configuracoes de seguranca do ops.');
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
    throw new Error('Nao foi possivel salvar a configuracao de MFA do ops.');
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
    throw new Error('Nao foi possivel listar usuarios elegiveis para gestao de MFA.');
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
      throw new Error(`Nao foi possivel carregar o usuario ${profile.id}.`);
    }

    if (factorError) {
      throw new Error(`Nao foi possivel carregar os fatores MFA do usuario ${profile.id}.`);
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
    throw new Error('Usuario alvo nao pertence a empresa autorizada.');
  }

  const { data, error } = await supabase.auth.admin.mfa.listFactors({ userId });
  if (error) {
    throw new Error('Nao foi possivel consultar os fatores MFA do usuario.');
  }

  const factors = data?.factors || [];
  for (const factor of factors) {
    const { error: deleteError } = await supabase.auth.admin.mfa.deleteFactor({
      userId,
      id: factor.id,
    });

    if (deleteError) {
      throw new Error('Nao foi possivel resetar o MFA do usuario.');
    }
  }

  return factors.length;
}