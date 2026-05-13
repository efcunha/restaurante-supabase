/**
 * ObservabilityService.ts — restaurante-app
 *
 * Envia logs estruturados para o restaurante-ops.
 * Complementa o LoggerService (Sentry) — Sentry continua para crashes e stack traces;
 * ops recebe eventos de negócio e logs operacionais estruturados.
 *
 * Caracteristicas:
 * - Nao bloqueia UX (fire-and-forget com batching)
 * - Falha silenciosa quando endpoint indisponivel
 * - Redaction automatica de campos sensiveis
 * - Captura global de erros via ErrorUtils (React Native/Expo)
 */

import { ErrorUtils } from 'react-native';

// ────────────────────────────────────────────────────────────
// Tipos
// ────────────────────────────────────────────────────────────

export type OpsLogLevel = 'info' | 'warn' | 'error';

export interface OpsLogEntry {
  /** ISO 8601 — gerado automaticamente se omitido */
  timestamp?: string;
  level: OpsLogLevel;
  /** Sempre 'app' neste servico */
  service?: string;
  event: string;
  message: string;
  request_id?: string;
  user_id?: string;
  order_id?: string;
  duration_ms?: number;
  metadata?: Record<string, unknown>;
}

// ────────────────────────────────────────────────────────────
// Configuracao
// ────────────────────────────────────────────────────────────

const OPS_ENDPOINT = (process.env.EXPO_PUBLIC_OPS_LOGS_ENDPOINT ?? '').trim();
const LOG_API_KEY = (process.env.EXPO_PUBLIC_LOG_API_KEY ?? '').trim();

const SERVICE_NAME = 'app';

/** Tamanho maximo do lote antes do flush forcado */
const BATCH_MAX_SIZE = 50;

/** Intervalo de flush em ms (quando houver logs na fila) */
const FLUSH_INTERVAL_MS = 3000;

/** Tamanho maximo da fila para evitar consumo excessivo de memoria */
const QUEUE_MAX_SIZE = 500;

// ────────────────────────────────────────────────────────────
// Fila de logs em memoria
// ────────────────────────────────────────────────────────────

