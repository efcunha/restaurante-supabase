import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from './cors.ts';

export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

export async function requireAdmin(req: Request) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const authorization = req.headers.get('Authorization');

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    throw new HttpError(500, 'Supabase environment variables are missing for edge execution.');
  }

  if (!authorization) {
    throw new HttpError(401, 'Authorization header is required.');
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authorization,
      },
    },
  });

  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const { data: userData, error: userError } = await userClient.auth.getUser();

  if (userError || !userData.user) {
    throw new HttpError(401, 'Authenticated user not found for this request.');
  }

  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('company_id, role, full_name, email')
    .eq('id', userData.user.id)
    .single();

  if (profileError || !profile) {
    throw new HttpError(403, 'Admin profile not found for billing operation.');
  }

  if (profile.role !== 'admin') {
    throw new HttpError(403, 'Only admins can manage billing.');
  }

  return {
    adminClient,
    user: userData.user,
    profile,
  };
}
