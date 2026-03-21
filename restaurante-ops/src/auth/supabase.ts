import { createClient } from '@supabase/supabase-js';
import { buildEnv } from '../config/env.js';

const env = buildEnv();

/** Unica empresa autorizada a acessar o restaurante-ops */
const OPS_ALLOWED_COMPANY_ID = 'f85bfdc2-982a-4cf7-b176-bce68426f861';

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

  // Busca perfil interno
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, company_id')
    .eq('id', userId)
    .single();

  // Restringe acesso: somente usuarios da empresa autorizada
  if (profile?.company_id !== OPS_ALLOWED_COMPANY_ID) {
    throw new Error('Acesso negado: usuario nao pertence a empresa autorizada.');
  }

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

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, company_id')
    .eq('id', data.user.id)
    .single();

  // Restringe acesso: somente usuarios da empresa autorizada
  if (profile?.company_id !== OPS_ALLOWED_COMPANY_ID) return null;

  return {
    id: data.user.id,
    email: data.user.email ?? '',
    full_name: profile?.full_name ?? null,
    role: profile?.role ?? null,
    company_id: profile?.company_id ?? null,
  };
}
