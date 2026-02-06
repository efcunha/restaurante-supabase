import { supabase } from '../../config/SupabaseConfig';
import { Order } from '../../types';
import { RealtimeChannel } from '@supabase/supabase-js';
import offlineQueueService from '../OfflineQueueService';
import { isRetryableError } from '../../utils/errors';
import { optimizedSupabaseClient } from '../optimization/OptimizedSupabaseClient';
import { realTimeListenerManager } from '../optimization/RealTimeListenerManager';
import type { Subscription } from '../optimization/RealTimeListenerManager';

// Helper to get today's date key YYYY-MM-DD
const getTodayKey = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

class SupabaseOrderService {
  private _subscription: Subscription | null = null;

  /**
   * Converte linha do banco para objeto Order local
   */
  private mapRowToOrder(row: any): Order {
    return {
      id: row.id, // UUID now
      client: row.client_name,
      mesa: row.table_number?.toString() || '',
      comandaNumber: row.comanda_number?.toString() || '',
      items: row.items || [],
      itemsWithStatus: [], // Supabase version handles status in items or separate table? Assuming items JSONB for now
      observations: row.observations || '',
      status: row.status,
      dateKey: row.date_key,
      timestamp: row.created_at,
      createdAt: row.created_at,
      horarioCriacao: new Date(row.created_at).toLocaleTimeString().slice(0, 5),
      totalPrice: row.total_amount,
      isPago: row.is_paid,
      createdBy: row.created_by,
      createdByName: '', // Join logic would be needed here or stored in metadata
      // Timestamps
      deliveredAt: null, // Delivery time tracked at item level in items_with_status
      timeInChurrasqueira: null, // Custom fields need schema extension if critical
      timeInMontagem: null,
      timeInProntos: null,
    } as Order;
  }

  /**
   * Escuta pedidos ativos via Supabase Realtime com otimizações
   * Requirements: 5.1, 5.2, 5.3, 5.4
   */
  listenToActiveOrders(companyId: string, callback: (data: { orders: Order[] }) => void) {
    // Cleanup existing subscription
    if (this._subscription) {
      realTimeListenerManager.unsubscribe(this._subscription);
      this._subscription = null;
    }

    const todayKey = getTodayKey();

    // Initial fetch
    this.fetchActiveOrders(companyId, todayKey).then(orders => callback({ orders }));

    // Subscribe using RealTimeListenerManager with filters and debouncing
    const channelName = `orders-${companyId}-${todayKey}`;
    
    this._subscription = realTimeListenerManager.subscribe(
      channelName,
      {
        table: 'orders',
        event: '*',
        filter: `company_id=eq.${companyId}`,
        schema: 'public'
      },
      async (payload) => {
        // Debounced callback - will be called after 500ms of no updates
        console.log('[SupabaseOrder] Change received:', payload);
        const orders = await this.fetchActiveOrders(companyId, todayKey);
        callback({ orders });
      }
    );

    // Return cleanup function
    return () => {
      if (this._subscription) {
        realTimeListenerManager.unsubscribe(this._subscription);
        this._subscription = null;
      }
    };
  }

  async fetchActiveOrders(companyId: string, dateKey: string): Promise<Order[]> {
    // Use optimized client with caching for active orders
    const cacheKey = `orders:active:${companyId}:${dateKey}`;
    const cacheTags = [`orders:${companyId}`, `orders:date:${dateKey}`];
    
    const query = optimizedSupabaseClient
      .from('orders')
      .select('*')
      .eq('company_id', companyId)
      .eq('date_key', dateKey)
      .not('status', 'eq', 'cancelled')
      .order('created_at', { ascending: false });

    const { data, error } = await query.execute();

    if (error) {
       console.error('[SupabaseOrder] Fetch error:', error);
       return [];
    }

    return (data || []).map(this.mapRowToOrder);
  }



  /**
   * Internal method for creating order directly
   */
  private async _createOrderInternal(companyId: string, order: Partial<Order>): Promise<string> {
      const { data, error } = await supabase
      .from('orders')
      .insert({
         company_id: companyId,
         client_name: order.client,
         table_number: parseInt(order.mesa || '0'),
         comanda_number: parseInt(order.comandaNumber || '0'),
         items: order.items,
         observations: order.observations,
         status: 'pending',
         total_amount: order.totalPrice,
         is_paid: false,
         created_by: order.createdBy,
         date_key: getTodayKey()
      })
      .select()
      .single();

    if (error) {
       console.error('[SupabaseOrder] Create error:', error);
       throw error;
    }

    // Invalidate cache for orders
    const { cacheLayerService } = await import('../CacheLayerService');
    await cacheLayerService.invalidateByTags([`orders:${companyId}`, `orders:date:${getTodayKey()}`]);

    return data.id;
  }

