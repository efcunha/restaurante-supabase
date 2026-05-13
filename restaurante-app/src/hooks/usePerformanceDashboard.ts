/**
 * usePerformanceDashboard Hook
 * 
 * Custom hook for fetching and managing performance dashboard data
 * Provides real-time updates and refresh capabilities
 * 
 * Requirements: 11.7
 */

import { useState, useEffect, useCallback } from 'react';
import { performanceMonitorService } from '../services/optimization/PerformanceMonitorService';
import type { DashboardData } from '../types/performance';

interface UsePerformanceDashboardResult {
  dashboardData: DashboardData | null;
  loading: boolean;
  error: Error | null;
  refresh: () => void;
}

/**
 * Hook for managing performance dashboard data
 * 
 * @param autoRefreshInterval - Auto-refresh interval in milliseconds (default: 10000)
 * @returns Dashboard data, loading state, error, and refresh function
 */
export function usePerformanceDashboard(
  autoRefreshInterval: number = 10000
): UsePerformanceDashboardResult {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchDashboardData = useCallback(() => {
    try {
      const data = performanceMonitorService.getDashboardData();
      setDashboardData(data);
      setError(null);
      setLoading(false);
    } catch (err) {
      console.error('[usePerformanceDashboard] Error fetching data:', err);
      setError(err as Error);
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(() => {
    setLoading(true);
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    // Initial fetch
    fetchDashboardData();

    // Set up auto-refresh
    const intervalId = setInterval(fetchDashboardData, autoRefreshInterval);

    // Cleanup
    return () => clearInterval(intervalId);
  }, [fetchDashboardData, autoRefreshInterval]);

  return {
    dashboardData,
    loading,
    error,
    refresh,
  };
}

/**
 * Hook for collecting database resource metrics
 * 
 * @param interval - Collection interval in milliseconds (default: 30000)
 */
export function useResourceMetrics(interval: number = 30000) {
  const [collecting, setCollecting] = useState(false);

  useEffect(() => {
    const collectMetrics = async () => {
      if (collecting) return;
      
      setCollecting(true);
      try {
        await performanceMonitorService.collectDatabaseResourceMetrics();
      } catch (error) {
        console.error('[useResourceMetrics] Error collecting metrics:', error);
      } finally {
        setCollecting(false);
      }
    };

    // Initial collection
    collectMetrics();

    // Set up periodic collection
    const intervalId = setInterval(collectMetrics, interval);

    // Cleanup
    return () => clearInterval(intervalId);
  }, [interval, collecting]);

  return { collecting };
}
