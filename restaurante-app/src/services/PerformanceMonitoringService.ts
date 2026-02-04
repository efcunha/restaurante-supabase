/**
 * PerformanceMonitoringService - Firebase Performance Monitoring Integration
 * Tracks latency, Firestore operations, and custom metrics
 */

import { getPerformance, trace } from 'firebase/performance';
import app from '../config/firebaseConfig';

interface PerformanceMetrics {
  operationName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  success: boolean;
  errorMessage?: string;
  metadata?: Record<string, string>;
}

interface FirestoreMetrics {
  reads: number;
  writes: number;
  deletes: number;
  timestamp: number;
}

class PerformanceMonitoringService {
  private performance: any;
  private activeTraces: Map<string, any> = new Map();
  private metricsBuffer: PerformanceMetrics[] = [];
  private firestoreMetrics: FirestoreMetrics = {
    reads: 0,
    writes: 0,
    deletes: 0,
    timestamp: Date.now(),
  };
  private readonly METRICS_BUFFER_SIZE = 100;
  private readonly P95_LATENCY_THRESHOLD_MS = 500;
  private readonly ALERT_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
  private lastAlertTime: number = 0;

  constructor() {
    try {
      this.performance = getPerformance(app);
      console.log('[PerformanceMonitoring] Initialized successfully');
    } catch (error) {
      console.error('[PerformanceMonitoring] Initialization failed:', error);
    }
  }

  /**
   * Start tracking a custom operation
   */
  startTrace(traceName: string): void {
    try {
      if (!this.performance) return;

      const customTrace = trace(this.performance, traceName);
      customTrace.start();
      this.activeTraces.set(traceName, customTrace);

      console.log(`[PerformanceMonitoring] Started trace: ${traceName}`);
    } catch (error) {
      console.error(`[PerformanceMonitoring] Error starting trace ${traceName}:`, error);
    }
  }

  /**
   * Stop tracking a custom operation
   */
  stopTrace(traceName: string, metadata?: Record<string, string>): void {
    try {
      const customTrace = this.activeTraces.get(traceName);

      if (!customTrace) {
        console.warn(`[PerformanceMonitoring] No active trace found: ${traceName}`);
        return;
      }

      // Add custom attributes
      if (metadata) {
        Object.entries(metadata).forEach(([key, value]) => {
          customTrace.putAttribute(key, value);
        });
      }

      customTrace.stop();
      this.activeTraces.delete(traceName);

      console.log(`[PerformanceMonitoring] Stopped trace: ${traceName}`);
    } catch (error) {
      console.error(`[PerformanceMonitoring] Error stopping trace ${traceName}:`, error);
    }
  }

  /**
   * Track a critical operation with automatic timing
   */
  async trackOperation<T>(
    operationName: string,
    operation: () => Promise<T>,
    metadata?: Record<string, string>
  ): Promise<T> {
    const startTime = Date.now();
    let success = false;
    let errorMessage: string | undefined;

    this.startTrace(operationName);

    try {
      const result = await operation();
      success = true;
      return result;
    } catch (error: any) {
      success = false;
      errorMessage = error.message || 'Unknown error';
      throw error;
    } finally {
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Stop trace with metadata
      this.stopTrace(operationName, {
        ...metadata,
        success: String(success),
        duration: String(duration),
      });

      // Record metrics
      this.recordMetric({
        operationName,
        startTime,
        endTime,
        duration,
        success,
        errorMessage,
        metadata,
      });

      // Check for performance issues
      this.checkLatencyThreshold(operationName, duration);
    }
  }

  /**
   * Track Firestore read operation
   */
  trackFirestoreRead(count: number = 1): void {
    this.firestoreMetrics.reads += count;
    this.logFirestoreMetrics();
  }

  /**
   * Track Firestore write operation
   */
  trackFirestoreWrite(count: number = 1): void {
    this.firestoreMetrics.writes += count;
    this.logFirestoreMetrics();
  }

  /**
   * Track Firestore delete operation
   */
  trackFirestoreDelete(count: number = 1): void {
    this.firestoreMetrics.deletes += count;
    this.logFirestoreMetrics();
  }

  /**
   * Get current Firestore metrics
   */
  getFirestoreMetrics(): FirestoreMetrics {
    return { ...this.firestoreMetrics };
  }

  /**
   * Reset Firestore metrics
   */
  resetFirestoreMetrics(): void {
    this.firestoreMetrics = {
      reads: 0,
      writes: 0,
      deletes: 0,
      timestamp: Date.now(),
    };
  }

  /**
   * Record custom metric
   */
  private recordMetric(metric: PerformanceMetrics): void {
    this.metricsBuffer.push(metric);

    // Keep buffer size limited
    if (this.metricsBuffer.length > this.METRICS_BUFFER_SIZE) {
      this.metricsBuffer.shift();
    }
  }

  /**
   * Get P95 latency for an operation
   */
  getP95Latency(operationName?: string): number {
    let metrics = this.metricsBuffer;

    if (operationName) {
      metrics = metrics.filter(m => m.operationName === operationName);
    }

    if (metrics.length === 0) {
      return 0;
    }

    const durations = metrics
      .filter(m => m.duration !== undefined)
      .map(m => m.duration!)
      .sort((a, b) => a - b);

    if (durations.length === 0) {
      return 0;
    }

    const p95Index = Math.ceil(durations.length * 0.95) - 1;
    return durations[p95Index];
  }

