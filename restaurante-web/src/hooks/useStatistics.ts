/**
 * useStatistics.ts
 * Custom hook for statistics with caching and loading states
 * 
 * Requirements: 23.5
 */

import { useState, useEffect } from 'react';
import { serviceContainer } from '../services/ServiceContainer';
import StatisticsService, {
  WaiterStatistics,
  AllWaitersStatistics,
  PaymentStatistics,
  ComandaStatistics,
  CompleteStatistics
} from '../services/StatisticsService';
import { useAuth } from '../context/AuthContext';

// ============================================================================
// TYPES
// ============================================================================

interface UseStatisticsResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook for waiter statistics
 */
export const useWaiterStatistics = (
  waiterId?: string | null,
  period: string = 'hoje'
): UseStatisticsResult<WaiterStatistics> => {
  const { user } = useAuth();
  const [data, setData] = useState<WaiterStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const statisticsService = serviceContainer.get<typeof StatisticsService>('statisticsService');

  const loadStatistics = async () => {
    if (!user?.companyId) return;

    setLoading(true);
    setError(null);

    try {
      const stats = await statisticsService.getWaiterStatistics(
        user.companyId,
        waiterId,
        period
      );
      setData(stats);
    } catch (err) {
      setError(err as Error);
      console.error('[useWaiterStatistics] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatistics();
  }, [user?.companyId, waiterId, period]);

  return {
    data,
    loading,
    error,
    refresh: loadStatistics
  };
};

/**
 * Hook for all waiters statistics
 */
export const useAllWaitersStatistics = (
  period: string = 'hoje'
): UseStatisticsResult<AllWaitersStatistics> => {
  const { user } = useAuth();
  const [data, setData] = useState<AllWaitersStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const statisticsService = serviceContainer.get<typeof StatisticsService>('statisticsService');

  const loadStatistics = async () => {
    if (!user?.companyId) return;

    setLoading(true);
    setError(null);

    try {
      const stats = await statisticsService.getAllWaitersStatistics(
        user.companyId,
        period
      );
      setData(stats);
    } catch (err) {
      setError(err as Error);
      console.error('[useAllWaitersStatistics] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatistics();
  }, [user?.companyId, period]);

  return {
    data,
    loading,
    error,
    refresh: loadStatistics
  };
};

/**
 * Hook for payment statistics
 */
export const usePaymentStatistics = (
  waiterId?: string | null,
  period: string = 'hoje'
): UseStatisticsResult<PaymentStatistics> => {
  const { user } = useAuth();
  const [data, setData] = useState<PaymentStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const statisticsService = serviceContainer.get<typeof StatisticsService>('statisticsService');

  const loadStatistics = async () => {
    if (!user?.companyId) return;

    setLoading(true);
    setError(null);

    try {
      const stats = await statisticsService.getPaymentStatistics(
        user.companyId,
        waiterId,
        period
      );
      setData(stats);
    } catch (err) {
      setError(err as Error);
      console.error('[usePaymentStatistics] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatistics();
  }, [user?.companyId, waiterId, period]);

  return {
    data,
    loading,
    error,
    refresh: loadStatistics
  };
};

/**
 * Hook for comanda statistics
 */
export const useComandaStatistics = (
  waiterId?: string | null,
  period: string = 'hoje'
): UseStatisticsResult<ComandaStatistics> => {
  const { user } = useAuth();
  const [data, setData] = useState<ComandaStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const statisticsService = serviceContainer.get<typeof StatisticsService>('statisticsService');

  const loadStatistics = async () => {
    if (!user?.companyId) return;

    setLoading(true);
    setError(null);

    try {
      const stats = await statisticsService.getComandaStatistics(
        user.companyId,
        waiterId,
        period
      );
      setData(stats);
    } catch (err) {
      setError(err as Error);
      console.error('[useComandaStatistics] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatistics();
  }, [user?.companyId, waiterId, period]);

  return {
    data,
    loading,
    error,
    refresh: loadStatistics
  };
};

/**
 * Hook for complete statistics
 */
export const useCompleteStatistics = (
  waiterId?: string | null,
  monthYear?: string | null
): UseStatisticsResult<CompleteStatistics> => {
  const { user } = useAuth();
  const [data, setData] = useState<CompleteStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const statisticsService = serviceContainer.get<typeof StatisticsService>('statisticsService');

  const loadStatistics = async () => {
    if (!user?.companyId) return;

    setLoading(true);
    setError(null);

    try {
      const stats = await statisticsService.getCompleteStatistics(
        user.companyId,
        waiterId,
        monthYear
      );
      setData(stats);
    } catch (err) {
      setError(err as Error);
      console.error('[useCompleteStatistics] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatistics();
  }, [user?.companyId, waiterId, monthYear]);

  return {
    data,
    loading,
    error,
    refresh: loadStatistics
  };
};

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default {
  useWaiterStatistics,
  useAllWaitersStatistics,
  usePaymentStatistics,
  useComandaStatistics,
  useCompleteStatistics
};
