/**
 * Retry Service - Retry Logic with Idempotency
 * 
 * Implementa retry logic com:
 * - Exponential backoff (1s, 2s, 4s)
 * - Classificação de erros (retryable vs non-retryable)
 * - Logging de falhas após max retries
 * - Idempotency keys para prevenir duplicação
 * - Integração com offline queue
 * 
 * Requirements: 16.1, 16.2, 16.3, 16.4, 16.5
 */

import {
  isRetryableError,
  classifyError,
  NetworkError,
  TimeoutError,
  DatabaseError
} from '../utils/errors';

/**
 * Configuração de retry
 */
interface RetryConfig {
  maxRetries: number;
  initialBackoffMs: number;
  maxBackoffMs: number;
  backoffMultiplier: number;
  enableLogging: boolean;
}

/**
 * Opções de retry para operação
 */
interface RetryOptions {
  maxRetries?: number;
  idempotencyKey?: string;
  context?: Record<string, any>;
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Resultado de operação com retry
 */
interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
  totalDuration: number;
}

/**
 * Registro de operação idempotente
 */
interface IdempotentOperation {
  key: string;
  result: any;
  timestamp: number;
  expiresAt: number;
}

/**
 * Retry Service
 */
class RetryService {
  private config: RetryConfig = {
    maxRetries: 3,
    initialBackoffMs: 1000, // 1 segundo
    maxBackoffMs: 16000, // 16 segundos
    backoffMultiplier: 2,
    enableLogging: true
  };

  // Cache de operações idempotentes (em memória)
  private idempotentCache: Map<string, IdempotentOperation> = new Map();
  private readonly IDEMPOTENCY_TTL = 24 * 60 * 60 * 1000; // 24 horas

  /**
   * Executa operação com retry e exponential backoff
   */
  async withRetry<T>(
    operation: () => Promise<T>,
    options?: RetryOptions
  ): Promise<T> {
    const maxRetries = options?.maxRetries ?? this.config.maxRetries;
    const idempotencyKey = options?.idempotencyKey;
    const startTime = Date.now();

    // Verifica idempotency cache
    if (idempotencyKey) {
      const cached = this.getIdempotentResult<T>(idempotencyKey);
      if (cached !== null) {
        if (this.config.enableLogging) {
          console.log('[RetryService] Returning cached idempotent result', {
            idempotencyKey
          });
        }
        return cached;
      }
    }

    let lastError: Error | null = null;
    let attempt = 0;

    while (attempt <= maxRetries) {
      try {
        const result = await operation();

        // Armazena resultado idempotente
        if (idempotencyKey) {
          this.storeIdempotentResult(idempotencyKey, result);
        }

        // Log sucesso após retry
        if (attempt > 0 && this.config.enableLogging) {
          console.log('[RetryService] Operation succeeded after retries', {
            attempt,
            duration: Date.now() - startTime,
            idempotencyKey,
            context: options?.context
          });
        }

        return result;
      } catch (error) {
        lastError = error as Error;
        const appError = classifyError(error);

        // Não retry se erro não é retryable
        if (!this.isRetryable(appError)) {
          if (this.config.enableLogging) {
            console.error('[RetryService] Non-retryable error, aborting', {
              error: appError.toJSON(),
              attempt,
              context: options?.context
            });
          }
          throw appError;
        }

        // Não retry se atingiu máximo
        if (attempt === maxRetries) {
          break;
        }

        // Calcula delay com exponential backoff
        const delay = this.calculateBackoff(attempt);

        if (this.config.enableLogging) {
          console.warn('[RetryService] Retrying after error', {
            error: appError.message,
            attempt: attempt + 1,
            maxRetries,
            delayMs: delay,
            context: options?.context
          });
        }

        // Callback de retry
        if (options?.onRetry) {
          options.onRetry(attempt + 1, appError);
        }

        // Aguarda antes de retry
        await this.sleep(delay);

        attempt++;
      }
    }

    // Log falha após todos os retries
    const duration = Date.now() - startTime;
    if (this.config.enableLogging) {
      console.error('[RetryService] Operation failed after max retries', {
        error: lastError?.message,
        stack: lastError?.stack,
        attempts: attempt + 1,
        maxRetries,
        duration,
        idempotencyKey,
        context: options?.context
      });
    }

    throw lastError || new Error('Operation failed after max retries');
  }

