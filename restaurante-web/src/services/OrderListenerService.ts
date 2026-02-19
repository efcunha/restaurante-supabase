/**
 * Order Listener Service - Migrado para Supabase Realtime
 * 
 * Implementa listeners real-time otimizados com:
 * - Debouncing de 500ms para batch updates
 * - Memoization para prevenir re-processamento
 * - Batching de múltiplas mudanças rápidas
 * - Limite de 5 listeners ativos por usuário
 * - Auto-unsubscribe após 5 minutos de inatividade
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

import { supabase } from '../config/SupabaseConfig';
import { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Configuração do listener
 */
interface ListenerConfig {
  debounceMs: number;
  maxListeners: number;
  inactivityTimeoutMs: number;
}

/**
 * Informações de subscription
 */
interface SubscriptionInfo {
  id: string;
  channel: RealtimeChannel;
  lastActivity: number;
  isPaused: boolean;
  callback: (data: any[]) => void;
}

/**
 * Cache de dados processados
 */
interface DataCache {
  hash: string;
  data: any[];
  timestamp: number;
}

/**
 * Order Listener Service
 */
class OrderListenerService {
  private config: ListenerConfig = {
    debounceMs: 500,
    maxListeners: 5,
    inactivityTimeoutMs: 5 * 60 * 1000 // 5 minutos
  };

  private subscriptions: Map<string, SubscriptionInfo> = new Map();
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private dataCache: Map<string, DataCache> = new Map();
  private inactivityCheckInterval?: NodeJS.Timeout;

  constructor() {
    // Inicia verificação periódica de inatividade
    this.startInactivityCheck();
  }

  /**
   * Inscreve-se para receber pedidos ativos em tempo real
   */
  subscribeToActiveOrders(
    companyId: string,
    callback: (orders: any[]) => void,
    options?: { limit?: number }
  ): string {
    // Verifica limite de listeners
    if (this.subscriptions.size >= this.config.maxListeners) {
      throw new Error(
        `Limite de ${this.config.maxListeners} listeners ativos atingido. ` +
        `Cancele listeners inativos antes de criar novos.`
      );
    }

    const subscriptionId = `active-orders-${companyId}-${Date.now()}`;

    // Função para buscar dados iniciais
    const fetchInitialData = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('company_id', companyId)
        .in('status', ['pending', 'preparing'])
        .order('created_at', { ascending: false })
        .limit(options?.limit || 100);

      if (!error && data) {
        this.handleData(subscriptionId, data, callback);
      }
    };

    // Busca dados iniciais
    fetchInitialData();

