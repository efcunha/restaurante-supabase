/**
 * PerformanceService - Simple utility for performance monitoring
 * Allows measuring execution times of critical operations.
 */

class PerformanceService {
  private activeMetrics: Map<string, number> = new Map();
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
    if (!this.enabled) return;
    this.activeMetrics.set(name, performance.now());
  }

  /**
   * Stop measuring and log the duration
   * @param name Unique name for the metric
   * @param metadata Optional metadata to log with the metric
   */
  end(name: string, metadata?: object): void {
    if (!this.enabled) return;
    
    const startTime = this.activeMetrics.get(name);
    if (startTime === undefined) {
      console.warn(`[Performance] Metric '${name}' was not started.`);
      return;
    }

    const duration = performance.now() - startTime;
    this.activeMetrics.delete(name);

    this.log(name, duration, metadata);
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
