/**
 * Request Deduplication Service
 * 
 * Deduplicates concurrent identical requests to prevent redundant API calls
 * When multiple components request the same data simultaneously, only one
 * actual request is made and the result is shared among all requesters.
 * 
 * Requirement 12.3: Deduplicate concurrent identical requests
 */

export interface RequestOptions {
  ttl?: number; // Time to live for cached result in milliseconds
  forceRefresh?: boolean; // Bypass deduplication and force new request
}

export interface RequestMetrics {
  totalRequests: number;
  deduplicatedRequests: number;
  uniqueRequests: number;
  deduplicationRate: number;
}

/**
 * Request Deduplicator Class
 */
export class RequestDeduplicator {
  // Map of pending requests: key -> Promise
  private pendingRequests: Map<string, Promise<any>> = new Map();
  
  // Map of cached results: key -> { data, timestamp }
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  
  // Metrics tracking
  private metrics = {
    totalRequests: 0,
    deduplicatedRequests: 0,
    uniqueRequests: 0
  };

  // Default TTL for cached results (5 seconds)
  private defaultTTL: number = 5000;

  /**
   * Deduplicate a request
   * Requirement 12.3: Execute only one actual request for concurrent identical requests
   * 
   * @param key - Unique identifier for the request
   * @param fetcher - Function that performs the actual request
   * @param options - Request options (ttl, forceRefresh)
   * @returns Promise that resolves to the request result
   */
  async deduplicate<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: RequestOptions = {}
  ): Promise<T> {
    this.metrics.totalRequests++;

    const ttl = options.ttl ?? this.defaultTTL;

    // Check if we should force a refresh
    if (options.forceRefresh) {
      this.invalidate(key);
    }

    // Check cache first
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < ttl) {
      this.metrics.deduplicatedRequests++;
      return cached.data as T;
    }

    // Check if request is already pending
    if (this.pendingRequests.has(key)) {
      this.metrics.deduplicatedRequests++;
      return this.pendingRequests.get(key) as Promise<T>;
    }

    // Create new request
    this.metrics.uniqueRequests++;
    const promise = this.executeRequest(key, fetcher, ttl);
    
    // Store pending request
    this.pendingRequests.set(key, promise);

    return promise;
  }

  /**
   * Execute the actual request and handle cleanup
   */
  private async executeRequest<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number
  ): Promise<T> {
    try {
      const result = await fetcher();

      // Cache the result
      this.cache.set(key, {
        data: result,
        timestamp: Date.now()
      });

      return result;

    } finally {
      // Remove from pending requests
      this.pendingRequests.delete(key);
    }
  }

  /**
   * Invalidate a specific cached request
   */
  invalidate(key: string): void {
    this.cache.delete(key);
    this.pendingRequests.delete(key);
  }

  /**
   * Invalidate all cached requests matching a pattern
   */
  invalidatePattern(pattern: string | RegExp): void {
    const regex = typeof pattern === 'string' 
      ? new RegExp(pattern) 
      : pattern;

    const keysToDelete: string[] = [];

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => {
      this.cache.delete(key);
      this.pendingRequests.delete(key);
    });
  }

  /**
   * Clear all cached requests
   */
  clear(): void {
    this.cache.clear();
    this.pendingRequests.clear();
  }

  /**
   * Get deduplication metrics
   */
  getMetrics(): RequestMetrics {
    const deduplicationRate = this.metrics.totalRequests > 0
      ? (this.metrics.deduplicatedRequests / this.metrics.totalRequests) * 100
      : 0;

    return {
      totalRequests: this.metrics.totalRequests,
      deduplicatedRequests: this.metrics.deduplicatedRequests,
      uniqueRequests: this.metrics.uniqueRequests,
      deduplicationRate: Math.round(deduplicationRate * 100) / 100
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      deduplicatedRequests: 0,
      uniqueRequests: 0
    };
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      cacheSize: this.cache.size,
      pendingRequests: this.pendingRequests.size,
      cachedKeys: Array.from(this.cache.keys())
    };
  }

  /**
   * Set default TTL for cached results
   */
  setDefaultTTL(ttl: number): void {
    this.defaultTTL = ttl;
  }

  /**
   * Clean up expired cache entries
   */
  cleanupExpired(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp > this.defaultTTL) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Generate a cache key from request parameters
   * Useful for creating consistent keys for similar requests
   */
  static generateKey(
    endpoint: string,
    params?: Record<string, any>,
    method: string = 'GET'
  ): string {
    const paramString = params 
      ? JSON.stringify(params, Object.keys(params).sort())
      : '';
    return `${method}:${endpoint}:${paramString}`;
  }
}

// Singleton instance
export const requestDeduplicator = new RequestDeduplicator();

/**
 * Convenience function to deduplicate a request
 */
export async function deduplicateRequest<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: RequestOptions
): Promise<T> {
  return requestDeduplicator.deduplicate(key, fetcher, options);
}

/**
 * Higher-order function to wrap a function with deduplication
 */
export function withDeduplication<TArgs extends any[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  keyGenerator: (...args: TArgs) => string
): (...args: TArgs) => Promise<TResult> {
  return async (...args: TArgs): Promise<TResult> => {
    const key = keyGenerator(...args);
    return requestDeduplicator.deduplicate(key, () => fn(...args));
  };
}

/**
 * Decorator for class methods (TypeScript)
 */
export function Deduplicate(keyGenerator?: (...args: any[]) => string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const key = keyGenerator 
        ? keyGenerator(...args)
        : `${target.constructor.name}.${propertyKey}:${JSON.stringify(args)}`;

      return requestDeduplicator.deduplicate(
        key,
        () => originalMethod.apply(this, args)
      );
    };

    return descriptor;
  };
}
