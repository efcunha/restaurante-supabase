/**
 * PerformanceService - Simple utility for performance monitoring
 * Allows measuring execution times of critical operations.
 */

import { perf } from '../config/firebaseConfig';
import { trace, Trace } from 'firebase/performance';

class PerformanceService {
  private activeMetrics: Map<string, number> = new Map();
  private activeTraces: Map<string, Trace> = new Map();
  private enabled: boolean = true;

  constructor() {
    // We can enable/disable based on environment
    this.enabled = __DEV__;
  }

  /**
   * Start measuring a metric
   * @param name Unique name for the metric
   */
  start(name: string): void {
    // Console measurement
    if (this.enabled) {
        this.activeMetrics.set(name, performance.now());
    }

    // Firebase Performance Trace
    if (perf) {
        try {
            const t = trace(perf, name);
            t.start();
            this.activeTraces.set(name, t);
        } catch (e) {
            // Silece error to not break app flow
            if (__DEV__) console.warn('[Performance] Failed to start trace:', e);
        }
    }
  }

  /**
   * Stop measuring and log the duration
   * @param name Unique name for the metric
   * @param metadata Optional metadata to log with the metric
   */
  end(name: string, metadata?: object): void {
    // 1. Console Logging
    if (this.enabled) {
        const startTime = this.activeMetrics.get(name);
        if (startTime !== undefined) {
            const duration = performance.now() - startTime;
            this.activeMetrics.delete(name);
            this.log(name, duration, metadata);
        }
    }

    // 2. Firebase Performance Trace
    const t = this.activeTraces.get(name);
    if (t) {
        if (metadata) {
            Object.entries(metadata).forEach(([k, v]) => {
                t.putAttribute(k, String(v));
            });
        }
        t.stop();
        this.activeTraces.delete(name);
    }
  }

  /**
   * Log a metric duration directly
   */
  log(name: string, durationMs: number, metadata?: object): void {
    if (!this.enabled) return;

    const metaStr = metadata ? ` ${JSON.stringify(metadata)}` : '';
    let color = '';
    
    // Add simple color coding for console
    if (durationMs > 1000) color = '⚠️ '; // Slow
    else if (durationMs > 500) color = '⏱️ '; // Moderate
    else color = '✅ '; // Fast

    console.log(`${color}[Performance] ${name}: ${durationMs.toFixed(2)}ms${metaStr}`);
  }

  /**
   * Measure an async function's execution time
   */
  async measure<T>(name: string, fn: () => Promise<T>): Promise<T> {
    this.start(name);
    try {
      return await fn();
    } finally {
      this.end(name);
    }
  }
}

export default new PerformanceService();
