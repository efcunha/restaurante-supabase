import { supabase } from '../../config/SupabaseConfig';
import { Order } from '../../types';
import { RealtimeChannel } from '@supabase/supabase-js';
import offlineQueueService from '../OfflineQueueService';
import { isRetryableError } from '../../utils/errors';
import { optimizedSupabaseClient } from '../optimization/OptimizedSupabaseClient';
import { realTimeListenerManager } from '../optimization/RealTimeListenerManager';
import type { Subscription } from '../optimization/RealTimeListenerManager';
import { CompanySettingsService } from '../CompanySettingsService';
import { getBusinessDayStart, getTodayKey } from '../../utils/dateUtils';

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
      itemsWithStatus: row.items_with_status || [],
      observations: row.observations || '',
      status: row.status,
      dateKey: row.date_key,
      timestamp: row.created_at,
      createdAt: row.created_at,
      horarioCriacao: new Date(row.created_at).toLocaleTimeString().slice(0, 5),
      totalPrice: row.total_amount,
      isPago: row.is_paid,
      priceMap: row.price_map || {},
      createdBy: row.created_by,
      createdByName: '', 
      comandaStatus: row.comanda_status,
      // Timestamps
      deliveredAt: null, // Delivery time tracked at item level in items_with_status
      timeInChurrasqueira: null, // Custom fields need schema extension if critical
      timeInMontagem: null,
      timeInProntos: null,
      // Delivery fields
      orderType: row.order_type || 'local',
      customerPhone: row.customer_phone || '',
      deliveryAddress: row.delivery_address || '',
      deliveryFee: row.delivery_fee || 0,
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

  async fetchActiveOrders(companyId: string, dateKey?: string): Promise<Order[]> {
    // Use optimized client with caching for active orders
    // We filter orders from the current day (starting at 00:00) to ensure tables are cleared when the day turns
    // Use configurable Business Day Cutoff (default 6 AM)
    let cutoffDate = new Date();
    try {
      const settings = await CompanySettingsService.getSettings(companyId);
      cutoffDate = getBusinessDayStart(settings.businessDayCutoff);
    } catch (e) {
      console.warn('Failed to load settings, using default 6 AM cutoff', e);
      cutoffDate = getBusinessDayStart(6);
    }

    try {
      // Use standard client for complex filtering (with OR)
      // OptimizedQueryBuilder currently lacks some complex methods like .or()
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('company_id', companyId)
        .gte('created_at', cutoffDate.toISOString())
        .not('status', 'eq', 'cancelled')
        .not('status', 'eq', 'cancelada')
        .or('comanda_status.is.null,comanda_status.neq.cancelada')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('[SupabaseOrder] Fetch error:', error);
        return [];
      }

      console.log(`[SupabaseOrder] fetchActiveOrders found ${data?.length} orders`);
      return (data || []).map(this.mapRowToOrder);
    } catch (err: any) {
      console.error('[SupabaseOrder] Exception in fetchActiveOrders:', err);
      return [];
    }
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
        table_number: parseInt(order.mesa?.toString().replace(/\D/g, '') || '0'),
        comanda_number: parseInt(order.comandaNumber || '0'),
        items: order.items,
        observations: order.observations,
        status: 'preparing',
        total_amount: order.totalPrice,
        is_paid: false,
        created_by: order.createdBy,
        date_key: getTodayKey(),
        comanda_status: 'aberta',
        items_with_status: order.itemsWithStatus || [],
        order_type: order.orderType || 'local',
        customer_phone: order.customerPhone || null,
        delivery_address: order.deliveryAddress || null,
        delivery_fee: order.deliveryFee || 0
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
    if (updates.itemsWithStatus) payload.items_with_status = updates.itemsWithStatus;
    if (updates.orderType) payload.order_type = updates.orderType;
    if (updates.customerPhone !== undefined) payload.customer_phone = updates.customerPhone;
    if (updates.deliveryAddress !== undefined) payload.delivery_address = updates.deliveryAddress;
    if (updates.deliveryFee !== undefined) payload.delivery_fee = updates.deliveryFee;

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
    // ✅ AUTO-GENERATE DELIVERY COMANDA NUMBER WITH TRANSACTION LOCK
    // Se for pedido delivery sem comanda_number, gerar automaticamente (D1, D2, D3...)
    let comandaNumber = parseInt(order.comandaNumber || '0');
    
    if (order.orderType === 'delivery' && (!order.comandaNumber || order.comandaNumber === '0')) {
      // ✅ CRITICAL: Use RPC function with transaction lock to prevent race conditions
      // This ensures two simultaneous delivery orders get different numbers
      const { data: rpcResult, error: rpcError } = await supabase
        .rpc('get_next_delivery_comanda_number', {
          p_company_id: companyId,
          p_date_key: getTodayKey()
        });
      
      if (rpcError) {
        console.error('[SupabaseOrderService] ❌ Erro ao gerar comanda_number:', rpcError);
        // Fallback: buscar manualmente (pode ter race condition, mas melhor que falhar)
        const { data: maxComanda } = await supabase
          .from('orders')
          .select('comanda_number')
          .eq('company_id', companyId)
          .eq('date_key', getTodayKey())
          .eq('order_type', 'delivery')
          .order('comanda_number', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        comandaNumber = (maxComanda?.comanda_number || 0) + 1;
      } else {
        comandaNumber = rpcResult;
      }
      
      console.log(`[SupabaseOrderService] 🚚 Gerado comanda_number para delivery: ${comandaNumber}`);
    }
    
    const { data, error } = await supabase
      .from('orders')
      .insert({
        company_id: companyId,
        client_name: order.client,
        table_number: parseInt(order.mesa?.toString().replace(/\D/g, '') || '0'),
        comanda_number: comandaNumber,
        items: order.items,
        observations: order.observations,
        status: order.status || 'pending',
        total_amount: order.totalPrice,
        is_paid: order.isPago || false,
        created_by: order.createdBy,
        date_key: getTodayKey(),
        comanda_status: 'aberta',
        items_with_status: order.itemsWithStatus || [],
        order_type: order.orderType || 'local',
        customer_phone: order.customerPhone || null,
        delivery_address: order.deliveryAddress || null,
        delivery_fee: order.deliveryFee || 0
      })
      .select()
      .single();

    if (error) throw error;
    return data.id;
  }

  /**
   * Transfere um pedido para outra mesa
   */
  async transferOrder(
    companyId: string,
    orderId: string,
    targetTableNumber: string,
    targetTableId?: string,
    reason?: string,
    userId?: string
  ): Promise<void> {
    const isOnline = offlineQueueService.getIsOnline();

    // Fetch current order details for the log
    // We do this optimistically or let the server handle it (triggered functions would be better but we do it client-side for now)

    const operation = async () => {
      // 1. Get current order info to log 'from_table'
      const { data: currentOrder, error: fetchError } = await supabase
        .from('orders')
        .select('table_number, id') // add more fields if we can join with tables
        .eq('id', orderId)
        .single();

      if (fetchError) throw fetchError;

      // 2. Perform the transfer (update order)
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          table_number: parseInt(targetTableNumber),
          // table_id: targetTableId // If we had a direct FK column active
        })
        .eq('id', orderId);

      if (updateError) throw updateError;

      // 3. Log the transfer
      const { error: logError } = await supabase
        .from('order_transfers')
        .insert({
          company_id: companyId,
          order_id: orderId,
          from_table_id: null, // We'd need to lookup the ID from the number or have it passed
          to_table_id: targetTableId || null,
          transferred_by: userId || (await supabase.auth.getUser()).data.user?.id,
          reason: reason || `Transferência para mesa ${targetTableNumber}`,
          // We store the numbers in metadata or reason if IDs aren't available yet
        });

      if (logError) {
        console.warn('[SupabaseOrderService] Failed to log transfer:', logError);
        // We don't throw here to avoid failing the user-facing action if just logging fails
      }

      // 4. Invalidate cache
      const { cacheLayerService } = await import('../CacheLayerService');
      await cacheLayerService.invalidatePattern('orders:');
    };

    if (!isOnline) {
      await offlineQueueService.enqueue('TRANSFER_ORDER', operation, { companyId, orderId, targetTableNumber, targetTableId, reason });
      return;
    }

    try {
      await operation();
    } catch (error: any) {
      if (isRetryableError(error)) {
        await offlineQueueService.enqueue('TRANSFER_ORDER', operation, { companyId, orderId, targetTableNumber, targetTableId, reason });
        return;
      }
      throw error;
    }
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
