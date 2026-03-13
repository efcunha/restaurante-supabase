/**
 * Performance Metrics Hook
 * 
 * React hook for accessing performance metrics in the application.
 * Provides real-time access to query performance, cache hit rates, and connection pool stats.
 * 
 * Requirements: 11.1, 11.2, 11.3, 11.7
 */

import { useState, useEffect, useCallback } from 'react';
import { performanceMonitorService } from '../services/optimization/PerformanceMonitorService';
import { optimizedSupabaseClient } from '../services/optimization/OptimizedSupabaseClient';
import { cacheLayerService } from '../services/CacheLayerService';
import type { MetricsSummary, DashboardData } from '../types/performance';

/**
 * Hook for accessing performance metrics
 * 
 * @param refreshInterval - How often to refresh metrics (in ms), default 5000ms
 * @returns Performance metrics and refresh function
 */
export function usePerformanceMetrics(refreshInterval: number = 5000) {
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      const summary = await performanceMonitorService.getMetricsSummary();
      setMetrics(summary);
      setError(null);
    } catch (err) {
      setError(err as Error);
      console.error('[usePerformanceMetrics] Error fetching metrics:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    fetchMetrics();

    // Set up interval for auto-refresh
    const interval = setInterval(fetchMetrics, refreshInterval);

    return () => {
      clearInterval(interval);
    };
  }, [fetchMetrics, refreshInterval]);

  return {
    metrics,
    loading,
    error,
    refresh: fetchMetrics,
  };
}

/**
 * Hook for accessing dashboard data
 * 
 * @returns Dashboard data with visualizations
 */
export function usePerformanceDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const data = await performanceMonitorService.getDashboardData();
      setDashboardData(data);
      setError(null);
    } catch (err) {
      setError(err as Error);
      console.error('[usePerformanceDashboard] Error fetching dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return {
    dashboardData,
    loading,
    error,
    refresh: fetchDashboard,
  };
}

/**
 * Hook for accessing cache statistics
 * Requirements: 11.2
 * 
 * @returns Cache statistics
 */
export function useCacheStats() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const cacheStats = await cacheLayerService.getStats();
      setStats(cacheStats);
    } catch (err) {
      console.error('[useCacheStats] Error fetching cache stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    
    // Refresh every 10 seconds
    const interval = setInterval(fetchStats, 10000);
    
    return () => clearInterval(interval);
  }, [fetchStats]);

  return {
    stats,
    loading,
    refresh: fetchStats,
  };
}

/**
 * Hook for accessing connection pool statistics
 * Requirements: 11.3
 * 
 * @returns Connection pool statistics
 */
export function useConnectionPoolStats() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(() => {
    try {
      setLoading(true);
      const poolStats = optimizedSupabaseClient.getPoolStats();
      setStats(poolStats);
    } catch (err) {
      console.error('[useConnectionPoolStats] Error fetching pool stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    
    // Refresh every 5 seconds
    const interval = setInterval(fetchStats, 5000);
    
    return () => clearInterval(interval);
  }, [fetchStats]);

  return {
    stats,
    loading,
    refresh: fetchStats,
  };
}

/**
 * Hook for tracking a specific operation's performance
 * 
 * @param operationName - Name of the operation to track
 * @returns Function to execute and track the operation
 */
export function useOperationTracking(operationName: string) {
  const trackOperation = useCallback(
    async <T>(operation: () => Promise<T>): Promise<T> => {
      return performanceMonitorService.trackOperation(operationName, operation);
    },
    [operationName]
  );

  return { trackOperation };
}

/**
 * Hook for monitoring slow queries
 * Requirements: 11.1
 * 
 * @returns Recent slow queries
 */
export function useSlowQueries(limit: number = 10) {
  const [slowQueries, setSlowQueries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSlowQueries = useCallback(async () => {
    try {
      setLoading(true);
      // This would fetch from the query_performance_logs table
      // For now, we'll return an empty array as a placeholder
      setSlowQueries([]);
    } catch (err) {
      console.error('[useSlowQueries] Error fetching slow queries:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSlowQueries();
  }, [fetchSlowQueries]);

  return {
    slowQueries,
    loading,
    refresh: fetchSlowQueries,
  };
}
