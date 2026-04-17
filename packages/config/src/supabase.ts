import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;

export interface SupabasePublicEnv {
  url: string;
  anonKey: string;
}

export function createSupabasePublicClient(env: SupabasePublicEnv): SupabaseClient {
  if (!env.url || !env.anonKey) {
    throw new Error(
      'Supabase env ausente. Defina EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY.',
    );
  }

  return createClient(env.url, env.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
}

export function getSingletonSupabasePublicClient(env: SupabasePublicEnv): SupabaseClient {
  if (!supabaseClient) {
    supabaseClient = createSupabasePublicClient(env);
  }

  return supabaseClient;
}
