import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { logError, logInfo, logWarn } from './logger.js';

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export interface RequestTrackingContext {
  requestId: string;
  startedAt: number;
}

export function resolveRequestId(req: IncomingMessage): string {
  const raw = req.headers['x-request-id'];
  const candidate = Array.isArray(raw) ? raw[0] : raw;
  if (typeof candidate === 'string' && isUuid(candidate)) {
    return candidate;
  }

  return randomUUID();
}

export function attachRequestTracking(
  req: IncomingMessage,
  res: ServerResponse,
  safePathForLog: string,
): RequestTrackingContext {
  const requestId = resolveRequestId(req);
  const startedAt = Date.now();

  res.setHeader('X-Request-ID', requestId);
  res.on('finish', () => {
    const statusCode = res.statusCode;
    const durationMs = Date.now() - startedAt;

    const logFn = statusCode >= 500
      ? logError
      : statusCode >= 400
        ? logWarn
        : logInfo;

    logFn('http_request', {
      service: 'ops',
      method: req.method,
      path: safePathForLog,
      statusCode,
      request_id: requestId,
      duration_ms: durationMs,
    });
  });

  return { requestId, startedAt };
}