const logQueue: OpsLogEntry[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;

function ensureFlushTimer(): void {
  if (flushTimer != null) return;
  flushTimer = setInterval(() => {
    if (logQueue.length > 0) {
      void flushBatch();
    }
  }, FLUSH_INTERVAL_MS);
}

// ────────────────────────────────────────────────────────────
// Redaction de campos sensiveis
// ────────────────────────────────────────────────────────────

const REDACTED_KEYS = [
  'token', 'secret', 'password', 'senha', 'cookie', 'authorization',
  'api_key', 'apikey', 'service_role', 'card', 'cvv', 'pix_qr', 'cpf',
];

function redactMetadata(meta: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta)) {
    const lowerKey = key.toLowerCase();
    if (REDACTED_KEYS.some((k) => lowerKey.includes(k))) {
      result[key] = '[REDACTED]';
    } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = redactMetadata(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result;
}

function maskEmail(email: string): string {
  const at = email.indexOf('@');
  if (at <= 0) return email;
  return `${email[0]}***${email.slice(at)}`;
}

// ────────────────────────────────────────────────────────────
// Flush de lote para o ops
// ────────────────────────────────────────────────────────────

async function flushBatch(): Promise<void> {
  if (!OPS_ENDPOINT || !LOG_API_KEY || logQueue.length === 0) return;

  const batch = logQueue.splice(0, BATCH_MAX_SIZE);

  try {
    await fetch(`${OPS_ENDPOINT}/api/logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Log-Api-Key': LOG_API_KEY,
      },
      body: JSON.stringify({ source: SERVICE_NAME, logs: batch }),
    });
  } catch {
    // Falha silenciosa — nunca degradar UX por falha de logging
  }
}

// ────────────────────────────────────────────────────────────
// API publica
// ────────────────────────────────────────────────────────────

/**
 * Enfileira um log para envio ao restaurante-ops.
 * Retorna imediatamente (nao bloqueia).
 */
export function sendLogToOps(log: OpsLogEntry): void {
  if (!OPS_ENDPOINT || !LOG_API_KEY) return;

  // Backpressure: descartar info se fila cheia
  if (logQueue.length >= QUEUE_MAX_SIZE) {
    if (log.level === 'info') return;
  }

  const entry: OpsLogEntry = {
    timestamp: log.timestamp ?? new Date().toISOString(),
    level: log.level,
    service: SERVICE_NAME,
    event: log.event,
    message: log.message,
    ...(log.request_id != null && { request_id: log.request_id }),
    ...(log.user_id != null && { user_id: log.user_id }),
    ...(log.order_id != null && { order_id: log.order_id }),
    ...(log.duration_ms != null && { duration_ms: log.duration_ms }),
    ...(log.metadata != null && { metadata: redactMetadata(log.metadata) }),
  };

  logQueue.push(entry);

  if (logQueue.length >= BATCH_MAX_SIZE) {
    void flushBatch();
  } else {
    ensureFlushTimer();
  }
}

// ────────────────────────────────────────────────────────────
// Captura global de erros (React Native / Expo)
// ────────────────────────────────────────────────────────────

let globalHandlerInstalled = false;

/**
 * Instala o handler global de erros JS via ErrorUtils.
 * Deve ser chamado UMA VEZ na inicializacao do app (ex: App.js ou index.js).
 * Nao substitui o Sentry — delega para o handler anterior (chain).
 */
export function installGlobalErrorHandler(): void {
  if (globalHandlerInstalled) return;
  globalHandlerInstalled = true;

  // ErrorUtils não existe no runtime web (react-native-web/browser).
  if (!ErrorUtils || typeof ErrorUtils.getGlobalHandler !== 'function') {
    return;
  }

  const previousHandler = ErrorUtils.getGlobalHandler();

  ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
    sendLogToOps({
      level: isFatal ? 'error' : 'warn',
      event: 'app_error',
      message: error.message ?? 'Unknown JS error',
      metadata: {
        fatal: isFatal ?? false,
        // Truncar stack para nao exceder limites do payload
        stack: error.stack?.slice(0, 500),
      },
    });

    // Delegar para Sentry e handler anterior — nunca interromper a cadeia
    previousHandler(error, isFatal);
  });
}

// ────────────────────────────────────────────────────────────
// Eventos de negocio — helpers tipados
// ────────────────────────────────────────────────────────────

/** Pedido criado */
export function logOrderCreated(orderId: string, total: number, userId?: string): void {
  sendLogToOps({
    level: 'info',
    event: 'order_created',
    message: `Pedido ${orderId} criado`,
    order_id: orderId,
    user_id: userId,
    metadata: { total, source: SERVICE_NAME },
  });
}

/** Pedido atualizado */
export function logOrderUpdated(orderId: string, status: string, userId?: string): void {
  sendLogToOps({
    level: 'info',
    event: 'order_updated',
    message: `Pedido ${orderId} atualizado para ${status}`,
    order_id: orderId,
    user_id: userId,
    metadata: { status, source: SERVICE_NAME },
  });
}

/** Pedido cancelado */
export function logOrderCancelled(orderId: string, reason?: string, userId?: string): void {
  sendLogToOps({
    level: 'warn',
    event: 'order_cancelled',
    message: `Pedido ${orderId} cancelado`,
    order_id: orderId,
    user_id: userId,
    metadata: { reason, source: SERVICE_NAME },
  });
}

/** Pagamento confirmado */
export function logPaymentSuccess(orderId: string, amount: number, method?: string, userId?: string): void {
  sendLogToOps({
    level: 'info',
    event: 'payment_success',
    message: `Pagamento confirmado para pedido ${orderId}`,
    order_id: orderId,
    user_id: userId,
    metadata: { amount, method, source: SERVICE_NAME },
  });
}

/** Falha no pagamento */
export function logPaymentFailed(orderId: string, reason: string, userId?: string): void {
  sendLogToOps({
    level: 'error',
    event: 'payment_failed',
    message: `Falha no pagamento do pedido ${orderId}: ${reason}`,
    order_id: orderId,
    user_id: userId,
    metadata: { reason, source: SERVICE_NAME },
  });
}

/** Erro de API (chamada Supabase ou REST que retornou >= 400) */
export function logApiError(
  endpoint: string,
  statusCode: number,
  message: string,
  durationMs?: number,
  userId?: string,
): void {
  sendLogToOps({
    level: 'error',
    event: 'api_error',
    message: `Erro ${statusCode} em ${endpoint}: ${message}`,
    user_id: userId,
    duration_ms: durationMs,
    metadata: { endpoint, statusCode, source: SERVICE_NAME },
  });
}

/** Inicio do app */
export function logAppStartup(userId?: string, email?: string): void {
  sendLogToOps({
    level: 'info',
    event: 'app_startup',
    message: 'App mobile inicializado',
    user_id: userId,
    metadata: {
      source: SERVICE_NAME,
      ...(email != null && { user_email: maskEmail(email) }),
    },
  });
}
