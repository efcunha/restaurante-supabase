/**
 * Sentry Configuration for restaurante-app
 * 
 * Security: SEC-W1-005 - Logging Seguro
 * Purpose: Initialize Sentry with PII/credential scrubbing
 * 
 * Features:
 * - beforeSend hook to filter sensitive data
 * - Data scrubbing for emails, tokens, passwords
 * - URL allowlist to prevent domain-specific data leakage
 * - Development mode with debug logging
 */

import * as Sentry from '@sentry/react-native';

const SENTRY_DSN = 'https://eb58edf9733b7a7665c969d5680dd482@o4510816056049664.ingest.us.sentry.io/4510816058015744';
const EXPO_PUBLIC_BASE_URL = process.env.EXPO_PUBLIC_BASE_URL || 'https://comandapraia-dona-cida.app.br';
const IS_DEV = __DEV__ || process.env.NODE_ENV === 'development';

/**
 * Sensitive keys to redact from logs
 */
const SENSITIVE_KEYS = [
  'password',
  'passwd',
  'pwd',
  'token',
  'auth',
  'bearer',
  'secret',
  'apikey',
  'api_key',
  'api-key',
  'access_token',
  'refresh_token',
  'session',
  'cookie',
  'credentials',
  'credential',
  'email',
  'phone',
  'cpf',
  'cnpj',
  'credit_card',
  'creditcard',
  'card_number',
  'cvv',
  'cvc',
  'expiry',
  'supabase',
  'mercadopago',
  'stripe',
  'private',
  'secret_key',
  'service_role',
  'webhook',
];

/**
 * Redact sensitive values from objects
 */
function redactValue(value: any, depth = 0): any {
  if (depth > 10) return '[TOO_DEEP]';

  if (typeof value === 'string') {
    // Detect and redact common patterns:
    // - Email: name@domain.com → n***@domain.com
    // - JWT: eyJ...abc → [JWT_REDACTED]
    // - Bearer tokens: Bearer abc... → Bearer [REDACTED]
    // - Hex tokens: a1b2c3d4... → [TOKEN_REDACTED]

    if (value.includes('@')) {
      // Email pattern
      try {
        const [name, domain] = value.split('@');
        return name[0] + '***@' + domain;
      } catch {
        return '[EMAIL_REDACTED]';
      }
    }
    if (value.startsWith('eyJ')) {
      return '[JWT_REDACTED]';
    }
    if (value.startsWith('Bearer ')) {
      return 'Bearer [REDACTED]';
    }
    if (value.length > 20 && /^[a-f0-9]{20,}$/i.test(value)) {
      return '[TOKEN_REDACTED]';
    }
    return value;
  }

  if (typeof value === 'object' && value !== null) {
    if (Array.isArray(value)) {
      return value.map((item) => redactValue(item, depth + 1));
    }
    const redacted: any = {};
    for (const [key, val] of Object.entries(value)) {
      const lowerKey = String(key).toLowerCase();
      if (SENSITIVE_KEYS.some((k) => lowerKey.includes(k))) {
        redacted[key] = '[REDACTED]';
      } else {
        redacted[key] = redactValue(val, depth + 1);
      }
    }
    return redacted;
  }

  return value;
}

/**
 * Initialize Sentry with security configuration
 */
export function initSentry() {
  if (!SENTRY_DSN) {
    console.warn('[Sentry] DSN not configured, Sentry is disabled');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    debug: IS_DEV,
    enabled: !IS_DEV, // Disable in development to avoid noise
    tracesSampleRate: IS_DEV ? 0.1 : 0.5,
    environment: IS_DEV ? 'development' : 'production',
    
    // ✅ SECURITY: Data scrubbing in beforeSend
    beforeSend(event, hint) {
      // Remove sensitive data from event
      if (event.extra) {
        event.extra = redactValue(event.extra);
      }
      if (event.contexts) {
        event.contexts = redactValue(event.contexts);
      }
      if (event.tags) {
        event.tags = redactValue(event.tags);
      }
      if (event.request) {
        // Redact URL query params
        if (event.request.url) {
          try {
            const url = new URL(event.request.url);
            for (const [key, value] of url.searchParams.entries()) {
              if (SENSITIVE_KEYS.some((k) => key.toLowerCase().includes(k))) {
                url.searchParams.set(key, '[REDACTED]');
              }
            }
            event.request.url = url.toString();
          } catch {
            // Ignore URL parsing errors
          }
        }
        // Redact headers
        if (event.request.headers) {
          const redactedHeaders: Record<string, string> = {};
          for (const [key, value] of Object.entries(event.request.headers)) {
            if (SENSITIVE_KEYS.some((k) => key.toLowerCase().includes(k))) {
              redactedHeaders[key] = '[REDACTED]';
            } else {
              redactedHeaders[key] = String(value);
            }
          }
          event.request.headers = redactedHeaders;
        }
      }

      // Remove PII from user context
      if (event.user) {
        const { email, ...safeUser } = event.user;
        event.user = safeUser;
      }

      // Redact breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => ({
          ...breadcrumb,
          data: redactValue(breadcrumb.data),
        }));
      }

      return event;
    },

    // ✅ SECURITY: URL allowlist to prevent domain-specific data
    allowUrls: [
      /comandapraia-dona-cida/,
      /exp\+comandapraia/,
      /restaurante-app/,
      /react-native/,
    ],
  });

  console.log('[Sentry] Initialized with', {
    dsn: SENTRY_DSN.substring(0, 20) + '...',
    environment: IS_DEV ? 'development' : 'production',
    enabled: !IS_DEV,
  });
}

/**
 * Manually scrub data before sending to Sentry
 * Can be called by LoggerService or other places
 */
export function scrubData(data: any): any {
  return redactValue(data);
}