  /**
   * Verifica se erro é retryable
   */
  private isRetryable(error: Error): boolean {
    // Usa função de classificação do sistema de erros
    if (isRetryableError(error)) {
      return true;
    }

    // Verifica tipos específicos de erro
    if (
      error instanceof NetworkError ||
      error instanceof TimeoutError ||
      (error instanceof DatabaseError && error.retryable)
    ) {
      return true;
    }

    // Verifica mensagens de erro conhecidas
    const message = error.message.toLowerCase();
    const retryablePatterns = [
      'network',
      'timeout',
      'econnrefused',
      'enotfound',
      'etimedout',
      'unavailable',
      'deadline-exceeded',
      'resource-exhausted',
      'aborted',
      'internal'
    ];

    return retryablePatterns.some(pattern => message.includes(pattern));
  }

  /**
   * Calcula delay com exponential backoff
   */
  private calculateBackoff(attempt: number): number {
    const exponentialDelay =
      this.config.initialBackoffMs * Math.pow(this.config.backoffMultiplier, attempt);

    // Adiciona jitter (±25%) para evitar thundering herd
    const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1);
    const delayWithJitter = exponentialDelay + jitter;

    // Limita ao máximo configurado
    return Math.min(delayWithJitter, this.config.maxBackoffMs);
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Armazena resultado de operação idempotente
   */
  private storeIdempotentResult<T>(key: string, result: T): void {
    const now = Date.now();
    const operation: IdempotentOperation = {
      key,
      result,
      timestamp: now,
      expiresAt: now + this.IDEMPOTENCY_TTL
    };

    this.idempotentCache.set(key, operation);

    // Limpa cache expirado periodicamente
    this.cleanupExpiredCache();
  }

  /**
   * Obtém resultado de operação idempotente
   */
  private getIdempotentResult<T>(key: string): T | null {
    const operation = this.idempotentCache.get(key);

    if (!operation) {
      return null;
    }

    // Verifica se expirou
    if (Date.now() > operation.expiresAt) {
      this.idempotentCache.delete(key);
      return null;
    }

    return operation.result as T;
  }

  /**
   * Limpa entradas expiradas do cache
   */
  private cleanupExpiredCache(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.idempotentCache.forEach((operation, key) => {
      if (now > operation.expiresAt) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.idempotentCache.delete(key));
  }

  /**
   * Gera idempotency key única
   */
  generateIdempotencyKey(operation: string, params: Record<string, any>): string {
    const paramsStr = JSON.stringify(params, Object.keys(params).sort());
    const timestamp = Date.now();
    return `${operation}:${paramsStr}:${timestamp}`;
  }

  /**
   * Limpa cache de idempotência
   */
  clearIdempotencyCache(): void {
    this.idempotentCache.clear();
  }

  /**
   * Obtém estatísticas do cache de idempotência
   */
  getIdempotencyCacheStats() {
    const now = Date.now();
    let activeCount = 0;
    let expiredCount = 0;

    this.idempotentCache.forEach(operation => {
      if (now > operation.expiresAt) {
        expiredCount++;
      } else {
        activeCount++;
      }
    });

    return {
      total: this.idempotentCache.size,
      active: activeCount,
      expired: expiredCount
    };
  }

  /**
   * Configura parâmetros do retry service
   */
  configure(config: Partial<RetryConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// Singleton instance
export const retryService = new RetryService();

// Export para testes
export { RetryService };
export type { RetryConfig, RetryOptions, RetryResult, IdempotentOperation };
