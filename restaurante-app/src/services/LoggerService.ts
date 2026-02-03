/**
 * LoggerService.ts
 * Service for centralized logging and error reporting with Sentry
 * 
 * Requirements: 22.1, 22.2
 */

import * as Sentry from '@sentry/react-native';

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

    Sentry.captureException(errorObj, {
      tags: { context } as SentryTags,
      extra,
    });
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
