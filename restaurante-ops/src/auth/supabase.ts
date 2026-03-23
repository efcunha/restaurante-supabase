import { createClient } from '@supabase/supabase-js';
import { buildEnv } from '../config/env.js';
import { logWarn } from '../lib/logger.js';

const env = buildEnv();

/** Unica empresa autorizada a acessar o restaurante-ops */
const DEFAULT_OPS_ALLOWED_COMPANY_ID = 'f85bfdc2-982a-4cf7-b176-bce68426f861';
const OPS_ALLOWED_COMPANY_ID = env.OPS_ALLOWED_COMPANY_ID || DEFAULT_OPS_ALLOWED_COMPANY_ID;
const OPS_ALLOWED_ROLES = new Set(['admin', 'gerente']);

if (!env.OPS_ALLOWED_COMPANY_ID) {
  logWarn('auth.ops_allowed_company_default', {
    reason: 'OPS_ALLOWED_COMPANY_ID not configured',
    detail: 'Using fallback tenant allowlist. Configure OPS_ALLOWED_COMPANY_ID in production.',
  });
}

/**
 * Cliente Supabase com service-role para operacoes internas do ops.
 * Nunca expor este cliente ao browser/cliente.
 */
export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

export interface OpsUser {
  id: string;
  email: string;
  full_name: string | null;
  role: string | null;
  company_id: string | null;
}

interface OpsProfile {
  full_name: string | null;
  role: string | null;
  company_id: string | null;
}

function normalizeOpsRole(role: string | null | undefined): string | null {
  const value = String(role || '').trim().toLowerCase();
  if (!value) return null;
  if (value === 'manager') return 'gerente';
  return value;
}

function assertOpsAccess(profile: OpsProfile | null | undefined): OpsProfile {
  if (!profile) {
    throw new Error('Acesso negado: perfil do usuario nao encontrado.');
  }

  if (profile.company_id !== OPS_ALLOWED_COMPANY_ID) {
    throw new Error('Acesso negado: usuario nao pertence a empresa autorizada.');
  }

  const normalizedRole = normalizeOpsRole(profile.role);
  if (!normalizedRole || !OPS_ALLOWED_ROLES.has(normalizedRole)) {
    throw new Error('Acesso negado: usuario sem permissao administrativa para o restaurante-ops.');
  }

  return {
    ...profile,
    role: normalizedRole,
  };
}

async function fetchOpsProfile(userId: string): Promise<OpsProfile> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('full_name, role, company_id')
    .eq('id', userId)
    .single();

  if (error) {
    logWarn('auth.profile_lookup_failed', {
      reason: error.message,
    });
    throw new Error('Acesso negado: nao foi possivel validar o perfil do usuario.');
  }

  return assertOpsAccess(profile);
}

/**
 * Autentica com email/senha via Supabase Auth.
 * Retorna o access_token e dados do usuario.
 */
export async function signInWithPassword(
  email: string,
  password: string,
): Promise<{ token: string; user: OpsUser }> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) throw new Error(error.message);
  if (!data.session) throw new Error('Sessao nao criada');

  const token = data.session.access_token;
  const userId = data.user.id;

  const profile = await fetchOpsProfile(userId);

  return {
    token,
    user: {
      id: userId,
      email: data.user.email ?? email,
      full_name: profile?.full_name ?? null,
      role: profile?.role ?? null,
      company_id: profile?.company_id ?? null,
    },
  };
}

/**
 * Valida um access_token Supabase e retorna o usuario.
 */
export async function getUserFromToken(token: string): Promise<OpsUser | null> {
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;

  let profile: OpsProfile;
  try {
    profile = await fetchOpsProfile(data.user.id);
  } catch {
    return null;
  }

  return {
    id: data.user.id,
    email: data.user.email ?? '',
    full_name: profile?.full_name ?? null,
    role: profile?.role ?? null,
    company_id: profile?.company_id ?? null,
  };
}
