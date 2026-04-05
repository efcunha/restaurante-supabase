// Security boundary: values in this module are server-only configuration.
// Never expose these vars to client-side bundles or HTTP responses.
export interface OpsEnv {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  OBS_SUPABASE_URL?: string;
  OBS_SUPABASE_SERVICE_ROLE_KEY?: string;
  OBS_DUAL_WRITE: boolean;
  OBS_READ_FROM_ISOLATED: boolean;
  LOG_INGEST_BUFFER_MAX: number;
  LOG_INGEST_BATCH_SIZE: number;
  LOG_INGEST_FLUSH_INTERVAL_MS: number;
  OPS_PORT: number;
  OPS_ENV: string;
  OPS_ALLOWED_COMPANY_ID?: string;
  OPS_REQUIRE_MFA: boolean;
  AUTH_RATE_LIMIT_MAX_ATTEMPTS: number;
  AUTH_RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_BILLING_MAX_ATTEMPTS: number;
  RATE_LIMIT_BILLING_WINDOW_MS: number;
  RATE_LIMIT_FALLBACK_ENABLED: boolean;
  REDIS_URL?: string;
  OPS_PUBLIC_BASE_URL?: string;
  WEB_BASE_URL?: string;
  ACTIVEPIECES_BASE_URL?: string;
  EVOLUTION_API_BASE_URL?: string;
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
  const parsedLogBufferMax = Number(process.env.LOG_INGEST_BUFFER_MAX || '10000');
  const parsedLogBatchSize = Number(process.env.LOG_INGEST_BATCH_SIZE || '500');
  const parsedLogFlushIntervalMs = Number(process.env.LOG_INGEST_FLUSH_INTERVAL_MS || '1500');
  const parsedMaxAttempts = Number(process.env.AUTH_RATE_LIMIT_MAX_ATTEMPTS || '8');
  const parsedWindowMs = Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || String(15 * 60 * 1000));
  const parsedBillingMaxAttempts = Number(process.env.RATE_LIMIT_BILLING_MAX_ATTEMPTS || '30');
  const parsedBillingWindowMs = Number(process.env.RATE_LIMIT_BILLING_WINDOW_MS || String(60 * 1000));
  const parsedFallbackEnabled = process.env.RATE_LIMIT_FALLBACK_ENABLED !== 'false';
  const parsedRequireMfa = process.env.OPS_REQUIRE_MFA === 'true';
  const parsedObsDualWrite = process.env.OBS_DUAL_WRITE === 'true';
  const parsedObsReadFromIsolated = process.env.OBS_READ_FROM_ISOLATED === 'true';

  return {
    SUPABASE_URL: required('SUPABASE_URL'),
    SUPABASE_SERVICE_ROLE_KEY: required('SUPABASE_SERVICE_ROLE_KEY'),
    OBS_SUPABASE_URL: process.env.OBS_SUPABASE_URL,
    OBS_SUPABASE_SERVICE_ROLE_KEY: process.env.OBS_SUPABASE_SERVICE_ROLE_KEY,
    OBS_DUAL_WRITE: parsedObsDualWrite,
    OBS_READ_FROM_ISOLATED: parsedObsReadFromIsolated,
    LOG_INGEST_BUFFER_MAX: Number.isFinite(parsedLogBufferMax) ? parsedLogBufferMax : 10000,
    LOG_INGEST_BATCH_SIZE: Number.isFinite(parsedLogBatchSize) ? parsedLogBatchSize : 500,
    LOG_INGEST_FLUSH_INTERVAL_MS: Number.isFinite(parsedLogFlushIntervalMs) ? parsedLogFlushIntervalMs : 1500,
    OPS_PORT: Number.isFinite(resolvedPort) ? resolvedPort : 4040,
    OPS_ENV: process.env.OPS_ENV || 'development',
    OPS_ALLOWED_COMPANY_ID: process.env.OPS_ALLOWED_COMPANY_ID,
    OPS_REQUIRE_MFA: parsedRequireMfa,
    AUTH_RATE_LIMIT_MAX_ATTEMPTS: Number.isFinite(parsedMaxAttempts) ? parsedMaxAttempts : 8,
    AUTH_RATE_LIMIT_WINDOW_MS: Number.isFinite(parsedWindowMs) ? parsedWindowMs : 15 * 60 * 1000,
    RATE_LIMIT_BILLING_MAX_ATTEMPTS: Number.isFinite(parsedBillingMaxAttempts) ? parsedBillingMaxAttempts : 30,
    RATE_LIMIT_BILLING_WINDOW_MS: Number.isFinite(parsedBillingWindowMs) ? parsedBillingWindowMs : 60 * 1000,
    RATE_LIMIT_FALLBACK_ENABLED: parsedFallbackEnabled,
    REDIS_URL: process.env.REDIS_URL,
    OPS_PUBLIC_BASE_URL: process.env.OPS_PUBLIC_BASE_URL,
    WEB_BASE_URL: process.env.WEB_BASE_URL,
    ACTIVEPIECES_BASE_URL: process.env.ACTIVEPIECES_BASE_URL,
    EVOLUTION_API_BASE_URL: process.env.EVOLUTION_API_BASE_URL,
  };
}
