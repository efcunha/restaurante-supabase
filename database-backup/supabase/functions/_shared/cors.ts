declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const DEFAULT_ALLOWED_HEADERS = 'authorization, x-client-info, apikey, content-type';
const DEFAULT_ALLOWED_METHODS = 'POST, OPTIONS';

function normalizeOrigin(value: string | null | undefined): string | null {
  const trimmed = (value || '').trim();

  if (!trimmed) {
    return null;
  }

  try {
    return new URL(trimmed).origin;
  } catch {
    return trimmed.replace(/\/+$/, '') || null;
  }
}

function resolveAllowedOrigins(): string[] {
  const rawOrigins = Deno.env.get('CORS_ALLOWED_ORIGINS') || '';
  const origins = rawOrigins
    .split(',')
    .map((item) => normalizeOrigin(item))
    .filter((item): item is string => Boolean(item));

  return [...new Set(origins)];
}

function resolveRequestOrigin(req: Request): string | null {
  return normalizeOrigin(req.headers.get('Origin'));
}

export function getCorsHeaders(req: Request): Record<string, string> {
  const requestOrigin = resolveRequestOrigin(req);
  const allowedOrigins = resolveAllowedOrigins();
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': DEFAULT_ALLOWED_HEADERS,
    'Access-Control-Allow-Methods': DEFAULT_ALLOWED_METHODS,
  };

  if (!requestOrigin) {
    return headers;
  }

  headers.Vary = 'Origin';

  if (allowedOrigins.includes(requestOrigin)) {
    headers['Access-Control-Allow-Origin'] = requestOrigin;
    return headers;
  }

  if (allowedOrigins.length === 0) {
    console.warn('[CORS] Request blocked because CORS_ALLOWED_ORIGINS is not configured.', { origin: requestOrigin });
  } else {
    console.warn('[CORS] Request blocked for origin outside whitelist.', { origin: requestOrigin });
  }

  return headers;
}

export function buildCorsPreflightResponse(req: Request): Response {
  return new Response('ok', { headers: getCorsHeaders(req) });
}
