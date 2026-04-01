/**
 * Offline Queue Service
 * 
 * Gerencia fila de operações offline para sincronização quando conexão for restaurada:
 * - Enfileira operações quando offline
 * - Processa fila automaticamente quando online
 * - Persistência em AsyncStorage
 * - Retry com exponential backoff
 * - Deduplicação com idempotency keys
 * 
 * Requirements: 16.5
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { retryService } from './RetryService';
import { isRetryableError, classifyError } from '../utils/errors';
import logger from '../utils/logger';

/**
 * Operação enfileirada
 */
interface QueuedOperation {
  id: string;
  type: string;
  operation: () => Promise<any>;
  idempotencyKey: string;
  payload: any;
  timestamp: number;
  attempts: number;
  lastAttempt?: number;
  error?: string;
}

/**
 * Operação serializada (para persistência)
 */
interface SerializedOperation {
  id: string;
  type: string;
  idempotencyKey: string;
  payload: any;
  timestamp: number;
  attempts: number;
  lastAttempt?: number;
  error?: string;
}

/**
 * Estatísticas da fila
 */
interface QueueStats {
  total: number;
  pending: number;
  processing: number;
  failed: number;
  oldestTimestamp?: number;
}

/**
 * Configuração da fila
 */
interface QueueConfig {
  maxQueueSize: number;
  maxRetries: number;
  processingInterval: number;
  persistenceKey: string;
  enableAutoProcess: boolean;
}

type OperationHandler = (payload: any) => Promise<any>;

/**
 * Offline Queue Service
 */
class OfflineQueueService {
  private queue: QueuedOperation[] = [];
  private deferredOperations: SerializedOperation[] = [];
  private processing = false;
  private isOnline = true;
  private unsubscribeNetInfo?: () => void;
  private operationHandlers = new Map<string, OperationHandler>();

  private config: QueueConfig = {
    maxQueueSize: 100,
    maxRetries: 5,
    processingInterval: 5000, // 5 segundos
    persistenceKey: '@offline_queue',
    enableAutoProcess: true
  };

  /**
   * Inicializa o serviço
   */
  async initialize(): Promise<void> {
    // Carrega fila persistida
    await this.loadQueue();

    // Monitora status de conexão
    this.unsubscribeNetInfo = NetInfo.addEventListener(this.handleConnectivityChange);

    // Verifica status inicial
    const state = await NetInfo.fetch();
    this.isOnline = state.isConnected ?? false;

    // Inicia processamento automático se online
    if (this.isOnline && this.config.enableAutoProcess) {
      this.startAutoProcessing();
    }

    logger.debug('[OfflineQueue] Initialized', {
      queueSize: this.queue.length,
      isOnline: this.isOnline
    });
  }

  /**
   * Finaliza o serviço
   */
  async shutdown(): Promise<void> {
    // Para monitoramento de conexão
    if (this.unsubscribeNetInfo) {
      this.unsubscribeNetInfo();
    }

    // Persiste fila
    await this.persistQueue();

    logger.debug('[OfflineQueue] Shutdown complete');
  }

  /**
   * Enfileira operação
   */
  async enqueue(
    type: string,
    operation: () => Promise<any>,
    payload: any,
    idempotencyKey?: string
  ): Promise<string> {
    // Verifica limite da fila
    if (this.queue.length >= this.config.maxQueueSize) {
      throw new Error('Queue is full. Cannot enqueue more operations.');
    }

    // Gera ID único
    const id = this.generateOperationId();

    // Gera idempotency key se não fornecida
    const effectiveKey =
      idempotencyKey || retryService.generateIdempotencyKey(type, payload);

    // Verifica duplicação
    const existing = this.queue.find(op => op.idempotencyKey === effectiveKey)
      || this.deferredOperations.find(op => op.idempotencyKey === effectiveKey);
    if (existing) {
      logger.debug('[OfflineQueue] Operation already queued', {
        type,
        idempotencyKey: effectiveKey
      });
      return existing.id;
    }

    const queuedOp: QueuedOperation = {
      id,
      type,
      operation,
      idempotencyKey: effectiveKey,
      payload,
      timestamp: Date.now(),
      attempts: 0
    };

    this.queue.push(queuedOp);

    // Persiste fila
    await this.persistQueue();

    logger.debug('[OfflineQueue] Operation enqueued', {
      id,
      type,
      queueSize: this.queue.length
    });

    // Tenta processar imediatamente se online
    if (this.isOnline && !this.processing) {
      this.processQueue();
    }

    return id;
  }

