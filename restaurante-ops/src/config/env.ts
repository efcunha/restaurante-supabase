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
  OPS_LOG_API_KEY?: string;
  OPS_LOG_RATE_LIMIT_MAX_ATTEMPTS: number;
  OPS_LOG_RATE_LIMIT_WINDOW_MS: number;
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
  OPS_ALLOW_PLAINTEXT_HTTP: boolean;
  OPS_TRUST_PROXY_HEADERS: boolean;
  OPS_TLS_KEY_PEM?: string;
  OPS_TLS_CERT_PEM?: string;
  WEB_BASE_URL?: string;
  ACTIVEPIECES_BASE_URL?: string;
  ACTIVEPIECES_WEBHOOK_SECRET?: string;
  EVOLUTION_API_BASE_URL?: string;
  EVOLUTION_WEBHOOK_SECRET?: string;
  LOG_LEVEL: string;
  SLOW_QUERY_THRESHOLD_MS: number;
  LOG_RETENTION_DAYS: number;
  ALERT_CHECK_INTERVAL_MS: number;
  ALERT_WEBHOOK_TIMEOUT_MS: number;
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
  const parsedOpsLogRateLimitMaxAttempts = Number(process.env.OPS_LOG_RATE_LIMIT_MAX_ATTEMPTS || '1200');
  const parsedOpsLogRateLimitWindowMs = Number(process.env.OPS_LOG_RATE_LIMIT_WINDOW_MS || '60000');
  const parsedMaxAttempts = Number(process.env.AUTH_RATE_LIMIT_MAX_ATTEMPTS || '8');
  const parsedWindowMs = Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || String(15 * 60 * 1000));
  const parsedBillingMaxAttempts = Number(process.env.RATE_LIMIT_BILLING_MAX_ATTEMPTS || '30');
  const parsedBillingWindowMs = Number(process.env.RATE_LIMIT_BILLING_WINDOW_MS || String(60 * 1000));
  const parsedFallbackEnabled = process.env.RATE_LIMIT_FALLBACK_ENABLED !== 'false';
  const parsedRequireMfa = process.env.OPS_REQUIRE_MFA === 'true';
  const parsedAllowPlaintextHttp = process.env.OPS_ALLOW_PLAINTEXT_HTTP === 'true';
  const parsedTrustProxyHeaders = process.env.OPS_TRUST_PROXY_HEADERS === 'true';
  const parsedObsDualWrite = process.env.OBS_DUAL_WRITE === 'true';
  const parsedObsReadFromIsolated = process.env.OBS_READ_FROM_ISOLATED === 'true';
  const parsedSlowQueryThreshold = Number(process.env.SLOW_QUERY_THRESHOLD_MS || '500');
  const parsedLogRetentionDays = Number(process.env.LOG_RETENTION_DAYS || '30');
  const parsedAlertCheckInterval = Number(process.env.ALERT_CHECK_INTERVAL_MS || '60000');
  const parsedAlertWebhookTimeout = Number(process.env.ALERT_WEBHOOK_TIMEOUT_MS || '5000');

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
    OPS_LOG_API_KEY: process.env.OPS_LOG_API_KEY,
    OPS_LOG_RATE_LIMIT_MAX_ATTEMPTS: Number.isFinite(parsedOpsLogRateLimitMaxAttempts)
      ? parsedOpsLogRateLimitMaxAttempts
      : 1200,
    OPS_LOG_RATE_LIMIT_WINDOW_MS: Number.isFinite(parsedOpsLogRateLimitWindowMs)
      ? parsedOpsLogRateLimitWindowMs
      : 60000,
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
    OPS_ALLOW_PLAINTEXT_HTTP: parsedAllowPlaintextHttp,
    OPS_TRUST_PROXY_HEADERS: parsedTrustProxyHeaders,
    OPS_TLS_KEY_PEM: process.env.OPS_TLS_KEY_PEM,
    OPS_TLS_CERT_PEM: process.env.OPS_TLS_CERT_PEM,
    WEB_BASE_URL: process.env.WEB_BASE_URL,
    ACTIVEPIECES_BASE_URL: process.env.ACTIVEPIECES_BASE_URL,
    ACTIVEPIECES_WEBHOOK_SECRET: process.env.ACTIVEPIECES_WEBHOOK_SECRET,
    EVOLUTION_API_BASE_URL: process.env.EVOLUTION_API_BASE_URL,
    EVOLUTION_WEBHOOK_SECRET: process.env.EVOLUTION_WEBHOOK_SECRET,
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
    SLOW_QUERY_THRESHOLD_MS: Number.isFinite(parsedSlowQueryThreshold) ? parsedSlowQueryThreshold : 500,
    LOG_RETENTION_DAYS: Number.isFinite(parsedLogRetentionDays) ? parsedLogRetentionDays : 30,
    ALERT_CHECK_INTERVAL_MS: Number.isFinite(parsedAlertCheckInterval) ? parsedAlertCheckInterval : 60000,
    ALERT_WEBHOOK_TIMEOUT_MS: Number.isFinite(parsedAlertWebhookTimeout) ? parsedAlertWebhookTimeout : 5000,
  };
}