  /**
   * Cria um novo pedido (com suporte offline)
   */
  async createOrder(companyId: string, order: Partial<Order>): Promise<string | null> {
    const isOnline = offlineQueueService.getIsOnline();
    
    // Simple UUID generator for temp ID
    const tempId = 'temp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    if (!isOnline) {
       console.log('[SupabaseOrder] Offline, queuing creation of order');
       await offlineQueueService.enqueue('CREATE_ORDER', async () => {
           return this._createOrderInternal(companyId, order);
       }, { companyId, order });
       return tempId;
    }

    try {
       return await this._createOrderInternal(companyId, order);
    } catch (error: any) {
       if (isRetryableError(error) || error.message.includes('Network request failed') || error.message.includes('fetch')) {
           console.log('[SupabaseOrder] Network fail, queuing creation');
           await offlineQueueService.enqueue('CREATE_ORDER', async () => {
               return this._createOrderInternal(companyId, order);
           }, { companyId, order });
           return tempId;
       }
       throw error;
    }
  }

  async updateOrderStatus(orderId: string, status: string) {
    const isOnline = offlineQueueService.getIsOnline();
    
    const operation = async () => {
        const { error } = await supabase
          .from('orders')
          .update({ status })
          .eq('id', orderId);
        if (error) throw error;
        
        // Invalidate cache after update
        const { cacheLayerService } = await import('../CacheLayerService');
        await cacheLayerService.invalidatePattern('orders:');
    };

    if (!isOnline) {
        await offlineQueueService.enqueue('UPDATE_STATUS', operation, { orderId, status });
        return;
    }

    try {
        await operation();
    } catch (error: any) {
        if (isRetryableError(error)) {
             await offlineQueueService.enqueue('UPDATE_STATUS', operation, { orderId, status });
             return;
        }
        throw error;
    }
  }

  async updateOrder(orderId: string, updates: Partial<Order>) {
     const payload: any = {};
     if (updates.client) payload.client_name = updates.client;
     if (updates.items) payload.items = updates.items;
     if (updates.totalPrice) payload.total_amount = updates.totalPrice;
     
     const operation = async () => {
         const { error } = await supabase
           .from('orders')
           .update(payload)
           .eq('id', orderId);
         if (error) throw error;
         
         // Invalidate cache after update
         const { cacheLayerService } = await import('../CacheLayerService');
         await cacheLayerService.invalidatePattern('orders:');
     };

     const isOnline = offlineQueueService.getIsOnline();
     if (!isOnline) {
          await offlineQueueService.enqueue('UPDATE_ORDER', operation, { orderId, updates });
          return;
     }

     try {
         await operation();
     } catch (error: any) {
         if (isRetryableError(error)) {
              await offlineQueueService.enqueue('UPDATE_ORDER', operation, { orderId, updates });
              return;
         }
         throw error;
     }
  }
}

