/**
 * Performance Monitor Service - Comprehensive Performance Monitoring
 * 
 * Monitors and tracks performance metrics across the application:
 * - Operation tracking with timing
 * - Slow query logging (>100ms)
 * - Metrics aggregation (avg, p95, p99)
 * - Performance degradation alerting
 * - Database resource monitoring
 * - Dashboard data generation
 * 
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7
 */

import { supabase } from '../../config/SupabaseConfig';
import type {
  PerformanceMetric,
  MetricsSummary,
  DashboardData,
  QueryMetric,
  CacheMetric,
  ConnectionMetric,
  RealtimeMetric,
  QueryPerformanceLog
} from '../../types/performance';

/**
 * Baseline performance tracking for degradation detection
 */
interface PerformanceBaseline {
  operationName: string;
  averageLatency: number;
  p95Latency: number;
  sampleCount: number;
  lastUpdated: Date;
}

/**
 * Performance alert
 */
interface PerformanceAlert {
  operationName: string;
  currentLatency: number;
  baselineLatency: number;
  degradationPercent: number;
  timestamp: Date;
}

/**
 * Database resource metrics
 */
interface DatabaseResourceMetrics {
  cpuUsage: number;
  memoryUsage: number;
  activeConnections: number;
  timestamp: Date;
}

/**
 * Performance Monitor Service
 */
class PerformanceMonitorService {
  private metrics: PerformanceMetric[] = [];
  private baselines: Map<string, PerformanceBaseline> = new Map();
  private alerts: PerformanceAlert[] = [];

  private readonly MAX_METRICS_BUFFER = 1000;
  private readonly SLOW_QUERY_THRESHOLD_MS = 100;
  private readonly DEGRADATION_THRESHOLD_PERCENT = 50;
  private readonly BASELINE_SAMPLE_SIZE = 100;

  constructor() {
    console.log('[PerformanceMonitor] Service initialized');
  }

  /**
   * Track an operation with automatic timing
   * Requirements: 11.1
   */
  async trackOperation<T>(
    name: string,
    operation: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const startTime = Date.now();
    let success = true;
    let error: Error | undefined;

    try {
      const result = await operation();
      return result;
    } catch (err: any) {
      success = false;
      error = err;
      throw err;
    } finally {
      const endTime = Date.now();
      const executionTime = endTime - startTime;

      // Record metric
      this.recordMetric({
        id: this.generateId(),
        metricType: 'query',
        operationName: name,
        value: executionTime,
        unit: 'ms',
        timestamp: new Date(),
        metadata: {
          ...metadata,
          success,
          error: error?.message
        }
      });

      // Check for performance degradation
      this.checkPerformanceDegradation(name, executionTime);

      // Update baseline
      this.updateBaseline(name, executionTime);
    }
  }

  /**
   * Log slow query to database
   * Requirements: 11.1
   */
  async logSlowQuery(
    query: string,
    executionTime: number,
    plan: any,
    companyId?: string
  ): Promise<void> {
    // Only log if exceeds threshold
    if (executionTime < this.SLOW_QUERY_THRESHOLD_MS) {
      return;
    }

    try {
      const logEntry: any = { // Using any to bypass strict type check issue temporarily or update type
        query,
        execution_time: executionTime,
        rows_scanned: plan?.rowsScanned || 0,
        rows_returned: plan?.rowsReturned || 0,
        indexes_used: plan?.indexesUsed || [],
        execution_plan: plan,
        timestamp: new Date(),
        company_id: companyId || null
      };

      // Store in query_performance_logs table
      const { error } = await supabase
        .from('query_performance_logs')
        .insert(logEntry);

      if (error) {
        console.error('[PerformanceMonitor] Failed to log slow query:', error);
      } else {
        console.warn(
          `[PerformanceMonitor] Slow query logged: ${executionTime}ms - ${query.substring(0, 100)}`
        );
      }
    } catch (error) {
      console.error('[PerformanceMonitor] Error logging slow query:', error);
    }
  }

  /**
   * Get metrics summary with aggregations
   * Requirements: 11.2, 11.3
   */
  getMetricsSummary(): MetricsSummary {
    const queryMetrics = this.metrics.filter(m => m.metricType === 'query');
    const latencies = queryMetrics.map(m => m.value);

    return {
      totalOperations: queryMetrics.length,
      averageLatency: this.calculateAverage(latencies),
      p95Latency: this.calculatePercentile(latencies, 95),
      p99Latency: this.calculatePercentile(latencies, 99),
      slowQueries: queryMetrics.filter(m => m.value > this.SLOW_QUERY_THRESHOLD_MS).length,
      cacheHitRate: this.getCacheHitRate(),
      connectionPoolUtilization: this.getConnectionPoolUtilization()
    };
  }