  registerOperationHandler(type: string, handler: OperationHandler): void {
    this.operationHandlers.set(type, handler);

    const restorable = this.deferredOperations.filter(op => op.type === type);
    if (restorable.length === 0) {
      return;
    }

    this.deferredOperations = this.deferredOperations.filter(op => op.type !== type);
    restorable.forEach(op => {
      this.queue.push(this.createQueuedOperation(op, handler));
    });

    void this.persistQueue();

    if (this.isOnline && !this.processing && this.queue.length > 0) {
      void this.processQueue();
    }
  }

  /**
   * Processa fila de operações
   */
  async processQueue(): Promise<void> {
    if (this.processing) {
      return;
    }

    if (!this.isOnline) {
      logger.debug('[OfflineQueue] Cannot process queue while offline');
      return;
    }

    if (this.queue.length === 0) {
      return;
    }

    this.processing = true;

    logger.debug('[OfflineQueue] Processing queue', {
      queueSize: this.queue.length
    });

    // Processa operações sequencialmente
    while (this.queue.length > 0 && this.isOnline) {
      const operation = this.queue[0];

      try {
        // Verifica se excedeu max retries
        if (operation.attempts >= this.config.maxRetries) {
          console.error('[OfflineQueue] Operation exceeded max retries', {
            id: operation.id,
            type: operation.type,
            attempts: operation.attempts
          });

          // Remove da fila
          this.queue.shift();
          await this.persistQueue();
          continue;
        }

        // Incrementa tentativas
        operation.attempts++;
        operation.lastAttempt = Date.now();

        // Executa operação com retry
        await retryService.withRetry(operation.operation, {
          maxRetries: 2, // Retry interno adicional
          idempotencyKey: operation.idempotencyKey,
          context: {
            queuedOperationId: operation.id,
            type: operation.type
          }
        });

        logger.debug('[OfflineQueue] Operation succeeded', {
          id: operation.id,
          type: operation.type,
          attempts: operation.attempts
        });

        // Remove da fila após sucesso
        this.queue.shift();
        await this.persistQueue();
      } catch (error) {
        const appError = classifyError(error);

        console.error('[OfflineQueue] Operation failed', {
          id: operation.id,
          type: operation.type,
          error: appError.message,
          attempts: operation.attempts
        });

        // Armazena erro
        operation.error = appError.message;

        // Se erro não é retryable, remove da fila
        if (!isRetryableError(appError)) {
          console.error('[OfflineQueue] Non-retryable error, removing from queue', {
            id: operation.id,
            type: operation.type
          });

          this.queue.shift();
          await this.persistQueue();
        } else {
          // Mantém na fila para próxima tentativa
          await this.persistQueue();
          break;
        }
      }
    }

    this.processing = false;

    logger.debug('[OfflineQueue] Queue processing complete', {
      remainingOperations: this.queue.length
    });
  }

  /**
   * Manipula mudança de conectividade
   */
  private handleConnectivityChange = (state: NetInfoState): void => {
    const wasOnline = this.isOnline;
    this.isOnline = state.isConnected ?? false;

    logger.debug('[OfflineQueue] Connectivity changed', {
      isOnline: this.isOnline,
      wasOnline
    });

    // Se voltou online, processa fila
    if (this.isOnline && !wasOnline && this.queue.length > 0) {
      logger.debug('[OfflineQueue] Connection restored, processing queue');
      this.processQueue();
    }
  };

  /**
   * Inicia processamento automático periódico
   */
  private startAutoProcessing(): void {
    setInterval(() => {
      if (this.isOnline && !this.processing && this.queue.length > 0) {
        this.processQueue();
      }
    }, this.config.processingInterval);
  }

  /**
   * Persiste fila em AsyncStorage
   */
  private async persistQueue(): Promise<void> {
    try {
      // Serializa operações (remove funções)
      const serializedQueue: SerializedOperation[] = this.queue.map(op => ({
        id: op.id,
        type: op.type,
        idempotencyKey: op.idempotencyKey,
        payload: op.payload,
        timestamp: op.timestamp,
        attempts: op.attempts,
        lastAttempt: op.lastAttempt,
        error: op.error
      }));

      const serialized: SerializedOperation[] = [
        ...serializedQueue,
        ...this.deferredOperations,
      ];

      await AsyncStorage.setItem(this.config.persistenceKey, JSON.stringify(serialized));
    } catch (error) {
      console.error('[OfflineQueue] Error persisting queue:', error);
    }
  }

  /**
   * Carrega fila de AsyncStorage
   */
  private async loadQueue(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.config.persistenceKey);

      if (!stored) {
        return;
      }

      const serialized: SerializedOperation[] = JSON.parse(stored);

      serialized.forEach(operation => {
        const handler = this.operationHandlers.get(operation.type);
        if (handler) {
          this.queue.push(this.createQueuedOperation(operation, handler));
        } else {
          this.deferredOperations.push(operation);
        }
      });

      if (this.deferredOperations.length > 0) {
        console.warn('[OfflineQueue] Found persisted operations but cannot restore functions', {
          count: this.deferredOperations.length
        });
      }
    } catch (error) {
      console.error('[OfflineQueue] Error loading queue:', error);
    }
  }

  private createQueuedOperation(
    serializedOperation: SerializedOperation,
    handler: OperationHandler
  ): QueuedOperation {
    return {
      ...serializedOperation,
      operation: () => handler(serializedOperation.payload),
    };
  }

  /**
   * Gera ID único para operação
   */
  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Obtém estatísticas da fila
   */
  getStats(): QueueStats {
    const allOperations = [...this.queue, ...this.deferredOperations];
    const failed = allOperations.filter(
      op => op.attempts >= this.config.maxRetries
    ).length;

    const oldestOp = allOperations.length > 0 ? allOperations[0] : null;

    return {
      total: allOperations.length,
      pending: allOperations.length - failed,
      processing: this.processing ? 1 : 0,
      failed,
      oldestTimestamp: oldestOp?.timestamp
    };
  }

  /**
   * Obtém operações da fila
   */
  getOperations(): SerializedOperation[] {
    const serializedQueue = this.queue.map(op => ({
      id: op.id,
      type: op.type,
      idempotencyKey: op.idempotencyKey,
      payload: op.payload,
      timestamp: op.timestamp,
      attempts: op.attempts,
      lastAttempt: op.lastAttempt,
      error: op.error
    }));

    return [...serializedQueue, ...this.deferredOperations];
  }

  /**
   * Limpa fila
   */
  async clearQueue(): Promise<void> {
    this.queue = [];
    this.deferredOperations = [];
    await AsyncStorage.removeItem(this.config.persistenceKey);
    logger.debug('[OfflineQueue] Queue cleared');
  }

  /**
   * Remove operação específica
   */
  async removeOperation(id: string): Promise<boolean> {
    const index = this.queue.findIndex(op => op.id === id);

    if (index >= 0) {
      this.queue.splice(index, 1);
      await this.persistQueue();

      logger.debug('[OfflineQueue] Operation removed', { id });
      return true;
    }

    const deferredIndex = this.deferredOperations.findIndex(op => op.id === id);
    if (deferredIndex === -1) {
      return false;
    }

    this.deferredOperations.splice(deferredIndex, 1);
    await this.persistQueue();

    logger.debug('[OfflineQueue] Operation removed', { id });
    return true;
  }

  /**
   * Verifica se está online
   */
  getIsOnline(): boolean {
    return this.isOnline;
  }

  /**
   * Configura parâmetros da fila
   */
  configure(config: Partial<QueueConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// Singleton instance
export const offlineQueueService = new OfflineQueueService();

// Default export para compatibilidade
export default offlineQueueService;

// Export para testes
export { OfflineQueueService };
export type { QueuedOperation, SerializedOperation, QueueStats, QueueConfig, OperationHandler };
