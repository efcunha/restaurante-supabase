/**
 * OrderFirestoreService - Migrado para Supabase
 * Este arquivo agora usa Supabase em vez de Firestore
 */

import { supabase } from '../config/SupabaseConfig';
import { Order } from '../types';
import { RealtimeChannel } from '@supabase/supabase-js';
import offlineQueueService from './OfflineQueueService';
import { isRetryableError } from '../utils/errors';

// Helper to get today's date key YYYY-MM-DD
const getTodayKey = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

class OrderFirestoreService {
  private _subscription: RealtimeChannel | null = null;

  /**
   * Converte linha do banco para objeto Order local
   */
  private mapRowToOrder(row: any): Order {
    return {
      id: row.id,
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
      createdBy: row.created_by,
      createdByName: '',
      deliveredAt: row.delivered_at,
      timeInChurrasqueira: row.time_in_churrasqueira,
      timeInMontagem: row.time_in_montagem,
      timeInProntos: row.time_in_prontos,
    } as Order;
  }

  /**
   * Escuta pedidos ativos via Supabase Realtime
   */
  listenToActiveOrders(companyId: string, callback: (data: { orders: Order[], docMap?: Record<string, string> }) => void) {
    if (this._subscription) {
      this._subscription.unsubscribe();
    }

    const todayKey = getTodayKey();

    // Initial fetch
    this.fetchActiveOrders(companyId, todayKey).then(orders => {
      const docMap: Record<string, string> = {};
      orders.forEach(o => docMap[o.id] = o.id);
      callback({ orders, docMap });
    });

    // Subscribe to changes
    this._subscription = supabase
      .channel('orders-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `company_id=eq.${companyId}`,
        },
        async (payload) => {
          console.log('[OrderService] Change received:', payload);
          const orders = await this.fetchActiveOrders(companyId, todayKey);
          const docMap: Record<string, string> = {};
          orders.forEach(o => docMap[o.id] = o.id);
          callback({ orders, docMap });
        }
      )
      .subscribe();