  /**
   * Get dashboard data for visualization
   * Requirements: 11.7
   */
  getDashboardData(): DashboardData {
    const summary = this.getMetricsSummary();

    return {
      summary,
      queryMetrics: this.getQueryMetrics(),
      cacheMetrics: this.getCacheMetrics(),
      connectionMetrics: this.getConnectionMetrics(),
      realtimeMetrics: this.getRealtimeMetrics()
    };
  }

  /**
   * Collect database resource metrics
   * Requirements: 11.5
   */
  async collectDatabaseResourceMetrics(): Promise<DatabaseResourceMetrics> {
    try {
      // Query pg_stat_database for database stats
      const { data: dbStats, error: dbError } = await supabase.rpc('execute_sql', {
        query: `
          SELECT 
            numbackends as active_connections,
            blks_read,
            blks_hit,
            tup_returned,
            tup_fetched
          FROM pg_stat_database 
          WHERE datname = current_database()
        `
      });

      if (dbError) {
        console.error('[PerformanceMonitor] Error querying pg_stat_database:', dbError);
      }

      // Query pg_stat_activity for connection info
      const { data: activityStats, error: activityError } = await supabase.rpc('execute_sql', {
        query: `
          SELECT 
            COUNT(*) as total_connections,
            COUNT(*) FILTER (WHERE state = 'active') as active_queries
          FROM pg_stat_activity
          WHERE datname = current_database()
        `
      });

      if (activityError) {
        console.error('[PerformanceMonitor] Error querying pg_stat_activity:', activityError);
      }

      // Calculate metrics (simplified - actual CPU/memory would need system-level access)
      const metrics: DatabaseResourceMetrics = {
        cpuUsage: 0, // Would need system-level monitoring
        memoryUsage: 0, // Would need system-level monitoring
        activeConnections: activityStats?.[0]?.total_connections || 0,
        timestamp: new Date()
      };

      // Record as metric
      this.recordMetric({
        id: this.generateId(),
        metricType: 'connection',
        operationName: 'database_resources',
        value: metrics.activeConnections,
        unit: 'count',
        timestamp: new Date(),
        metadata: metrics
      });

      return metrics;
    } catch (error) {
      console.error('[PerformanceMonitor] Error collecting database metrics:', error);
      return {
        cpuUsage: 0,
        memoryUsage: 0,
        activeConnections: 0,
        timestamp: new Date()
      };
    }
  }

  /**
   * Check for performance degradation
   * Requirements: 11.6
   */
  private checkPerformanceDegradation(operationName: string, currentLatency: number): void {
    const baseline = this.baselines.get(operationName);

    if (!baseline || baseline.sampleCount < this.BASELINE_SAMPLE_SIZE) {
      // Not enough data for baseline
      return;
    }

    const baselineLatency = baseline.p95Latency;
    const degradationPercent = ((currentLatency - baselineLatency) / baselineLatency) * 100;

    if (degradationPercent > this.DEGRADATION_THRESHOLD_PERCENT) {
      const alert: PerformanceAlert = {
        operationName,
        currentLatency,
        baselineLatency,
        degradationPercent,
        timestamp: new Date()
      };

      this.alerts.push(alert);

      console.warn(
        `[PerformanceMonitor] ⚠️ PERFORMANCE DEGRADATION ALERT: ${operationName}`,
        `Current: ${currentLatency}ms, Baseline: ${baselineLatency.toFixed(2)}ms`,
        `Degradation: ${degradationPercent.toFixed(1)}%`
      );
    }
  }

  /**
   * Update performance baseline
   */
  private updateBaseline(operationName: string, latency: number): void {
    let baseline = this.baselines.get(operationName);

    if (!baseline) {
      baseline = {
        operationName,
        averageLatency: latency,
        p95Latency: latency,
        sampleCount: 1,
        lastUpdated: new Date()
      };
      this.baselines.set(operationName, baseline);
      return;
    }

    // Update running average
    const newCount = baseline.sampleCount + 1;
    baseline.averageLatency =
      (baseline.averageLatency * baseline.sampleCount + latency) / newCount;
    baseline.sampleCount = newCount;
    baseline.lastUpdated = new Date();

    // Recalculate p95 from recent metrics
    const recentMetrics = this.metrics
      .filter(m => m.operationName === operationName)
      .slice(-100)
      .map(m => m.value);

    baseline.p95Latency = this.calculatePercentile(recentMetrics, 95);
  }

