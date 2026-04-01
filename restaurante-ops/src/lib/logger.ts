type LogLevel = 'info' | 'warn' | 'error';

const REDACTED = '[REDACTED]';
const REDACTED_EMAIL = '[REDACTED_EMAIL]';
const SENSITIVE_KEY_FRAGMENTS = [
  'token',
  'secret',
  'password',
  'cookie',
  'authorization',
  'api_key',
  'apikey',
  'service_role',
  'mp_payment',
  'card',
  'cvv',
  'pix_qr',
];

interface LogContext {
  path?: string;
  method?: string;
  email?: string;
  statusCode?: number;
  reason?: string;
  detail?: string;
  service?: string;
  durationMs?: number;
  error?: string;
  [key: string]: unknown;
}

function maskEmail(email: string): string {
  const trimmedEmail = email.trim();
  const atIndex = trimmedEmail.indexOf('@');
  if (atIndex <= 0) {
    return REDACTED_EMAIL;
  }

  const local = trimmedEmail.slice(0, atIndex);
  const domain = trimmedEmail.slice(atIndex + 1);
  if (!domain) {
    return REDACTED_EMAIL;
  }

  return `${local.slice(0, 1)}***@${domain}`;
}

function sanitizeString(value: string): string {
  return value
    .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, `Bearer ${REDACTED}`)
    .replace(/eyJ[A-Za-z0-9._-]{10,}/g, REDACTED)
    .replace(/sb_publishable_[A-Za-z0-9_]+/g, REDACTED);
}

function isSensitiveKey(key: string): boolean {
  const normalizedKey = key.toLowerCase();
  return SENSITIVE_KEY_FRAGMENTS.some((fragment) => normalizedKey.includes(fragment));
}

function sanitizeValue(value: unknown, keyHint?: string): unknown {
  if (value == null) {
    return value;
  }

  const normalizedKey = keyHint?.toLowerCase() ?? '';
  if (normalizedKey.includes('email') && typeof value === 'string') {
    return maskEmail(value);
  }

  if (normalizedKey && isSensitiveKey(normalizedKey)) {
    return REDACTED;
  }

  if (typeof value === 'string') {
    return sanitizeString(value);
  }

  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeValue(entry, keyHint));
  }

  if (typeof value === 'object') {
    const sanitizedObject: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      sanitizedObject[key] = sanitizeValue(entry, key);
    }
    return sanitizedObject;
  }

  return value;
}

function writeLog(level: LogLevel, event: string, context: LogContext = {}): void {
  const payload = {
    ts: new Date().toISOString(),
    level,
    event,
    ...(sanitizeValue(context) as LogContext),
  };

  const line = JSON.stringify(payload);
  if (level === 'error') {
    console.error(line);
    return;
  }

  if (level === 'warn') {
    console.warn(line);
    return;
  }

  console.log(line);
}

export function logInfo(event: string, context?: LogContext): void {
  writeLog('info', event, context);
}

export function logWarn(event: string, context?: LogContext): void {
  writeLog('warn', event, context);
}

export function logError(event: string, context?: LogContext): void {
  writeLog('error', event, context);
}