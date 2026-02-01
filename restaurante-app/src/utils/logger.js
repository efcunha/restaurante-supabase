/**
 * src/utils/logger.js
 * Sistema centralizado de logging com Firebase Analytics
 */

import { Platform } from 'react-native';

let analyticsInstance = null;
let logEventFn = () => {};

// Firebase Analytics não é suportado em apps nativos via firebase/analytics.
// Limitamos o uso ao ambiente web e evitamos crashes no Android/iOS.
if (Platform.OS === 'web') {
  try {
    const { getAnalytics, logEvent } = require('firebase/analytics');
    const app = require('../config/firebaseConfig').default;
    analyticsInstance = getAnalytics(app);
    logEventFn = logEvent;
  } catch (error) {
    // Ignora falha de inicialização; logs continuam no console.
  }
}

// Níveis de log
export const LOG_LEVEL = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  CRITICAL: 'critical'
};

// Categorias de eventos (mantido para uso futuro)
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
};

class Logger {
  constructor() {
    this.isDev = __DEV__ || process.env.NODE_ENV === 'development';
    this.isProduction = !this.isDev;
  }

  _getTimestamp() {
    return new Date().toISOString();
  }

  _formatMessage(level, message, data = {}) {
    const levelEmoji = {
      [LOG_LEVEL.DEBUG]: '🔍',
      [LOG_LEVEL.INFO]: 'ℹ️',
      [LOG_LEVEL.WARN]: '⚠️',
      [LOG_LEVEL.ERROR]: '❌',
      [LOG_LEVEL.CRITICAL]: '🚨'
    }[level] || '📝';

    const timestamp = this._getTimestamp();
    const dataStr = Object.keys(data).length > 0 ? JSON.stringify(data) : '';
    return `${levelEmoji} [${timestamp}] ${level.toUpperCase()}: ${message} ${dataStr}`;
  }

  debug(message, data = {}) {
    if (this.isDev) {
      console.log(this._formatMessage(LOG_LEVEL.DEBUG, message, data));
    }
  }

  info(message, data = {}) {
    console.log(this._formatMessage(LOG_LEVEL.INFO, message, data));

    if (this.isProduction && analyticsInstance) {
      this._sendToAnalytics('app_info', message, data);
    }
  }

  warn(message, data = {}) {
    console.warn(this._formatMessage(LOG_LEVEL.WARN, message, data));

    if (this.isProduction && analyticsInstance) {
      this._sendToAnalytics('app_warning', message, data);
    }
  }

  error(message, error, context = {}) {
    const errorData = {
      message: error?.message || String(error),
      stack: error?.stack || '',
      ...context
    };

    console.error(this._formatMessage(LOG_LEVEL.ERROR, message, errorData));

    if (this.isProduction && analyticsInstance) {
      this._sendToAnalytics('app_error', message, {
        errorMessage: error?.message,
        errorType: error?.name,
        ...context
      });
    }
  }

  critical(message, data = {}) {
    console.error(this._formatMessage(LOG_LEVEL.CRITICAL, message, data));

    if (this.isProduction && analyticsInstance) {
      this._sendToAnalytics('app_critical', message, data);
    }
  }

  // Envia evento para Firebase Analytics
  _sendToAnalytics(eventName, message, data) {
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
  _sanitizeData(data) {
    if (!data || typeof data !== 'object') return {};

    const sanitized = { ...data };
    delete sanitized.password;
    delete sanitized.token;
    delete sanitized.authToken;
    delete sanitized.uid;
    delete sanitized.email;
    delete sanitized.cpf;

    Object.keys(sanitized).forEach(key => {
      if (typeof sanitized[key] === 'string' && sanitized[key].length > 200) {
        sanitized[key] = `${sanitized[key].substring(0, 200)}...`;
      }
    });

    return sanitized;
  }

  userAction(user, action, details = {}) {
    const data = {
      userId: user?.uid?.substring(0, 8) || 'unknown',
      userRole: user?.funcao || 'unknown',
      action,
      ...this._sanitizeData(details),
      timestamp: this._getTimestamp()
    };

    if (this.isDev) {
      console.log(this._formatMessage(LOG_LEVEL.INFO, `[USER ACTION] ${action}`, data));
    }

    if (this.isProduction && analyticsInstance) {
      logEventFn(analyticsInstance, 'user_action', data);
    }
  }

  dbOperation(operation, collection, details = {}) {
    const data = {
      operation,
      collection,
      docCount: details.count || 0,
      durationMs: details.duration || 0,
      status: details.status || 'unknown'
    };

    this.debug(`DB: ${operation.toUpperCase()} on ${collection}`, data);

    if (details.duration > 1000) {
      this.warn(`Slow DB query: ${operation} on ${collection} took ${details.duration}ms`);
    }

    if (this.isProduction && analyticsInstance && details.duration > 500) {
      logEventFn(analyticsInstance, 'db_slow_query', data);
    }
  }

  performance(operation, durationMs, metadata = {}) {
    const data = { operation, durationMs, ...metadata };

    if (this.isDev) {
      console.log(this._formatMessage(LOG_LEVEL.DEBUG, `[PERF] ${operation}: ${durationMs}ms`, data));
    }

    if (this.isProduction && analyticsInstance && durationMs > 1000) {
      logEventFn(analyticsInstance, 'performance_slow', data);
    }
  }

  security(type, data = {}) {
    const sanitized = this._sanitizeData(data);
    console.error(this._formatMessage(LOG_LEVEL.CRITICAL, `[SECURITY] ${type}`, sanitized));

    if (this.isProduction && analyticsInstance) {
      logEventFn(analyticsInstance, 'security_event', { type, ...sanitized });
    }
  }

  unhandledError(error, context = '') {
    this.error(`Unhandled Exception: ${context}`, error);

    if (this.isProduction && analyticsInstance) {
      logEventFn(analyticsInstance, 'crash', {
        message: error?.message,
        stack: error?.stack?.substring(0, 500),
        context
      });
    }
  }

  startPerformanceTimer(label) {
    const start = performance.now();

    return () => {
      const duration = performance.now() - start;
      this.performance(label, Math.round(duration));
      return duration;
    };
  }
}

// Instância global única
const logger = new Logger();

// Integração com ErrorBoundary/global handler
export const setupGlobalErrorHandler = () => {
  if (global.__exceptionHandler) {
    const originalHandler = global.__exceptionHandler;
    global.__exceptionHandler = (error, isFatal) => {
      logger.unhandledError(error, isFatal ? 'fatal' : 'non-fatal');
      originalHandler(error, isFatal);
    };
  }
};

export default logger;