    // Cria canal Realtime
    const channel = supabase
      .channel(`orders-${subscriptionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `company_id=eq.${companyId}`
        },
        async (payload) => {
          // Re-fetch dados quando houver mudança
          await fetchInitialData();
        }
      )
      .subscribe();

    // Registra subscription
    this.subscriptions.set(subscriptionId, {
      id: subscriptionId,
      channel,
      lastActivity: Date.now(),
      isPaused: false,
      callback
    });

    return subscriptionId;
  }

  /**
   * Inscreve-se para receber um pedido específico
   */
  subscribeToOrder(
    companyId: string,
    orderId: string,
    callback: (order: any | null) => void
  ): string {
    // Verifica limite de listeners
    if (this.subscriptions.size >= this.config.maxListeners) {
      throw new Error(
        `Limite de ${this.config.maxListeners} listeners ativos atingido.`
      );
    }

    const subscriptionId = `order-${orderId}-${Date.now()}`;

    // Função para buscar dados iniciais
    const fetchInitialData = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('company_id', companyId)
        .eq('id', orderId)
        .maybeSingle();

      if (!error) {
        const wrappedCallback = (orders: any[]) => {
          callback(orders.length > 0 ? orders[0] : null);
        };
        this.handleData(subscriptionId, data ? [data] : [], wrappedCallback);
      }
    };

    // Busca dados iniciais
    fetchInitialData();

    // Cria canal Realtime
    const channel = supabase
      .channel(`order-${subscriptionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`
        },
        async (payload) => {
          // Re-fetch dados quando houver mudança
          await fetchInitialData();
        }
      )
      .subscribe();

    // Registra subscription
    this.subscriptions.set(subscriptionId, {
      id: subscriptionId,
      channel,
      lastActivity: Date.now(),
      isPaused: false,
      callback: (orders: any[]) => callback(orders[0] || null)
    });

    return subscriptionId;
  }

  /**
   * Processa dados com debouncing e memoization
   */
  private handleData(
    subscriptionId: string,
    data: any[],
    callback: (data: any[]) => void
  ): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription || subscription.isPaused) {
      return;
    }

    // Atualiza última atividade
    subscription.lastActivity = Date.now();

    // Cancela timer anterior se existir
    const existingTimer = this.debounceTimers.get(subscriptionId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Cria novo timer de debounce
    const timer = setTimeout(() => {
      this.processData(subscriptionId, data, callback);
      this.debounceTimers.delete(subscriptionId);
    }, this.config.debounceMs);

    this.debounceTimers.set(subscriptionId, timer);
  }

  /**
   * Processa dados com memoization
   */
  private processData(
    subscriptionId: string,
    data: any[],
    callback: (data: any[]) => void
  ): void {
    // Calcula hash dos dados para memoization
    const dataHash = this.calculateHash(data);

    // Verifica cache
    const cached = this.dataCache.get(subscriptionId);
    if (cached && cached.hash === dataHash) {
      // Dados não mudaram, não chama callback
      return;
    }

    // Atualiza cache
    this.dataCache.set(subscriptionId, {
      hash: dataHash,
      data,
      timestamp: Date.now()
    });

    // Chama callback com dados novos
    callback(data);
  }

  /**
   * Calcula hash simples dos dados para memoization
   */
  private calculateHash(data: any[]): string {
    // Usa shallow comparison dos IDs e timestamps
    const ids = data.map(item => item.id).sort().join(',');
    const timestamps = data
      .map(item => item.updated_at || item.created_at || '')
      .sort()
      .join(',');
    
    return `${ids}:${timestamps}`;
  }

  /**
   * Cancela uma subscription específica
   */
  unsubscribe(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      return;
    }

    // Cancela canal do Supabase
    subscription.channel.unsubscribe();

    // Remove timer de debounce se existir
    const timer = this.debounceTimers.get(subscriptionId);
    if (timer) {
      clearTimeout(timer);
      this.debounceTimers.delete(subscriptionId);
    }

    // Remove cache
    this.dataCache.delete(subscriptionId);

    // Remove subscription
    this.subscriptions.delete(subscriptionId);
  }

  /**
   * Pausa todos os listeners
   */
  pauseAllListeners(): void {
    this.subscriptions.forEach(subscription => {
      subscription.isPaused = true;
    });
  }

  /**
   * Resume todos os listeners
   */
  resumeAllListeners(): void {
    this.subscriptions.forEach(subscription => {
      subscription.isPaused = false;
      subscription.lastActivity = Date.now();
    });
  }

  /**
   * Retorna número de subscriptions ativas
   */
  getActiveSubscriptions(): number {
    return this.subscriptions.size;
  }

  /**
   * Retorna informações sobre subscriptions ativas
   */
  getSubscriptionsInfo(): Array<{
    id: string;
    isPaused: boolean;
    lastActivity: Date;
    inactiveDuration: number;
  }> {
    const now = Date.now();
    return Array.from(this.subscriptions.values()).map(sub => ({
      id: sub.id,
      isPaused: sub.isPaused,
      lastActivity: new Date(sub.lastActivity),
      inactiveDuration: now - sub.lastActivity
    }));
  }

  /**
   * Inicia verificação periódica de inatividade
   */
  private startInactivityCheck(): void {
    // Verifica a cada minuto
    this.inactivityCheckInterval = setInterval(() => {
      this.checkInactiveListeners();
    }, 60 * 1000);
  }

  /**
   * Verifica e remove listeners inativos
   */
  private checkInactiveListeners(): void {
    const now = Date.now();
    const inactiveIds: string[] = [];

    this.subscriptions.forEach((subscription, id) => {
      const inactiveDuration = now - subscription.lastActivity;
      
      if (inactiveDuration > this.config.inactivityTimeoutMs) {
        inactiveIds.push(id);
      }
    });

    // Remove listeners inativos
    inactiveIds.forEach(id => {
      console.log(`[OrderListener] Auto-unsubscribing inactive listener: ${id}`);
      this.unsubscribe(id);
    });
  }

  /**
   * Limpa todos os listeners e timers
   */
  cleanup(): void {
    // Cancela todas as subscriptions
    this.subscriptions.forEach((subscription, id) => {
      this.unsubscribe(id);
    });

    // Para verificação de inatividade
    if (this.inactivityCheckInterval) {
      clearInterval(this.inactivityCheckInterval);
      this.inactivityCheckInterval = undefined;
    }

    // Limpa caches
    this.dataCache.clear();
  }

  /**
   * Configura parâmetros do listener
   */
  configure(config: Partial<ListenerConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// Singleton instance
export const orderListenerService = new OrderListenerService();

// Export para testes
export { OrderListenerService };
export type { ListenerConfig, SubscriptionInfo };
