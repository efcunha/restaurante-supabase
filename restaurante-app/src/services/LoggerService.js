import * as Sentry from '@sentry/react-native';

/**
 * Service for centralized logging and error reporting.
 */
class LoggerService {
    /**
     * Log an error to Sentry and Console
     * @param {Error|string} error - The error object or message
     * @param {string} context - Context where the error occurred
     * @param {Object} extra - Additional data
     */
    logError(error, context = '', extra = {}) {
        if (__DEV__) {
            console.error(`[${context}]`, error, extra);
        }

        Sentry.captureException(error, {
            tags: { context },
            extra,
        });
    }

    /**
     * Log a message (breadcrumbs in Sentry)
     * @param {string} message 
     * @param {string} level - 'info' | 'warning' | 'error'
     */
    log(message, level = 'info') {
        if (__DEV__) {
            console.log(`[${level.toUpperCase()}] ${message}`);
        }

        Sentry.addBreadcrumb({
            message,
            level,
        });
    }
}

export default new LoggerService();
