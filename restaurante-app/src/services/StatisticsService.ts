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
  /**
   * Get waiter statistics for a period
   */
  async getWaiterStatistics(
    companyId: string,
    waiterId?: string | null,
    period: string = 'hoje'
  ): Promise<WaiterStatistics> {
    try {
      return await OrderFirestoreService.getEstatisticasGarcom(waiterId, period);
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
      return stats || { waiters: [], totalOrders: 0, totalRevenue: 0 };
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
      return stats || this._getEmptyPaymentStats();
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
      return stats || this._getEmptyComandaStats();
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