export default new SupabaseOrderService();

  /**
   * Deleta um pedido
   */
  async deleteOrder(companyId: string, orderId: string) {
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId)
      .eq('company_id', companyId);
    
    if (error) throw error;
  }

  /**
   * Salva um pedido completo
   */
  async saveOrder(companyId: string, order: Order): Promise<string> {
    const { data, error } = await supabase
      .from('orders')
      .insert({
        company_id: companyId,
        client_name: order.client,
        table_number: parseInt(order.mesa || '0'),
        comanda_number: parseInt(order.comandaNumber || '0'),
        items: order.items,
        observations: order.observations,
        status: order.status || 'pending',
        total_amount: order.totalPrice,
        is_paid: order.isPago || false,
        created_by: order.createdBy,
        date_key: getTodayKey()
      })
      .select()
      .single();

    if (error) throw error;
    return data.id;
  }

  // ============================================================================
  // STATISTICS METHODS
  // ============================================================================

  /**
   * Busca estatísticas de um garçom
   */
  async getEstatisticasGarcom(companyId: string, garcomId: string | null = null, periodo: string = 'hoje') {
    try {
      const { startDate, endDate } = this._getDateRange(periodo);

      let query = supabase
        .from('orders')
        .select('*')
        .eq('company_id', companyId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (garcomId) {
        query = query.eq('created_by', garcomId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const orders = (data || []).map(row => this.mapRowToOrder(row));
      return this._calcularEstatisticas(orders, []);

    } catch (error) {
      console.error('[SupabaseOrderService] Erro em getEstatisticasGarcom:', error);
      return this._getEmptyStats();
    }
  }

  /**
   * Busca estatísticas de todos os garçons
   */
  async getEstatisticasTodosGarcons(companyId: string, periodo: string = 'hoje') {
    try {
      const { startDate, endDate } = this._getDateRange(periodo);

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('company_id', companyId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (error) throw error;

      const orders = (data || []).map(row => this.mapRowToOrder(row));
      const byUser: Record<string, Order[]> = {};

      orders.forEach(o => {
        const uid = o.createdBy || 'unknown';
        if (!byUser[uid]) byUser[uid] = [];
        byUser[uid].push(o);
      });

      return Object.entries(byUser).map(([uid, userOrders]) => ({
        garcomId: uid,
        garcomNome: userOrders[0]?.createdByName || 'Desconhecido',
        ...this._calcularEstatisticas(userOrders, [])
      }));

    } catch (error) {
      console.error('[SupabaseOrderService] Erro em getEstatisticasTodosGarcons:', error);
      return [];
    }
  }

  /**
   * Busca estatísticas de pagamentos
   */
  async getEstatisticasPagamentos(companyId: string, garcomId: string | null = null, periodo: string = 'hoje') {
    // TODO: Implementar usando tabela de pagamentos quando migrada
    return {
      dinheiro: { total: 0, quantidade: 0 },
      pix: { total: 0, quantidade: 0 },
      debito: { total: 0, quantidade: 0 },
      credito: { total: 0, quantidade: 0 },
    };
  }

  /**
   * Busca estatísticas de comandas
   */
  async getEstatisticasComandas(companyId: string, garcomId: string | null = null, periodo: string = 'hoje') {
    try {
      const { startDate, endDate } = this._getDateRange(periodo);
      let query = supabase
        .from('comandas')
        .select('*')
        .eq('company_id', companyId)
        .gte('opened_at', startDate.toISOString())
        .lte('opened_at', endDate.toISOString());

      if (garcomId) {
        query = query.eq('opened_by', garcomId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const comandas = data || [];
      const abertas = comandas.filter(c => c.status === 'aberta');
      const fechadas = comandas.filter(c => c.status === 'fechada');

      return {
        total: comandas.length,
        abertas: abertas.length,
        fechadas: fechadas.length,
        totalConsumido: comandas.reduce((acc, c) => acc + (c.total_consumed || 0), 0),
        totalPago: comandas.reduce((acc, c) => acc + (c.total_paid || 0), 0),
        saldoAberto: comandas.reduce((acc, c) => acc + (c.open_balance || 0), 0)
      };
    } catch (e) {
      return { total: 0, abertas: 0, fechadas: 0, totalConsumido: 0, totalPago: 0, saldoAberto: 0 };
    }
  }

  /**
   * Busca estatísticas completas
   */
  async getEstatisticasCompletas(companyId: string, garcomId: string | null = null, mesAno: string | null = null) {
    const periodoBase = mesAno || 'mesVigente';
    const [vendasHoje, vendasSemana, vendasMes] = await Promise.all([
      this.getEstatisticasGarcom(companyId, garcomId, 'hoje'),
      this.getEstatisticasGarcom(companyId, garcomId, 'semana'),
      this.getEstatisticasGarcom(companyId, garcomId, periodoBase)
    ]);

    return {
      vendas: { hoje: vendasHoje, semana: vendasSemana, mes: vendasMes },
      pagamentos: { hoje: {}, semana: {}, mes: {} },
      comandas: { hoje: {}, semana: {}, mes: {} }
    };
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private _getDateRange(periodo: string): { startDate: Date, endDate: Date } {
    const now = new Date();
    let startDate: Date, endDate: Date;

    if (periodo && /^\d{4}-\d{2}$/.test(periodo)) {
      const [ano, mes] = periodo.split('-').map(Number);
      startDate = new Date(ano, mes - 1, 1, 0, 0, 0);
      endDate = new Date(ano, mes, 0, 23, 59, 59);
      return { startDate, endDate };
    }

    switch (periodo) {
      case 'hoje':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        break;
      case 'semana':
        startDate = new Date(now.getTime());
        startDate.setDate(now.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        break;
      case 'mes':
      case 'mesVigente':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    }
    return { startDate, endDate };
  }

  private _getEmptyStats() {
    return {
      totalPedidos: 0,
      totalVendido: 0,
      totalRecebido: 0,
      totalAberto: 0,
      quantidadeComandas: 0,
      comandasAbertas: 0,
      comandasFechadas: 0,
      ticketMedio: 0,
      produtoMaisVendido: null,
    };
  }

  private _calcularEstatisticas(pedidos: Order[], pagamentos: any[]) {
    const totalPedidos = pedidos.length;
    const pedidosPagos = pedidos.filter(p => p.isPago);
    const pedidosAbertos = pedidos.filter(p => !p.isPago);
    const totalVendido = pedidos.reduce((sum, p) => sum + (p.totalPrice || 0), 0);
    const totalRecebido = pedidosPagos.reduce((sum, p) => sum + (p.totalPrice || 0), 0);
    const totalAberto = pedidosAbertos.reduce((sum, p) => sum + (p.totalPrice || 0), 0);

    return {
      totalPedidos,
      totalVendido,
      totalRecebido,
      totalAberto,
      quantidadeComandas: new Set(pedidos.map(p => p.comandaNumber)).size,
      comandasAbertas: pedidosAbertos.length,
      comandasFechadas: pedidosPagos.length,
      ticketMedio: totalPedidos > 0 ? totalVendido / totalPedidos : 0,
      produtoMaisVendido: null // TODO
    };
  }

  // Compatibility methods
  findOrdersByComanda(comanda: string) { return []; }
  findDocIdByOrderId() { return null; }
}

export default new SupabaseOrderService();
