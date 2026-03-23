declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

function resolveAllowOrigin(): string {
  const rawOrigins = Deno.env.get('CORS_ALLOWED_ORIGINS') || '';
  const origins = rawOrigins
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  if (origins.length === 1) {
    return origins[0];
  }

  if (origins.length > 1) {
    console.warn('[CORS] Multiple origins configured. Using wildcard fallback until per-request origin handling is enabled.');
  }

  return '*';
}

export const corsHeaders = {
  'Access-Control-Allow-Origin': resolveAllowOrigin(),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
