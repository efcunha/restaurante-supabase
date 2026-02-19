import { Alert } from 'react-native';

/**
 * Robust Error Handling Utilities
 * Provides retry mechanisms, network error handling, and user-friendly error messages
 */

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {Object} options - Retry options
 * @returns {Promise} Result of the function or throws final error
 */
export const retryWithBackoff = async (fn, options = {}) => {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
    retryCondition = (error) => isRetryableError(error)
  } = options;

  let lastError;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry on last attempt or if error is not retryable
      if (attempt === maxRetries || !retryCondition(error)) {
        break;
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Increase delay for next attempt (exponential backoff)
      delay = Math.min(delay * backoffFactor, maxDelay);
    }
  }

  throw lastError;
};

/**
 * Determines if an error is retryable
 * @param {Error} error - Error to check
 * @returns {boolean} True if error should be retried
 */
export const isRetryableError = (error) => {
  if (!error) return false;

  // Network errors
  if (error.code === 'unavailable' || 
      error.code === 'deadline-exceeded' ||
      error.code === 'resource-exhausted') {
    return true;
  }

  // Connection errors
  if (error.message && (
      error.message.includes('network') ||
      error.message.includes('timeout') ||
      error.message.includes('connection') ||
      error.message.includes('NETWORK_ERROR') ||
      error.message.includes('fetch')
  )) {
    return true;
  }

  // Firestore specific retryable errors
  if (error.code === 'aborted' || error.code === 'internal') {
    return true;
  }

  return false;
};

/**
 * Wraps a Firestore query with robust error handling
 * @param {Function} queryFn - Function that performs the query
 * @param {Object} options - Error handling options
 * @returns {Promise} Query result or throws user-friendly error
 */
export const robustFirestoreQuery = async (queryFn, options = {}) => {
  const {
    fallbackFn = null,
    userFriendlyMessage = 'Não foi possível carregar os dados. Tente novamente.',
    maxRetries = 2
  } = options;

  try {
    return await retryWithBackoff(queryFn, { maxRetries });
  } catch (error) {
    console.error('[RobustQuery] Error after retries:', error);

    // Try fallback if provided
    if (fallbackFn) {
      try {
        console.log('[RobustQuery] Attempting fallback...');
        return await fallbackFn();
      } catch (fallbackError) {
        console.error('[RobustQuery] Fallback also failed:', fallbackError);
      }
    }

    // Throw user-friendly error
    throw new Error(userFriendlyMessage);
  }
};

/**
 * Creates a user-friendly error message based on the error type
 * @param {Error} error - Original error
 * @param {string} context - Context where error occurred
 * @returns {string} User-friendly error message
 */
export const createUserFriendlyErrorMessage = (error, context = '') => {
  if (!error) return 'Ocorreu um erro inesperado.';

  // Network connectivity issues
  if (error.code === 'unavailable' || 
      (error.message && error.message.includes('network'))) {
    return 'Problema de conexão. Verifique sua internet e tente novamente.';
  }

  // Permission issues
  if (error.code === 'permission-denied') {
    return 'Você não tem permissão para realizar esta ação.';
  }

  // Not found errors
  if (error.code === 'not-found') {
    return context ? `${context} não encontrado(a).` : 'Item não encontrado.';
  }

  // Timeout errors
  if (error.code === 'deadline-exceeded' || 
      (error.message && error.message.includes('timeout'))) {
    return 'A operação demorou muito para responder. Tente novamente.';
  }

  // Firestore index errors
  if (error.code === 'failed-precondition' || 
      (error.message && error.message.includes('index'))) {
    return 'Sistema temporariamente indisponível. Tente novamente em alguns minutos.';
  }

  // Generic fallback
  return error.message || 'Ocorreu um erro inesperado. Tente novamente.';
};

/**
 * Wraps a function with comprehensive error handling and user feedback
 * @param {Function} fn - Function to wrap
 * @param {Object} options - Error handling options
 * @returns {Function} Wrapped function
 */
export const withErrorHandling = (fn, options = {}) => {
  const {
    context = '',
    showAlert = true,
    fallbackValue = null,
    onError = null
  } = options;

  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      console.error(`[${context}] Error:`, error);

      const userMessage = createUserFriendlyErrorMessage(error, context);

      if (showAlert && typeof Alert !== 'undefined') {
        Alert.alert('Erro', userMessage);
      }

      if (onError) {
        onError(error, userMessage);
      }

      if (fallbackValue !== null) {
        return fallbackValue;
      }

      throw error;
    }
  };
};

/**
 * Validates network connectivity before performing operations
 * @returns {Promise<boolean>} True if network is available
 */
export const checkNetworkConnectivity = async () => {
  try {
    // Simple connectivity check - try to reach a reliable endpoint
    const response = await fetch('https://www.google.com/favicon.ico', {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-cache',
      timeout: 5000
    });
    return true;
  } catch (error) {
    console.warn('[NetworkCheck] No connectivity detected:', error.message);
    return false;
  }
};

/**
 * Enhanced query builder with automatic fallbacks
 * @param {Object} primaryQuery - Primary query configuration
 * @param {Array} fallbackQueries - Array of fallback query configurations
 * @returns {Promise} Query result
 */
export const queryWithFallbacks = async (primaryQuery, fallbackQueries = []) => {
  const queries = [primaryQuery, ...fallbackQueries];
  let lastError;

  for (let i = 0; i < queries.length; i++) {
    const queryConfig = queries[i];
    const isLastQuery = i === queries.length - 1;

    try {
      console.log(`[QueryFallback] Attempting query ${i + 1}/${queries.length}`);
      return await queryConfig.execute();
    } catch (error) {
      lastError = error;
      console.warn(`[QueryFallback] Query ${i + 1} failed:`, error.message);

      // If this is the last query or error is not retryable, don't continue
      if (isLastQuery || !isRetryableError(error)) {
        break;
      }
    }
  }

  throw lastError || new Error('All query attempts failed');
};
