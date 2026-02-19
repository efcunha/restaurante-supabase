/**
 * Rate Limiter Service - Migrado para Supabase
 * 
 * Implementa proteção contra ataques de negação de serviço através de:
 * - Limites de operações por minuto (100 writes, 500 reads)
 * - Exponential backoff para violações repetidas
 * - Tracking de padrões suspeitos
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

import { supabase } from '../config/SupabaseConfig';

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
  windowStart: string;
  violations: number;
  blockedUntil?: string;
  lastViolation?: string;
}

/**
 * Serviço de Rate Limiting
 */
export class RateLimiterService {
  private readonly tableName = 'rate_limits';

  /**
   * Verifica se operação está dentro do rate limit
   * @throws {RateLimitError} Se limite for excedido
   */
  async checkLimit(userId: string, operationType: OperationType): Promise<void> {
    const limitInfo = await this.getLimitInfo(userId);
    
    // Verifica se usuário está bloqueado
    if (limitInfo.blockedUntil) {
      const now = new Date();
      const blockedUntil = new Date(limitInfo.blockedUntil);
      
      if (blockedUntil.getTime() > now.getTime()) {
        const retryAfter = Math.ceil((blockedUntil.getTime() - now.getTime()) / 1000);
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
    const now = new Date();
    const windowStart = new Date(limitInfo.windowStart);
    const windowDurationMs = 60 * 1000; // 1 minuto
    const windowExpired = (now.getTime() - windowStart.getTime()) > windowDurationMs;

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
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      // Primeira vez - cria documento
      const initialInfo = {
        user_id: userId,
        reads_count: 0,
        writes_count: 0,
        window_start: new Date().toISOString(),
        violations: 0
      };
      
      const { data: newData, error: insertError } = await supabase
        .from(this.tableName)
        .insert(initialInfo)
        .select()
        .single();

      if (insertError) {
        console.error('[RateLimiter] Erro ao criar registro:', insertError);
        throw insertError;
      }

      return {
        userId,
        reads: 0,
        writes: 0,
        windowStart: initialInfo.window_start,
        violations: 0
      };
    }

    return {
      userId: data.user_id,
      reads: data.reads_count || 0,
      writes: data.writes_count || 0,
      windowStart: data.window_start,
      violations: data.violations || 0,
      blockedUntil: data.blocked_until,
      lastViolation: data.last_violation
    };
  }

  /**
   * Incrementa contador de operações
   */
  private async incrementCounter(userId: string, operationType: OperationType): Promise<void> {
    const field = operationType === 'read' ? 'reads_count' : 'writes_count';
    
    // Usa RPC para incremento atômico
    const { error } = await supabase.rpc('increment_rate_limit', {
      p_user_id: userId,
      p_field: field
    });

    if (error) {
      // Fallback: update manual
      const limitInfo = await this.getLimitInfo(userId);
      const newCount = (operationType === 'read' ? limitInfo.reads : limitInfo.writes) + 1;
      
      await supabase
        .from(this.tableName)
        .update({ [field]: newCount })
        .eq('user_id', userId);
    }
  }

  /**
   * Reseta janela de tempo
   */
  private async resetWindow(userId: string): Promise<void> {
    const { error } = await supabase
      .from(this.tableName)
      .update({
        reads_count: 0,
        writes_count: 0,
        window_start: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (error) {
      console.error('[RateLimiter] Erro ao resetar janela:', error);
    }
  }

  /**
   * Registra violação de rate limit
   */
  private async recordViolation(userId: string, operationType: OperationType): Promise<void> {
    const limitInfo = await this.getLimitInfo(userId);
    
    const newViolations = limitInfo.violations + 1;
    const updates: any = {
      violations: newViolations,
      last_violation: new Date().toISOString()
    };

    // Se atingiu threshold, bloqueia usuário
    if (newViolations >= BACKOFF_CONFIG.violationThreshold) {
      const blockDurationMs = this.calculateBlockDuration(newViolations);
      const blockedUntil = new Date(Date.now() + blockDurationMs);
      
      updates.blocked_until = blockedUntil.toISOString();
      
      // Log para monitoramento
      console.warn(`[RateLimiter] Usuário ${userId} bloqueado por ${blockDurationMs}ms após ${newViolations} violações`);
      
      // Alertar administradores sobre padrão suspeito
      if (newViolations >= 5) {
        this.alertAdministrators(userId, newViolations, operationType);
      }
    }

    const { error } = await supabase
      .from(this.tableName)
      .update(updates)
      .eq('user_id', userId);

    if (error) {
      console.error('[RateLimiter] Erro ao registrar violação:', error);
    }
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
    const { error } = await supabase
      .from(this.tableName)
      .update({
        blocked_until: null,
        violations: 0
      })
      .eq('user_id', userId);

    if (error) {
      console.error('[RateLimiter] Erro ao limpar bloqueio:', error);
    }
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
    // Pode ser via Edge Function, email, Slack, etc.
    console.error(`[RateLimiter] ALERTA: Usuário ${userId} com ${violations} violações de ${operationType}`);
    
    // Por enquanto, apenas log
    // Em produção, integrar com sistema de alertas
  }

  /**
   * Obtém estatísticas de rate limiting (para debugging/monitoring)
   */
  async getStats(userId: string): Promise<RateLimitInfo | null> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error || !data) {
      return null;
    }
    
    return {
      userId: data.user_id,
      reads: data.reads_count || 0,
      writes: data.writes_count || 0,
      windowStart: data.window_start,
      violations: data.violations || 0,
      blockedUntil: data.blocked_until,
      lastViolation: data.last_violation
    };
  }

  /**
   * Reseta violações de um usuário (admin only)
   */
  async resetViolations(userId: string): Promise<void> {
    const { error } = await supabase
      .from(this.tableName)
      .update({
        violations: 0,
        blocked_until: null,
        last_violation: null
      })
      .eq('user_id', userId);

    if (error) {
      console.error('[RateLimiter] Erro ao resetar violações:', error);
    }
  }
}

// Singleton instance
export const rateLimiterService = new RateLimiterService();
