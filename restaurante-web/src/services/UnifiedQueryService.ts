/**
 * Unified Query Service
 * 
 * Fornece interface unificada para buscar pedidos em active e archived collections.
 * Abstrai a complexidade de buscar em múltiplas collections.
 * 
 * Requirements: 17.4
 */

import { functions } from '../config/firebaseConfig';
import { httpsCallable } from 'firebase/functions';

/**
 * Filtros para query de pedidos
 */
export interface OrderQueryFilters {
  companyId: string;
  startDate?: string;
  endDate?: string;
  status?: 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  isPago?: boolean;
  comandaNumber?: string;
  includeArchived?: boolean;
  limit?: number;
}

/**
 * Resultado de query unificada
 */
export interface UnifiedQueryResult {
  orders: any[];
  count: number;
  hasArchived: boolean;
  sources: {
    active: number;
    archived: number;
  };
}

/**
 * Unified Query Service
 */
class UnifiedQueryService {
  /**
   * Busca pedido por ID (busca em active e archived)
   */
  async getOrderById(companyId: string, orderId: string): Promise<any> {
    try {
      const getOrderByIdFn = httpsCallable(functions, 'getOrderById');
      
      const result = await getOrderByIdFn({
        companyId,
        orderId
      });

      const data = result.data as any;

      if (!data.success) {
        throw new Error('Falha ao buscar pedido');
      }

      return {
        order: data.order,
        source: data.source,
        isArchived: data.source === 'archived'
      };

    } catch (error: any) {
      console.error('[UnifiedQueryService] Erro ao buscar pedido por ID', {
        companyId,
        orderId,
        error: error.message
      });

      // Se pedido não encontrado, retorna null ao invés de lançar erro
      if (error.code === 'not-found' || error.message?.includes('não encontrado')) {
        return null;
      }

      throw error;
    }
  }

  /**
   * Busca pedidos com filtros (busca em active e archived)
   */
  async queryOrders(filters: OrderQueryFilters): Promise<UnifiedQueryResult> {
    try {
      const queryOrdersFn = httpsCallable(functions, 'queryOrders');
      
      const result = await queryOrdersFn({
        companyId: filters.companyId,
        startDate: filters.startDate,
        endDate: filters.endDate,
        status: filters.status,
        isPago: filters.isPago,
        comandaNumber: filters.comandaNumber,
        includeArchived: filters.includeArchived !== false, // Default true
        limit: filters.limit || 100
      });

      const data = result.data as any;

      if (!data.success) {
        throw new Error('Falha ao consultar pedidos');
      }

      // Conta pedidos por source
      const activeCount = data.orders.filter((o: any) => o.source === 'active').length;
      const archivedCount = data.orders.filter((o: any) => o.source === 'archived').length;

      return {
        orders: data.orders,
        count: data.count,
        hasArchived: data.hasArchived,
        sources: {
          active: activeCount,
          archived: archivedCount
        }
      };

    } catch (error: any) {
      console.error('[UnifiedQueryService] Erro ao consultar pedidos', {
        filters,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * Busca pedidos por comanda (busca em active e archived)
   */
  async getOrdersByComanda(
    companyId: string,
    comandaNumber: string,
    includeArchived: boolean = true
  ): Promise<UnifiedQueryResult> {
    return this.queryOrders({
      companyId,
      comandaNumber,
      includeArchived
    });
  }

  /**
   * Busca pedidos por intervalo de datas (busca em active e archived)
   */
  async getOrdersByDateRange(
    companyId: string,
    startDate: string,
    endDate: string,
    includeArchived: boolean = true
  ): Promise<UnifiedQueryResult> {
    return this.queryOrders({
      companyId,
      startDate,
      endDate,
      includeArchived
    });
  }

  /**
   * Busca pedidos por status (busca em active e archived)
   */
  async getOrdersByStatus(
    companyId: string,
    status: 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled',
    includeArchived: boolean = false // Default false para status queries
  ): Promise<UnifiedQueryResult> {
    return this.queryOrders({
      companyId,
      status,
      includeArchived
    });
  }

  /**
   * Busca pedidos pagos/não pagos (busca em active e archived)
   */
  async getOrdersByPaymentStatus(
    companyId: string,
    isPago: boolean,
    includeArchived: boolean = true
  ): Promise<UnifiedQueryResult> {
    return this.queryOrders({
      companyId,
      isPago,
      includeArchived
    });
  }

  /**
   * Obtém estatísticas de arquivamento
   * Apenas para administradores
   */
  async getArchivalStats(companyId: string): Promise<any> {
    try {
      const getArchivalStatsFn = httpsCallable(functions, 'getArchivalStats');
      
      const result = await getArchivalStatsFn({
        companyId
      });

      const data = result.data as any;

      if (!data.success) {
        throw new Error('Falha ao buscar estatísticas de arquivamento');
      }

      return data.stats;

    } catch (error: any) {
      console.error('[UnifiedQueryService] Erro ao buscar estatísticas de arquivamento', {
        companyId,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * Verifica se um pedido está arquivado
   */
  async isOrderArchived(companyId: string, orderId: string): Promise<boolean> {
    try {
      const result = await this.getOrderById(companyId, orderId);
      return result?.isArchived || false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Busca pedidos recentes (últimos 30 dias, apenas active)
   */
  async getRecentOrders(companyId: string, days: number = 30): Promise<UnifiedQueryResult> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.queryOrders({
      companyId,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      includeArchived: false // Apenas active para pedidos recentes
    });
  }

  /**
   * Busca histórico completo (active + archived)
   */
  async getFullHistory(
    companyId: string,
    startDate?: string,
    endDate?: string,
    limit: number = 500
  ): Promise<UnifiedQueryResult> {
    return this.queryOrders({
      companyId,
      startDate,
      endDate,
      includeArchived: true,
      limit
    });
  }
}

// Singleton instance
export const unifiedQueryService = new UnifiedQueryService();

// Export para testes
export { UnifiedQueryService };
