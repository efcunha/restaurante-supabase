export interface OpsEnv {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  OPS_PORT: number;
  OPS_ENV: string;
  OPS_PUBLIC_BASE_URL?: string;
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

export function buildEnv(): OpsEnv {
  const resolvedPort = Number(process.env.PORT || process.env.OPS_PORT || '4040');

  return {
    SUPABASE_URL: required('SUPABASE_URL'),
    SUPABASE_SERVICE_ROLE_KEY: required('SUPABASE_SERVICE_ROLE_KEY'),
    OPS_PORT: Number.isFinite(resolvedPort) ? resolvedPort : 4040,
    OPS_ENV: process.env.OPS_ENV || 'development',
    OPS_PUBLIC_BASE_URL: process.env.OPS_PUBLIC_BASE_URL,
  };
}
