declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

// @ts-ignore Supabase Edge resolves npm specifiers at runtime.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { HttpError, jsonResponse } from '../_shared/auth-secure.ts';

// This function is deployed with --no-verify-jwt and performs JWT validation
// internally via auth.getUser() to avoid gateway false negatives seen in web clients.

type EmployeeRole = 'admin' | 'gerente' | 'garcom' | 'cozinheiro' | 'montagem' | 'entregador' | 'caixa';

interface CreateEmployeePayload {
  nome?: unknown;
  cpf?: unknown;
  funcao?: unknown;
  email?: unknown;
  senha?: unknown;
  companyId?: unknown;
  phone?: unknown;
}

const ALLOWED_ROLES = new Set<EmployeeRole>([
  'admin',
  'gerente',
  'garcom',
  'cozinheiro',
  'montagem',
  'entregador',
  'caixa',
]);

function isValidUUID(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeRole(value: unknown): EmployeeRole {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';

  switch (normalized) {
    case 'manager':
      return 'gerente';
    case 'waiter':
      return 'garcom';
    case 'kitchen':
    case 'cozinha':
    case 'churrasqueiro':
      return 'cozinheiro';
    case 'motoboy':
    case 'motorista':
      return 'entregador';
    default:
      if (ALLOWED_ROLES.has(normalized as EmployeeRole)) {
        return normalized as EmployeeRole;
      }
      throw new HttpError(400, 'Função de funcionário inválida.');
  }
}

function requireString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new HttpError(400, `${fieldName} é obrigatório.`);
  }

  return value.trim();
}

function sanitizePhone(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

async function requireCompanyAdmin(req: Request) {
  const supabaseUrl = Deno.env.get('EDGE_SUPABASE_URL') || Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('EDGE_SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('EDGE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    throw new HttpError(500, 'Serviço temporariamente indisponível.');
  }

  const authorization = req.headers.get('Authorization');
  if (!authorization || !authorization.toLowerCase().startsWith('bearer ')) {
    throw new HttpError(401, 'Authorization header inválido ou ausente.');
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authorization,
      },
    },
  });

  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const accessToken = authorization.replace(/^Bearer\s+/i, '').trim();

  let { data: userData, error: userError } = await userClient.auth.getUser();
  if ((userError || !userData.user) && accessToken) {
    const fallback = await adminClient.auth.getUser(accessToken);
    userData = fallback.data;
    userError = fallback.error;
  }

  if (userError || !userData.user) {
    throw new HttpError(401, 'Usuário não autenticado.');
  }

  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('id, company_id, role, email, full_name')
    .eq('id', userData.user.id)
    .single();

  if (profileError || !profile) {
    throw new HttpError(403, 'Perfil do usuário não encontrado.');
  }

  if (!['admin', 'gerente'].includes(profile.role)) {
    throw new HttpError(403, 'Permissão insuficiente para cadastrar funcionários.');
  }

  if (!isValidUUID(profile.company_id)) {
    throw new HttpError(403, 'Contexto de empresa inválido.');
  }

  return {
    adminClient,
    actorProfile: profile,
  };
}

function mapAdminCreateUserError(error: { message?: string } | null): HttpError {
  const message = error?.message || 'Não foi possível criar o funcionário.';

  if (message.includes('already registered') || message.includes('already exists')) {
    return new HttpError(409, 'Email já cadastrado.');
  }

  if (message.includes('Password')) {
    return new HttpError(400, 'Senha muito fraca (mínimo 6 caracteres).');
  }

  if (message.includes('rate limit exceeded')) {
    return new HttpError(429, 'Limite de tentativas de cadastro excedido. Aguarde alguns minutos e tente novamente.');
  }

  if (message.includes('invalid') && message.toLowerCase().includes('email')) {
    return new HttpError(400, 'Email inválido (formato incorreto).');
  }

  return new HttpError(400, message);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse(405, { success: false, error: 'Método não permitido.' });
  }

  let createdUserId: string | null = null;

  try {
    const { adminClient, actorProfile } = await requireCompanyAdmin(req);
    const payload = await req.json() as CreateEmployeePayload;

    const nome = requireString(payload.nome, 'Nome');
    const cpf = requireString(payload.cpf, 'CPF');
    const email = requireString(payload.email, 'Email').toLowerCase();
    const senha = requireString(payload.senha, 'Senha');
    const funcao = normalizeRole(payload.funcao);
    const phone = sanitizePhone(payload.phone);
    const requestedCompanyId = payload.companyId;

    if (!isValidEmail(email)) {
      throw new HttpError(400, 'Email inválido (formato incorreto).');
    }

    if (senha.length < 6) {
      throw new HttpError(400, 'Senha muito fraca (mínimo 6 caracteres).');
    }

    if (requestedCompanyId != null && requestedCompanyId !== actorProfile.company_id) {
      throw new HttpError(403, 'Não é permitido cadastrar funcionários em outra empresa.');
    }

    const companyId = actorProfile.company_id;
    const hireDate = new Date().toISOString().split('T')[0];

    const { data: createdUser, error: createUserError } = await adminClient.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: {
        full_name: nome,
        role: funcao,
      },
    });

    if (createUserError || !createdUser.user) {
      throw mapAdminCreateUserError(createUserError);
    }

    createdUserId = createdUser.user.id;

    const profilePayload = {
      id: createdUserId,
      company_id: companyId,
      full_name: nome,
      email,
      role: funcao,
      funcao,
      cpf,
      phone,
      active: true,
      hire_date: hireDate,
      updated_at: new Date().toISOString(),
    };

    const { data: savedProfile, error: profileError } = await adminClient
      .from('profiles')
      .upsert(profilePayload, { onConflict: 'id' })
      .select('id, company_id, full_name, email, role, cpf, phone, active, created_at')
      .single();

    if (profileError || !savedProfile || savedProfile.company_id !== companyId) {
      throw new HttpError(500, 'Funcionário criado no Auth, mas não foi possível vincular o profile à empresa.');
    }

    return jsonResponse(200, {
      success: true,
      funcionarioId: savedProfile.id,
      funcionario: {
        id: savedProfile.id,
        uid: savedProfile.id,
        nome: savedProfile.full_name || nome,
        cpf: savedProfile.cpf || cpf,
        phone: savedProfile.phone || phone,
        funcao: savedProfile.role || funcao,
        email: savedProfile.email || email,
        companyId: savedProfile.company_id,
        ativo: savedProfile.active !== false,
        criadoEm: savedProfile.created_at || new Date().toISOString(),
      },
    });
  } catch (error) {
    if (createdUserId) {
      const supabaseUrl = Deno.env.get('EDGE_SUPABASE_URL') || Deno.env.get('SUPABASE_URL');
      const serviceRoleKey = Deno.env.get('EDGE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

      if (supabaseUrl && serviceRoleKey) {
        const adminClient = createClient(supabaseUrl, serviceRoleKey);
        await adminClient.auth.admin.deleteUser(createdUserId).catch(() => undefined);
      }
    }

    if (error instanceof HttpError) {
      return jsonResponse(error.status, { success: false, error: error.message });
    }

    // Keep internal details in logs only; return a stable generic client message.
    console.error('[create-company-employee] Unexpected error:', error);
    return jsonResponse(500, { success: false, error: 'Erro interno ao criar funcionário.' });
  }
});