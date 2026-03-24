export function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Variavel de ambiente obrigatoria ausente: ${name}`);
  }

  return value;
}

export const SUPABASE_URL = getRequiredEnv('EXPO_PUBLIC_SUPABASE_URL');
export const SUPABASE_ANON_KEY = getRequiredEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY');