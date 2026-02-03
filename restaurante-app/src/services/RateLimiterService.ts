/**
 * Rate Limiter Service
 * 
 * Implementa proteção contra ataques de negação de serviço através de:
 * - Limites de operações por minuto (100 writes, 500 reads)
 * - Exponential backoff para violações repetidas
 * - Tracking de padrões suspeitos
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

import { db } from '../config/firebaseConfig';
import { doc, getDoc, setDoc, updateDoc, increment, Timestamp } from 'firebase/firestore';

// Tipos de operação
export type OperationType = 'read' | 'write';

// Limites por tipo de operação (por minuto)
const RATE_LIMITS: Record<OperationType, number> = {
  read: 500,
  write: 100
};

// Configuração de exponential backoff
const BACKOFF_CONFIG = {
  baseDelayMs: 1000,        // 1 segundo inicial
  maxDelayMs: 300000,       // 5 minutos máximo
  violationThreshold: 3     // Número de violações para bloquear
};

/**
 * Erro lançado quando rate limit é excedido
 */
export class RateLimitError extends Error {
  constructor(
    message: string,
    public retryAfter: number,
    public operationType: OperationType,
    public currentCount: number,
    public limit: number
  ) {
    super(message);
    this.name = 'RateLimitError';
  }
}

/**
 * Informações de rate limit para um usuário
 */
interface RateLimitInfo {
  userId: string;
  reads: number;
  writes: number;
  windowStart: Timestamp;
  violations: number;
  blockedUntil?: Timestamp;
  lastViolation?: Timestamp;
}

/**
 * Serviço de Rate Limiting
 */
export class RateLimiterService {
  private readonly collectionPath = 'rateLimits';

  /**
   * Verifica se operação está dentro do rate limit
   * @throws {RateLimitError} Se limite for excedido
   */
  async checkLimit(userId: string, operationType: OperationType): Promise<void> {
    const limitInfo = await this.getLimitInfo(userId);
    
    // Verifica se usuário está bloqueado
    if (limitInfo.blockedUntil) {
      const now = Timestamp.now();
      if (limitInfo.blockedUntil.toMillis() > now.toMillis()) {
        const retryAfter = Math.ceil((limitInfo.blockedUntil.toMillis() - now.toMillis()) / 1000);
        throw new RateLimitError(
          `Usuário temporariamente bloqueado devido a violações repetidas. Tente novamente em ${retryAfter} segundos.`,
          retryAfter,
          operationType,
          0,
          0
        );
      } else {
        // Bloqueio expirou, limpa o bloqueio
        await this.clearBlock(userId);
      }
    }

    // Verifica se janela de tempo expirou (1 minuto)
    const now = Timestamp.now();
    const windowDurationMs = 60 * 1000; // 1 minuto
    const windowExpired = (now.toMillis() - limitInfo.windowStart.toMillis()) > windowDurationMs;

    if (windowExpired) {
      // Reset contadores para nova janela
      await this.resetWindow(userId);
      return; // Primeira operação da nova janela sempre passa
    }

    // Verifica limite específico da operação
    const currentCount = operationType === 'read' ? limitInfo.reads : limitInfo.writes;
    const limit = RATE_LIMITS[operationType];

    if (currentCount >= limit) {
      // Limite excedido - registra violação
      await this.recordViolation(userId, operationType);
      
      // Calcula retry-after baseado em violações
      const retryAfter = this.calculateRetryAfter(limitInfo.violations + 1);
      
      throw new RateLimitError(
        `Limite de ${operationType === 'read' ? 'leituras' : 'escritas'} excedido. Máximo: ${limit} operações por minuto.`,
        retryAfter,
        operationType,
        currentCount,
        limit
      );
    }

    // Incrementa contador
    await this.incrementCounter(userId, operationType);
  }

  /**
   * Obtém informações de rate limit para um usuário
   */
  private async getLimitInfo(userId: string): Promise<RateLimitInfo> {
    const docRef = doc(db, this.collectionPath, userId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      // Primeira vez - cria documento
      const initialInfo: RateLimitInfo = {
        userId,
        reads: 0,
        writes: 0,
        windowStart: Timestamp.now(),
        violations: 0
      };
      
      await setDoc(docRef, initialInfo);
      return initialInfo;
    }

    return docSnap.data() as RateLimitInfo;
  }

  /**
   * Incrementa contador de operações
   */
  private async incrementCounter(userId: string, operationType: OperationType): Promise<void> {
    const docRef = doc(db, this.collectionPath, userId);
    const field = operationType === 'read' ? 'reads' : 'writes';
    
    await updateDoc(docRef, {
      [field]: increment(1)
    });
  }

  /**
   * Reseta janela de tempo
   */
  private async resetWindow(userId: string): Promise<void> {
    const docRef = doc(db, this.collectionPath, userId);
    
    await updateDoc(docRef, {
      reads: 0,
      writes: 0,
      windowStart: Timestamp.now()
    });
  }

  /**
   * Registra violação de rate limit
   */
  private async recordViolation(userId: string, operationType: OperationType): Promise<void> {
    const docRef = doc(db, this.collectionPath, userId);
    const limitInfo = await this.getLimitInfo(userId);
    
    const newViolations = limitInfo.violations + 1;
    const updates: Partial<RateLimitInfo> = {
      violations: newViolations,
      lastViolation: Timestamp.now()
    };

    // Se atingiu threshold, bloqueia usuário
    if (newViolations >= BACKOFF_CONFIG.violationThreshold) {
      const blockDurationMs = this.calculateBlockDuration(newViolations);
      const blockedUntil = Timestamp.fromMillis(Date.now() + blockDurationMs);
      
      updates.blockedUntil = blockedUntil;
      
      // Log para monitoramento
      console.warn(`[RateLimiter] Usuário ${userId} bloqueado por ${blockDurationMs}ms após ${newViolations} violações`);
      
      // TODO: Alertar administradores sobre padrão suspeito
      if (newViolations >= 5) {
        this.alertAdministrators(userId, newViolations, operationType);
      }
    }

    await updateDoc(docRef, updates);
  }

  /**
   * Calcula duração do bloqueio com exponential backoff
   */
  private calculateBlockDuration(violations: number): number {
    const exponent = violations - BACKOFF_CONFIG.violationThreshold + 1;
    const duration = BACKOFF_CONFIG.baseDelayMs * Math.pow(2, exponent);
    
    return Math.min(duration, BACKOFF_CONFIG.maxDelayMs);
  }

  /**
   * Calcula retry-after em segundos
   */
  private calculateRetryAfter(violations: number): number {
    if (violations < BACKOFF_CONFIG.violationThreshold) {
      return 60; // 1 minuto padrão
    }
    
    const blockDurationMs = this.calculateBlockDuration(violations);
    return Math.ceil(blockDurationMs / 1000);
  }

  /**
   * Limpa bloqueio expirado
   */
  private async clearBlock(userId: string): Promise<void> {
    const docRef = doc(db, this.collectionPath, userId);
    
    await updateDoc(docRef, {
      blockedUntil: null,
      violations: 0
    });
  }

  /**
   * Alerta administradores sobre padrão suspeito
   */
  private async alertAdministrators(
    userId: string,
    violations: number,
    operationType: OperationType
  ): Promise<void> {
    // TODO: Implementar notificação para administradores
    // Pode ser via Cloud Function, email, Slack, etc.
    console.error(`[RateLimiter] ALERTA: Usuário ${userId} com ${violations} violações de ${operationType}`);
    
    // Por enquanto, apenas log
    // Em produção, integrar com sistema de alertas
  }

  /**
   * Obtém estatísticas de rate limiting (para debugging/monitoring)
   */
  async getStats(userId: string): Promise<RateLimitInfo | null> {
    const docRef = doc(db, this.collectionPath, userId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }
    
    return docSnap.data() as RateLimitInfo;
  }

  /**
   * Reseta violações de um usuário (admin only)
   */
  async resetViolations(userId: string): Promise<void> {
    const docRef = doc(db, this.collectionPath, userId);
    
    await updateDoc(docRef, {
      violations: 0,
      blockedUntil: null,
      lastViolation: null
    });
  }
}

// Singleton instance
export const rateLimiterService = new RateLimiterService();