    return () => {
      if (this._subscription) this._subscription.unsubscribe();
    };
  }

  async fetchActiveOrders(companyId: string, dateKey: string): Promise<Order[]> {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('company_id', companyId)
      // .eq('date_key', dateKey) // REMOVED: strict day partitioning hides orders after midnight
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Use 24h window
      .not('status', 'eq', 'cancelled')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[OrderService] Fetch error:', error);
      return [];
    }

    return (data || []).map(row => this.mapRowToOrder(row));
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
        status: 'pending',
        total_amount: order.totalPrice,
        is_paid: false,
        created_by: order.createdBy,
        date_key: getTodayKey()
      })
      .select()
      .single();

    if (error) {
      console.error('[OrderService] Create error:', error);
      throw error;
    }

    return data.id;
  }

  /**
   * Cria um novo pedido (com suporte offline)
   */
  async createOrder(companyId: string, order: Partial<Order>): Promise<string | null> {
    const isOnline = offlineQueueService.getIsOnline();
    const tempId = 'temp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

    if (!isOnline) {
      console.log('[OrderService] Offline, queuing creation of order');
      await offlineQueueService.enqueue('CREATE_ORDER', async () => {
        return this._createOrderInternal(companyId, order);
      }, { companyId, order });
      return tempId;
    }

    try {
      return await this._createOrderInternal(companyId, order);
    } catch (error: any) {
      if (isRetryableError(error) || error.message.includes('Network request failed') || error.message.includes('fetch')) {
        console.log('[OrderService] Network fail, queuing creation');
        await offlineQueueService.enqueue('CREATE_ORDER', async () => {
          return this._createOrderInternal(companyId, order);
        }, { companyId, order });
        return tempId;
      }
      throw error;
    }
  }

  async updateOrderStatus(companyId: string, orderId: string, status: string, additionalUpdates?: Partial<Order>) {
    const isOnline = offlineQueueService.getIsOnline();

    const operation = async () => {
      const payload = { status, ...this._mapUpdatesToPayload(additionalUpdates || {}) };
      const { error } = await supabase
        .from('orders')
        .update(payload)
        .eq('id', orderId)
        .eq('company_id', companyId);
      if (error) throw error;
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

  async updateOrder(companyId: string, orderId: string, updates: Partial<Order>) {
    const payload = this._mapUpdatesToPayload(updates);

    const operation = async () => {
      const { error } = await supabase
        .from('orders')
        .update(payload)
        .eq('id', orderId)
        .eq('company_id', companyId);
      if (error) throw error;
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

  private _mapUpdatesToPayload(updates: Partial<Order>) {
    const payload: any = {};
    if (updates.client) payload.client_name = updates.client;
    if (updates.items) payload.items = updates.items;
    if (updates.totalPrice) payload.total_amount = updates.totalPrice;
    if (updates.status) payload.status = updates.status;
    if (updates.observations) payload.observations = updates.observations;
    if (updates.timeInChurrasqueira) payload.time_in_churrasqueira = updates.timeInChurrasqueira;
    if (updates.timeInMontagem) payload.time_in_montagem = updates.timeInMontagem;
    if (updates.timeInProntos) payload.time_in_prontos = updates.timeInProntos;
    if (updates.deliveredAt) payload.delivered_at = updates.deliveredAt;
    if (updates.itemsWithStatus) payload.items_with_status = updates.itemsWithStatus;
    
    // Helper fields regarding who moved the order
    if ((updates as any).movidoParaMontagemPor) payload.movido_para_montagem_por = (updates as any).movidoParaMontagemPor;
    if ((updates as any).movidoParaProntoPor) payload.movido_para_pronto_por = (updates as any).movidoParaProntoPor;
    if ((updates as any).entreguePor) payload.entregue_por = (updates as any).entreguePor;

    return payload;
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
        table_number: parseInt(order.mesa?.toString().replace(/\D/g, '') || '0'),
        comanda_number: parseInt(order.comandaNumber || '0'),
        items: order.items,
        items_with_status: order.itemsWithStatus || [],
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
      console.error('[OrderService] Erro em getEstatisticasGarcom:', error);
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
        .select(`
          *,
          profiles:created_by (
            full_name
          )
        `)
        .eq('company_id', companyId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (error) throw error;

      const orders = (data || []).map(row => {
        const order = this.mapRowToOrder(row);
        // Add creator name from joined profile
        order.createdByName = row.profiles?.full_name || 'Desconhecido';
        return order;
      });
      
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
      console.error('[OrderService] Erro em getEstatisticasTodosGarcons:', error);
      return [];
    }
  }

  /**
   * Busca estatísticas de pagamentos
   */
  async getEstatisticasPagamentos(companyId: string, garcomId: string | null = null, periodo: string = 'hoje') {
    try {
      const { startDate, endDate } = this._getDateRange(periodo);
      
      console.log('[OrderService] 💳 getEstatisticasPagamentos:', { companyId, garcomId, periodo, startDate, endDate });
      
      if (garcomId) {
        // Para garçom específico: buscar pagamentos das comandas abertas por ele
        // Primeiro, buscar comandas do garçom
        const { data: comandas, error: comandasError } = await supabase
          .from('comandas')
          .select('comanda_number, date_key')
          .eq('company_id', companyId)
          .eq('opened_by', garcomId)
          .gte('opened_at', startDate.toISOString())
          .lte('opened_at', endDate.toISOString());

        if (comandasError) throw comandasError;

        if (!comandas || comandas.length === 0) {
          console.log('[OrderService] 💳 Nenhuma comanda encontrada para o garçom');
          return {
            dinheiro: { total: 0, quantidade: 0 },
            pix: { total: 0, quantidade: 0 },
            debito: { total: 0, quantidade: 0 },
            credito: { total: 0, quantidade: 0 },
          };
        }

        // Buscar pagamentos dessas comandas
        const comandaNumbers = comandas.map(c => String(c.comanda_number));
        const dateKeys = [...new Set(comandas.map(c => c.date_key))];

        const { data: pagamentos, error } = await supabase
          .from('pagamentos')
          .select('*')
          .eq('company_id', companyId)
          .in('comanda_number', comandaNumbers)
          .in('date_key', dateKeys);

        if (error) throw error;

        console.log('[OrderService] 💳 Pagamentos encontrados:', pagamentos?.length || 0);
        
        return this._agruparPagamentosPorForma(pagamentos || []);
      } else {
        // Para todos: buscar todos os pagamentos do período
        const { data: pagamentos, error } = await supabase
          .from('pagamentos')
          .select('*')
          .eq('company_id', companyId)
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString());

        if (error) throw error;

        console.log('[OrderService] 💳 Pagamentos encontrados (todos):', pagamentos?.length || 0);
        
        return this._agruparPagamentosPorForma(pagamentos || []);
      }
    } catch (error) {
      console.error('[OrderService] Erro em getEstatisticasPagamentos:', error);
      return {
        dinheiro: { total: 0, quantidade: 0 },
        pix: { total: 0, quantidade: 0 },
        debito: { total: 0, quantidade: 0 },
        credito: { total: 0, quantidade: 0 },
      };
    }
  }

  private _agruparPagamentosPorForma(pagamentos: any[]) {
    const stats = {
      dinheiro: { total: 0, quantidade: 0 },
      pix: { total: 0, quantidade: 0 },
      debito: { total: 0, quantidade: 0 },
      credito: { total: 0, quantidade: 0 },
    };

    pagamentos.forEach(p => {
      const metodo = p.payment_method?.toLowerCase() || '';
      const valor = p.amount || 0;

      if (metodo === 'dinheiro') {
        stats.dinheiro.total += valor;
        stats.dinheiro.quantidade += 1;
      } else if (metodo === 'pix') {
        stats.pix.total += valor;
        stats.pix.quantidade += 1;
      } else if (metodo === 'debito' || metodo === 'débito') {
        stats.debito.total += valor;
        stats.debito.quantidade += 1;
      } else if (metodo === 'credito' || metodo === 'crédito') {
        stats.credito.total += valor;
        stats.credito.quantidade += 1;
      }
    });

    console.log('[OrderService] 💳 Stats calculadas:', stats);
    return stats;
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
    
    const [vendasHoje, vendasSemana, vendasMes, pagamentosHoje, pagamentosSemana, pagamentosMes, comandasHoje, comandasSemana, comandasMes] = await Promise.all([
      this.getEstatisticasGarcom(companyId, garcomId, 'hoje'),
      this.getEstatisticasGarcom(companyId, garcomId, 'semana'),
      this.getEstatisticasGarcom(companyId, garcomId, periodoBase),
      this.getEstatisticasPagamentos(companyId, garcomId, 'hoje'),
      this.getEstatisticasPagamentos(companyId, garcomId, 'semana'),
      this.getEstatisticasPagamentos(companyId, garcomId, periodoBase),
      this.getEstatisticasComandas(companyId, garcomId, 'hoje'),
      this.getEstatisticasComandas(companyId, garcomId, 'semana'),
      this.getEstatisticasComandas(companyId, garcomId, periodoBase)
    ]);

    return {
      vendas: { hoje: vendasHoje, semana: vendasSemana, mes: vendasMes },
      pagamentos: { hoje: pagamentosHoje, semana: pagamentosSemana, mes: pagamentosMes },
      comandas: { hoje: comandasHoje, semana: comandasSemana, mes: comandasMes }
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

/**
 * Normaliza número de comanda para formato consistente
 * Exported as standalone function for compatibility
 */
export function normalizeComandaNumber(comandaNumber: string | number): string {
  // Remove espaços e converte para string
  const str = String(comandaNumber).trim();
  
  // Remove zeros à esquerda, mas mantém pelo menos um dígito
  const normalized = str.replace(/^0+/, '') || '0';
  
  return normalized;
}

export default new OrderFirestoreService();
