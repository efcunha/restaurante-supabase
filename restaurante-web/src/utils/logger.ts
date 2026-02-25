/**
 * src/utils/logger.ts
 * Sistema centralizado de logging com Firebase Analytics
 * 
 * Requirements: 22.1, 22.2
 */

import { Platform } from 'react-native';

// ============================================================================
// TYPES
// ============================================================================

export const LOG_LEVEL = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  CRITICAL: 'critical'
} as const;

export type LogLevel = typeof LOG_LEVEL[keyof typeof LOG_LEVEL];

export const LOG_CATEGORY = {
  AUTH: 'auth',
  ORDER: 'order',
  PAYMENT: 'payment',
  COMANDA: 'comanda',
  MENU: 'menu',
  USER: 'user',
  SYSTEM: 'system',
  PERFORMANCE: 'performance',
  SECURITY: 'security'
} as const;

export type LogCategory = typeof LOG_CATEGORY[keyof typeof LOG_CATEGORY];

interface LogData {
  [key: string]: string | number | boolean | undefined;
}

interface ErrorWithStack extends Error {
  stack?: string;
}

interface User {
  uid?: string;
  funcao?: string;
}

interface DBOperationDetails {
  count?: number;
  duration?: number;
  status?: string;
}

interface PerformanceMetadata {
  [key: string]: string | number | boolean;
}

// ============================================================================
// ANALYTICS INITIALIZATION
// ============================================================================

// Analytics placeholder for future implementation (e.g. Supabase Analytics or custom)
// Currently logging only to console


// ============================================================================
// LOGGER CLASS
// ============================================================================

class Logger {
  private isDev: boolean;
  private isProduction: boolean;

  constructor() {
    this.isDev = __DEV__ || process.env.NODE_ENV === 'development';
    this.isProduction = !this.isDev;
  }

  private _getTimestamp(): string {
    return new Date().toISOString();
  }

  private _formatMessage(level: LogLevel, message: string, data: LogData = {}): string {
    const levelEmoji: Record<LogLevel, string> = {
      [LOG_LEVEL.DEBUG]: '🔍',
      [LOG_LEVEL.INFO]: 'ℹ️',
      [LOG_LEVEL.WARN]: '⚠️',
      [LOG_LEVEL.ERROR]: '❌',
      [LOG_LEVEL.CRITICAL]: '🚨'
    };

    const emoji = levelEmoji[level] || '📝';
    const timestamp = this._getTimestamp();
    const dataStr = Object.keys(data).length > 0 ? JSON.stringify(data) : '';
    return `${emoji} [${timestamp}] ${level.toUpperCase()}: ${message} ${dataStr}`;
  }

  debug(message: string, data: LogData = {}): void {
    if (this.isDev) {
      console.log(this._formatMessage(LOG_LEVEL.DEBUG, message, data));
    }
  }

  info(message: string, data: LogData = {}): void {
    console.log(this._formatMessage(LOG_LEVEL.INFO, message, data));

    if (this.isProduction && analyticsInstance && logEventFn) {
      this._sendToAnalytics('app_info', message, data);
    }
  }

  warn(message: string, data: LogData = {}): void {
    console.warn(this._formatMessage(LOG_LEVEL.WARN, message, data));

    if (this.isProduction && analyticsInstance && logEventFn) {
      this._sendToAnalytics('app_warning', message, data);
    }
  }

  error(message: string, error: ErrorWithStack | unknown, context: LogData = {}): void {
    const err = error as ErrorWithStack;
    const errorData: LogData = {
      message: err?.message || String(error),
      stack: err?.stack || '',
      ...context
    };

    console.error(this._formatMessage(LOG_LEVEL.ERROR, message, errorData));

    if (this.isProduction && analyticsInstance && logEventFn) {
      this._sendToAnalytics('app_error', message, {
        errorMessage: err?.message,
        errorType: err?.name,
        ...context
      });
    }
  }

  critical(message: string, data: LogData = {}): void {
    console.error(this._formatMessage(LOG_LEVEL.CRITICAL, message, data));

    if (this.isProduction && analyticsInstance && logEventFn) {
      this._sendToAnalytics('app_critical', message, data);
    }
  }