  /**
   * Record a performance metric
   */
  private recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);

    // Keep buffer size limited
    if (this.metrics.length > this.MAX_METRICS_BUFFER) {
      this.metrics.shift();
    }
  }

  /**
   * Calculate average of values
   */
  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    const sum = values.reduce((acc, val) => acc + val, 0);
    return sum / values.length;
  }

  /**
   * Calculate percentile
   */
  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Get cache hit rate from metrics
   */
  private getCacheHitRate(): number {
    const cacheMetrics = this.metrics.filter(m => m.metricType === 'cache');
    if (cacheMetrics.length === 0) return 0;

    const hits = cacheMetrics.filter(m => m.metadata?.hit === true).length;
    return (hits / cacheMetrics.length) * 100;
  }

  /**
   * Get connection pool utilization from metrics
   */
  private getConnectionPoolUtilization(): number {
    const connectionMetrics = this.metrics
      .filter(m => m.metricType === 'connection')
      .slice(-10);

    if (connectionMetrics.length === 0) return 0;

    const utilizations = connectionMetrics
      .map(m => m.metadata?.utilization || 0)
      .filter(u => u > 0);

    return this.calculateAverage(utilizations);
  }

  /**
   * Get query metrics for dashboard
   */
  private getQueryMetrics(): QueryMetric[] {
    return this.metrics
      .filter(m => m.metricType === 'query')
      .slice(-50)
      .map(m => ({
        query: m.operationName,
        executionTime: m.value,
        rowsScanned: m.metadata?.rowsScanned || 0,
        rowsReturned: m.metadata?.rowsReturned || 0,
        timestamp: m.timestamp
      }));
  }

  /**
   * Get cache metrics for dashboard
   */
  private getCacheMetrics(): CacheMetric[] {
    const cacheOps = new Map<string, { hits: number; misses: number }>();

    this.metrics
      .filter(m => m.metricType === 'cache')
      .forEach(m => {
        const key = m.operationName;
        if (!cacheOps.has(key)) {
          cacheOps.set(key, { hits: 0, misses: 0 });
        }
        const stats = cacheOps.get(key)!;
        if (m.metadata?.hit) {
          stats.hits++;
        } else {
          stats.misses++;
        }
      });

    return Array.from(cacheOps.entries()).map(([key, stats]) => ({
      key,
      hits: stats.hits,
      misses: stats.misses,
      hitRate: (stats.hits / (stats.hits + stats.misses)) * 100,
      timestamp: new Date()
    }));
  }

  /**
   * Get connection metrics for dashboard
   */
  private getConnectionMetrics(): ConnectionMetric[] {
    return this.metrics
      .filter(m => m.metricType === 'connection')
      .slice(-50)
      .map(m => ({
        active: m.metadata?.active || 0,
        idle: m.metadata?.idle || 0,
        waiting: m.metadata?.waiting || 0,
        utilization: m.metadata?.utilization || 0,
        timestamp: m.timestamp
      }));
  }

  /**
   * Get realtime metrics for dashboard
   */
  private getRealtimeMetrics(): RealtimeMetric[] {
    return this.metrics
      .filter(m => m.metricType === 'realtime')
      .slice(-50)
      .map(m => ({
        channel: m.operationName,
        messagesReceived: m.metadata?.messagesReceived || 0,
        latency: m.value,
        timestamp: m.timestamp
      }));
  }

  /**
   * Get recent alerts
   */
  getRecentAlerts(limit: number = 10): PerformanceAlert[] {
    return this.alerts.slice(-limit);
  }

  /**
   * Clear all metrics and baselines
   */
  clear(): void {
    this.metrics = [];
    this.baselines.clear();
    this.alerts = [];
    console.log('[PerformanceMonitor] All metrics cleared');
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton instance
export const performanceMonitorService = new PerformanceMonitorService();

// Export for tests
export { PerformanceMonitorService };
export type { PerformanceBaseline, PerformanceAlert, DatabaseResourceMetrics };
