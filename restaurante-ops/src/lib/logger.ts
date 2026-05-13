import { buildEnv } from '../config/env.js';
import { enqueueLog } from './log-storage.js';

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
  'cpf',
  'phone',
];

interface LogContext {
  path?: string;
  method?: string;
  email?: string;
  statusCode?: number;
  reason?: string;
  detail?: string;
  service?: string;
  request_id?: string;
  user_id?: string;
  order_id?: string;
  durationMs?: number;
  duration_ms?: number;
  message?: string;
  metadata?: Record<string, unknown>;
  error?: string;
  [key: string]: unknown;
}

const env = buildEnv();

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
  const timestamp = new Date().toISOString();
  const sanitized = sanitizeValue(context) as LogContext;
  const service = typeof sanitized.service === 'string' ? sanitized.service : 'ops';
  const requestId = typeof sanitized.request_id === 'string' ? sanitized.request_id : undefined;
  const userId = typeof sanitized.user_id === 'string' ? sanitized.user_id : undefined;
  const orderId = typeof sanitized.order_id === 'string' ? sanitized.order_id : undefined;
  const durationMsRaw =
    typeof sanitized.duration_ms === 'number'
      ? sanitized.duration_ms
      : typeof sanitized.durationMs === 'number'
        ? sanitized.durationMs
        : undefined;
  const message =
    typeof sanitized.message === 'string'
      ? sanitized.message
      : typeof sanitized.detail === 'string'
        ? sanitized.detail
        : typeof sanitized.reason === 'string'
          ? sanitized.reason
          : event;

  const metadata: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(sanitized)) {
    if (
      key === 'service' ||
      key === 'request_id' ||
      key === 'user_id' ||
      key === 'order_id' ||
      key === 'durationMs' ||
      key === 'duration_ms' ||
      key === 'message' ||
      key === 'metadata'
    ) {
      continue;
    }
    metadata[key] = value;
  }
  if (sanitized.metadata && typeof sanitized.metadata === 'object') {
    Object.assign(metadata, sanitized.metadata);
  }

  const payload = {
    timestamp,
    level,
    service,
    event,
    message,
    request_id: requestId,
    user_id: userId,
    order_id: orderId,
    duration_ms: durationMsRaw,
    metadata,
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

  if (env.OBS_DUAL_WRITE) {
    enqueueLog({
      timestamp,
      level,
      service,
      event,
      message,
      request_id: requestId,
      user_id: userId,
      order_id: orderId,
      duration_ms: durationMsRaw,
      metadata,
    });
  }
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