  /**
   * Get average latency for an operation
   */
  getAverageLatency(operationName?: string): number {
    let metrics = this.metricsBuffer;

    if (operationName) {
      metrics = metrics.filter(m => m.operationName === operationName);
    }

    if (metrics.length === 0) {
      return 0;
    }

    const durations = metrics
      .filter(m => m.duration !== undefined)
      .map(m => m.duration!);

    if (durations.length === 0) {
      return 0;
    }

    const sum = durations.reduce((acc, d) => acc + d, 0);
    return sum / durations.length;
  }

  /**
   * Get success rate for an operation
   */
  getSuccessRate(operationName?: string): number {
    let metrics = this.metricsBuffer;

    if (operationName) {
      metrics = metrics.filter(m => m.operationName === operationName);
    }

    if (metrics.length === 0) {
      return 0;
    }

    const successCount = metrics.filter(m => m.success).length;
    return (successCount / metrics.length) * 100;
  }

  /**
   * Get all recorded metrics
   */
  getAllMetrics(): PerformanceMetrics[] {
    return [...this.metricsBuffer];
  }

  /**
   * Get metrics summary
   */
  getMetricsSummary(): {
    totalOperations: number;
    successRate: number;
    averageLatency: number;
    p95Latency: number;
    firestoreReads: number;
    firestoreWrites: number;
    firestoreDeletes: number;
  } {
    return {
      totalOperations: this.metricsBuffer.length,
      successRate: this.getSuccessRate(),
      averageLatency: this.getAverageLatency(),
      p95Latency: this.getP95Latency(),
      firestoreReads: this.firestoreMetrics.reads,
      firestoreWrites: this.firestoreMetrics.writes,
      firestoreDeletes: this.firestoreMetrics.deletes,
    };
  }

  /**
   * Check if latency exceeds threshold and trigger alert
   */
  private checkLatencyThreshold(operationName: string, duration: number): void {
    if (duration > this.P95_LATENCY_THRESHOLD_MS) {
      const now = Date.now();

      // Check cooldown to avoid alert spam
      if (now - this.lastAlertTime > this.ALERT_COOLDOWN_MS) {
        this.triggerLatencyAlert(operationName, duration);
        this.lastAlertTime = now;
      }
    }
  }

  /**
   * Trigger latency alert
   */
  private triggerLatencyAlert(operationName: string, duration: number): void {
    console.warn(
      `[PerformanceMonitoring] ⚠️ LATENCY ALERT: ${operationName} took ${duration}ms (threshold: ${this.P95_LATENCY_THRESHOLD_MS}ms)`
    );

    // In production, this could send to monitoring service
    // For now, just log to console
  }

  /**
   * Log Firestore metrics periodically
   */
  private logFirestoreMetrics(): void {
    const now = Date.now();
    const elapsed = now - this.firestoreMetrics.timestamp;

    // Log every 60 seconds
    if (elapsed > 60000) {
      console.log('[PerformanceMonitoring] Firestore Metrics:', {
        reads: this.firestoreMetrics.reads,
        writes: this.firestoreMetrics.writes,
        deletes: this.firestoreMetrics.deletes,
        duration: `${Math.round(elapsed / 1000)}s`,
      });

      // Reset for next period
      this.resetFirestoreMetrics();
    }
  }

  /**
   * Create performance dashboard data
   */
  getDashboardData(): {
    summary: ReturnType<typeof this.getMetricsSummary>;
    criticalOperations: Array<{
      name: string;
      avgLatency: number;
      p95Latency: number;
      successRate: number;
      count: number;
    }>;
    recentFailures: Array<{
      operation: string;
      error: string;
      timestamp: number;
    }>;
  } {
    const summary = this.getMetricsSummary();

    // Get unique operation names
    const operationNames = Array.from(
      new Set(this.metricsBuffer.map(m => m.operationName))
    );

    // Calculate metrics for each operation
    const criticalOperations = operationNames.map(name => ({
      name,
      avgLatency: this.getAverageLatency(name),
      p95Latency: this.getP95Latency(name),
      successRate: this.getSuccessRate(name),
      count: this.metricsBuffer.filter(m => m.operationName === name).length,
    }));

    // Get recent failures
    const recentFailures = this.metricsBuffer
      .filter(m => !m.success && m.errorMessage)
      .slice(-10)
      .map(m => ({
        operation: m.operationName,
        error: m.errorMessage!,
        timestamp: m.startTime,
      }));

    return {
      summary,
      criticalOperations,
      recentFailures,
    };
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(): string {
    const data = {
      exportedAt: new Date().toISOString(),
      summary: this.getMetricsSummary(),
      metrics: this.getAllMetrics(),
      firestoreMetrics: this.getFirestoreMetrics(),
    };

    return JSON.stringify(data, null, 2);
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metricsBuffer = [];
    this.resetFirestoreMetrics();
    console.log('[PerformanceMonitoring] All metrics cleared');
  }
}

export default new PerformanceMonitoringService();