  // Envia evento para Firebase Analytics
  private _sendToAnalytics(eventName: string, message: string, data: LogData): void {
    try {
      if (analyticsInstance && logEventFn) {
        logEventFn(analyticsInstance, eventName, {
          message: (message || '').substring(0, 100),
          ...this._sanitizeData(data),
          timestamp: this._getTimestamp()
        });
      }
    } catch (e) {
      // Falha ao enviar para analytics, não interrompe app
    }
  }

  // Remove campos sensíveis e limita tamanho de strings
  private _sanitizeData(data: LogData): LogData {
    if (!data || typeof data !== 'object') return {};

    const sanitized: LogData = { ...data };
    delete sanitized.password;
    delete sanitized.token;
    delete sanitized.authToken;
    delete sanitized.uid;
    delete sanitized.email;
    delete sanitized.cpf;

    Object.keys(sanitized).forEach(key => {
      const value = sanitized[key];
      if (typeof value === 'string' && value.length > 200) {
        sanitized[key] = `${value.substring(0, 200)}...`;
      }
    });

    return sanitized;
  }

  userAction(user: User | null | undefined, action: string, details: LogData = {}): void {
    const data: LogData = {
      userId: user?.uid?.substring(0, 8) || 'unknown',
      userRole: user?.funcao || 'unknown',
      action,
      ...this._sanitizeData(details),
      timestamp: this._getTimestamp()
    };

    if (this.isDev) {
      console.log(this._formatMessage(LOG_LEVEL.INFO, `[USER ACTION] ${action}`, data));
    }

    if (this.isProduction && analyticsInstance && logEventFn) {
      logEventFn(analyticsInstance, 'user_action', data);
    }
  }

  dbOperation(operation: string, collection: string, details: DBOperationDetails = {}): void {
    const data: LogData = {
      operation,
      collection,
      docCount: details.count || 0,
      durationMs: details.duration || 0,
      status: details.status || 'unknown'
    };

    this.debug(`DB: ${operation.toUpperCase()} on ${collection}`, data);

    if (details.duration && details.duration > 1000) {
      this.warn(`Slow DB query: ${operation} on ${collection} took ${details.duration}ms`);
    }

    if (this.isProduction && analyticsInstance && logEventFn && details.duration && details.duration > 500) {
      logEventFn(analyticsInstance, 'db_slow_query', data);
    }
  }

  performance(operation: string, durationMs: number, metadata: PerformanceMetadata = {}): void {
    const data: LogData = { operation, durationMs, ...metadata };

    if (this.isDev) {
      console.log(this._formatMessage(LOG_LEVEL.DEBUG, `[PERF] ${operation}: ${durationMs}ms`, data));
    }

    if (this.isProduction && analyticsInstance && logEventFn && durationMs > 1000) {
      logEventFn(analyticsInstance, 'performance_slow', data);
    }
  }

  security(type: string, data: LogData = {}): void {
    const sanitized = this._sanitizeData(data);
    console.error(this._formatMessage(LOG_LEVEL.CRITICAL, `[SECURITY] ${type}`, sanitized));

    if (this.isProduction && analyticsInstance && logEventFn) {
      logEventFn(analyticsInstance, 'security_event', { type, ...sanitized });
    }
  }

  unhandledError(error: ErrorWithStack | unknown, context: string = ''): void {
    this.error(`Unhandled Exception: ${context}`, error);

    const err = error as ErrorWithStack;
    if (this.isProduction && analyticsInstance && logEventFn) {
      logEventFn(analyticsInstance, 'crash', {
        message: err?.message,
        stack: err?.stack?.substring(0, 500),
        context
      });
    }
  }

  startPerformanceTimer(label: string): () => number {
    const start = performance.now();

    return () => {
      const duration = performance.now() - start;
      this.performance(label, Math.round(duration));
      return duration;
    };
  }
}

// ============================================================================
// GLOBAL INSTANCE
// ============================================================================

const logger = new Logger();

// ============================================================================
// GLOBAL ERROR HANDLER
// ============================================================================

export const setupGlobalErrorHandler = (): void => {
  if (global.__exceptionHandler) {
    const originalHandler = global.__exceptionHandler;
    global.__exceptionHandler = (error: Error, isFatal: boolean) => {
      logger.unhandledError(error, isFatal ? 'fatal' : 'non-fatal');
      originalHandler(error, isFatal);
    };
  }
};

export default logger;
