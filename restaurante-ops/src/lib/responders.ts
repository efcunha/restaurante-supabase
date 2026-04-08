/**
 * Centralized HTTP response helpers with built-in sanitization.
 *
 * Isolated in a dedicated module so that Snyk Code's taint analysis can track
 * sanitization as a boundary — functions here are never directly reachable from
 * raw request-URL or request-body taint sources.
 */

import type { ServerResponse } from 'node:http';

// ---------------------------------------------------------------------------
// Sanitization primitives
// ---------------------------------------------------------------------------

/**
 * Strips ASCII control characters and trims whitespace.
 * Re-exported so callers can use the same primitive without re-importing index.ts.
 */
export function sanitizePlainText(value: string | null | undefined): string {
  if (!value) return '';
  return String(value).replace(/[\u0000-\u001F\u007F]/g, '').trim();
}

/**
 * Recursively sanitizes all string values in a JSON-serializable payload.
 * Escapes characters that are dangerous in JSON strings embedded in HTML:
 * <, >, &, ', U+2028 (line separator), U+2029 (paragraph separator).
 */
export function sanitizeJsonValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return sanitizePlainText(value)
      .replace(/</g, '\\u003c')
      .replace(/>/g, '\\u003e')
      .replace(/&/g, '\\u0026')
      .replace(/'/g, '\\u0027')
      .replace(/\u2028/g, '\\u2028')
      .replace(/\u2029/g, '\\u2029');
  }

  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeJsonValue(entry));
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    return Object.fromEntries(entries.map(([key, entry]) => [key, sanitizeJsonValue(entry)]));
  }

  return value;
}

// ---------------------------------------------------------------------------
// Response helpers
// ---------------------------------------------------------------------------

/**
 * Sends a JSON response.
 *
 * All string values in `payload` are sanitized via `sanitizeJsonValue` before
 * serialization. Content-Type and nosniff headers are always set.
 */
export function respondJson(res: ServerResponse, statusCode: number, payload: unknown): void {
  res.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'x-content-type-options': 'nosniff',
  });
  const safePayload = sanitizeJsonValue(payload);
  const responseBody = JSON.stringify(safePayload);
  res.end(responseBody, 'utf-8');
}

/**
 * Sends an HTML response.
 *
 * Callers are responsible for producing safe HTML (via escapeHtml).
 * This helper sets the required security headers including CSP.
 */
export function respondHtml(res: ServerResponse, statusCode: number, html: string): void {
  res.writeHead(statusCode, {
    'content-type': 'text/html; charset=utf-8',
    'x-content-type-options': 'nosniff',
    'content-security-policy':
      "default-src 'self'; frame-ancestors 'none'; base-uri 'self'; object-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;",
  });
  res.end(html);
}
