/**
 * StatisticsService.ts
 * Handles all statistics calculations and queries
 * 
 * Requirements: 23.1, 23.2
 */

import OrderFirestoreService from './OrderFirestoreService';

// ============================================================================
// TYPES
// ============================================================================

export interface WaiterStatistics {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  paidOrders: number;
  unpaidOrders: number;
  ordersByStatus: Record<string, number>;
}

export interface AllWaitersStatistics {
  waiters: Array<{
    id: string;
    name: string;
    totalOrders: number;
    totalRevenue: number;
  }>;
  totalOrders: number;
  totalRevenue: number;
}

export interface PaymentStatistics {
  totalPaid: number;
  totalUnpaid: number;
  paymentMethods: Record<string, number>;
  averagePayment: number;
}

export interface ComandaStatistics {
  totalComandas: number;
  openComandas: number;
  closedComandas: number;
  averageComandaValue: number;
}

export interface CompleteStatistics {
  waiter: WaiterStatistics;
  payments: PaymentStatistics;
  comandas: ComandaStatistics;
  period: string;
}

// ============================================================================
// STATISTICS SERVICE
// ============================================================================

/**
 * StatisticsService
 * Centralized service for all statistics operations
 */
class StatisticsService {
  private _toNumber(value: unknown): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
  }

  private _mapWaiterStatistics(raw: unknown): WaiterStatistics {
    if (!raw || typeof raw !== 'object') return this._getEmptyWaiterStats();

    const data = raw as Record<string, unknown>;
    const totalOrders = this._toNumber(data.totalOrders ?? data.totalPedidos);
    const totalRevenue = this._toNumber(data.totalRevenue ?? data.totalVendido);
    const averageOrderValue = this._toNumber(
      data.averageOrderValue ??
      data.ticketMedio ??
      (totalOrders > 0 ? totalRevenue / totalOrders : 0)
    );

    return {
      totalOrders,
      totalRevenue,
      averageOrderValue,
      paidOrders: this._toNumber(data.paidOrders),
      unpaidOrders: this._toNumber(data.unpaidOrders),
      ordersByStatus:
        data.ordersByStatus && typeof data.ordersByStatus === 'object'
          ? (data.ordersByStatus as Record<string, number>)
          : {}
    };
  }

  private _mapAllWaitersStatistics(raw: unknown): AllWaitersStatistics {
    const emptyResult: AllWaitersStatistics = { waiters: [], totalOrders: 0, totalRevenue: 0 };
    if (!raw) return emptyResult;

    const list = Array.isArray(raw)
      ? raw
      : (raw as { waiters?: unknown })?.waiters;

    if (!Array.isArray(list)) return emptyResult;

    const waiters = list
      .filter(item => item && typeof item === 'object')
      .map(item => {
        const data = item as Record<string, unknown>;
        return {
          id: String(data.id ?? data.garcomId ?? ''),
          name: String(data.name ?? data.garcomNome ?? ''),
          totalOrders: this._toNumber(data.totalOrders ?? data.totalPedidos),
          totalRevenue: this._toNumber(data.totalRevenue ?? data.totalVendido)
        };
      });

    const totalOrders = waiters.reduce((sum, waiter) => sum + waiter.totalOrders, 0);
    const totalRevenue = waiters.reduce((sum, waiter) => sum + waiter.totalRevenue, 0);

    return { waiters, totalOrders, totalRevenue };
  }

  private _mapPaymentStatistics(raw: unknown): PaymentStatistics {
    if (!raw || typeof raw !== 'object') return this._getEmptyPaymentStats();

    const data = raw as Record<string, unknown>;
    const directTotalPaid = this._toNumber(data.totalPaid);
    const directTotalUnpaid = this._toNumber(data.totalUnpaid ?? data.totalAberto);

    const paymentMethods: Record<string, number> = {};
    let inferredTotalPaid = 0;
    let totalPayments = 0;

    ['dinheiro', 'pix', 'debito', 'credito'].forEach(method => {
      const methodData = data[method];
      if (methodData && typeof methodData === 'object') {
        const methodRecord = methodData as Record<string, unknown>;
        const total = this._toNumber(methodRecord.total);
        const quantity = this._toNumber(methodRecord.quantidade);

        paymentMethods[method] = quantity;
        inferredTotalPaid += total;
        totalPayments += quantity;
      }
    });

    const totalPaid = directTotalPaid || inferredTotalPaid;
    const totalUnpaid = directTotalUnpaid;
    const averagePayment =
      this._toNumber(data.averagePayment) ||
      (totalPayments > 0 ? totalPaid / totalPayments : 0);

    return {
      totalPaid,
      totalUnpaid,
      paymentMethods,
      averagePayment
    };
  }

  private _mapComandaStatistics(raw: unknown): ComandaStatistics {
    if (!raw || typeof raw !== 'object') return this._getEmptyComandaStats();

    const data = raw as Record<string, unknown>;
    const totalComandas = this._toNumber(data.totalComandas ?? data.total);
    const openComandas = this._toNumber(data.openComandas ?? data.abertas);
    const closedComandas = this._toNumber(data.closedComandas ?? data.fechadas);
    const totalConsumed = this._toNumber(data.totalConsumido);

    return {
      totalComandas,
      openComandas,
      closedComandas,
      averageComandaValue:
        this._toNumber(data.averageComandaValue) ||
        (totalComandas > 0 ? totalConsumed / totalComandas : 0)
    };
  }

  /**
   * Get waiter statistics for a period
   */
  async getWaiterStatistics(
    companyId: string,
    waiterId?: string | null,
    period: string = 'hoje'
  ): Promise<WaiterStatistics> {
    try {
      const stats = await OrderFirestoreService.getEstatisticasGarcom(waiterId ?? '', period);
      return this._mapWaiterStatistics(stats);
    } catch (error) {
      console.error('[StatisticsService] Error getting waiter statistics:', error);
      return this._getEmptyWaiterStats();
    }
  }

  /**
   * Get all waiters statistics
   */
  async getAllWaitersStatistics(
    companyId: string,
    period: string = 'hoje'
  ): Promise<AllWaitersStatistics> {
    try {
      const stats = await OrderFirestoreService.getEstatisticasTodosGarcons(companyId, period);
      return this._mapAllWaitersStatistics(stats);
    } catch (error) {
      console.error('[StatisticsService] Error getting all waiters statistics:', error);
      return { waiters: [], totalOrders: 0, totalRevenue: 0 };
    }
  }

  /**
   * Get payment statistics
   */
  async getPaymentStatistics(
    companyId: string,
    waiterId?: string | null,
    period: string = 'hoje'
  ): Promise<PaymentStatistics> {
    try {
      const stats = await OrderFirestoreService.getEstatisticasPagamentos(companyId, waiterId, period);
      return this._mapPaymentStatistics(stats);
    } catch (error) {
      console.error('[StatisticsService] Error getting payment statistics:', error);
      return this._getEmptyPaymentStats();
    }
  }

  /**
   * Get comanda statistics
   */
  async getComandaStatistics(
    companyId: string,
    waiterId?: string | null,
    period: string = 'hoje'
  ): Promise<ComandaStatistics> {
    try {
      const stats = await OrderFirestoreService.getEstatisticasComandas(companyId, waiterId, period);
      return this._mapComandaStatistics(stats);
    } catch (error) {
      console.error('[StatisticsService] Error getting comanda statistics:', error);
      return this._getEmptyComandaStats();
    }
  }

  /**
   * Get complete statistics
   */
  async getCompleteStatistics(
    companyId: string,
    waiterId?: string | null,
    monthYear?: string | null
  ): Promise<CompleteStatistics> {
    try {
      // Get all statistics in parallel
      const [waiter, payments, comandas] = await Promise.all([
        this.getWaiterStatistics(companyId, waiterId, monthYear || 'hoje'),
        this.getPaymentStatistics(companyId, waiterId, monthYear || 'hoje'),
        this.getComandaStatistics(companyId, waiterId, monthYear || 'hoje')
      ]);

      return {
        waiter,
        payments,
        comandas,
        period: monthYear || 'hoje'
      };
    } catch (error) {
      console.error('[StatisticsService] Error getting complete statistics:', error);
      return {
        waiter: this._getEmptyWaiterStats(),
        payments: this._getEmptyPaymentStats(),
        comandas: this._getEmptyComandaStats(),
        period: monthYear || 'hoje'
      };
    }
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private _getEmptyWaiterStats(): WaiterStatistics {
    return {
      totalOrders: 0,
      totalRevenue: 0,
      averageOrderValue: 0,
      paidOrders: 0,
      unpaidOrders: 0,
      ordersByStatus: {}
    };
  }

  private _getEmptyPaymentStats(): PaymentStatistics {
    return {
      totalPaid: 0,
      totalUnpaid: 0,
      paymentMethods: {},
      averagePayment: 0
    };
  }

  private _getEmptyComandaStats(): ComandaStatistics {
    return {
      totalComandas: 0,
      openComandas: 0,
      closedComandas: 0,
      averageComandaValue: 0
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export default new StatisticsService();
