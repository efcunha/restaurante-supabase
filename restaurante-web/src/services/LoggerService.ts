/**
 * LoggerService.ts
 * Service for centralized logging and error reporting with Sentry
 * 
 * Requirements: 22.1, 22.2
 */

import * as Sentry from '@sentry/react';

// ============================================================================
// TYPES
// ============================================================================

type LogLevel = 'info' | 'warning' | 'error' | 'debug' | 'fatal';

interface LogContext {
  [key: string]: any;
}

interface SentryTags {
  context?: string;
  [key: string]: string | undefined;
}

interface SentryExtra {
  [key: string]: any;
}

// ============================================================================
// LOGGER SERVICE CLASS
// ============================================================================

/**
 * Service for centralized logging and error reporting.
 */
class LoggerService {
  /**
   * Log an error to Sentry and Console
   */
  logError(error: Error | string, context: string = '', extra: SentryExtra = {}): void {
    if (__DEV__) {
      console.error(`[${context}]`, error, extra);
    }

    const errorObj = typeof error === 'string' ? new Error(error) : error;
    const scrubbedExtra = this.scrubData(extra);

    Sentry.captureException(errorObj, {
      tags: { context } as SentryTags,
      extra: scrubbedExtra,
    });
  }

  /**
   * Scrub sensitive data from logs
   */
  private scrubData(data: any): any {
    if (!data) return data;
    
    // Deep copy to avoid mutating original data
    try {
      const sensitiveKeys = ['password', 'token', 'secret', 'auth', 'key', 'credit_card', 'cvv', 'card_number'];
      const str = JSON.stringify(data);
      const parsed = JSON.parse(str);

      const redact = (obj: any) => {
        if (typeof obj !== 'object' || obj === null) return;
        
        Object.keys(obj).forEach(key => {
          const lowerKey = key.toLowerCase();
          if (sensitiveKeys.some(k => lowerKey.includes(k))) {
            obj[key] = '[REDACTED]';
          } else if (typeof obj[key] === 'object') {
            redact(obj[key]);
          }
        });
      };

      redact(parsed);
      return parsed;

    } catch {
      return data; // Return original if parsing fails
    }
  }

  /**
   * Log a message (breadcrumbs in Sentry)
   */
  log(message: string, level: LogLevel = 'info'): void {
    if (__DEV__) {
      console.log(`[${level.toUpperCase()}] ${message}`);
    }

    Sentry.addBreadcrumb({
      message,
      level: level as Sentry.SeverityLevel,
    });
  }

  /**
   * Log info message
   */
  info(message: string, context?: LogContext): void {
    this.log(message, 'info');
    if (context && __DEV__) {
      console.log('[INFO]', context);
    }
  }

  /**
   * Backward-compatible info logger used by older screens.
   */
  logInfo(message: string, context: string = '', extra: SentryExtra = {}): void {
    this.log(message, 'info');

    if (__DEV__) {
      console.log(`[${context || 'INFO'}]`, message, extra);
    }

    Sentry.addBreadcrumb({
      message,
      level: 'info',
      category: context || 'app',
      data: this.scrubData(extra),
    });
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: LogContext): void {
    this.log(message, 'warning');
    if (context && __DEV__) {
      console.warn('[WARN]', context);
    }
  }

  /**
   * Log debug message (only in development)
   */
  debug(message: string, context?: LogContext): void {
    if (__DEV__) {
      console.log('[DEBUG]', message, context);
    }
  }

  /**
   * Set user context for Sentry
   */
  setUser(userId: string, email?: string, username?: string): void {
    Sentry.setUser({
      id: userId,
      email,
      username,
    });
  }

  /**
   * Clear user context
   */
  clearUser(): void {
    Sentry.setUser(null);
  }

  /**
   * Add custom context to Sentry
   */
  setContext(key: string, context: LogContext): void {
    Sentry.setContext(key, context);
  }

  /**
   * Add tag to Sentry
   */
  setTag(key: string, value: string): void {
    Sentry.setTag(key, value);
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export default new LoggerService();
