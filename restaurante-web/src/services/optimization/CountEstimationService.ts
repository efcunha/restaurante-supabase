/**
 * Count Estimation Service
 * 
 * Provides fast count estimation without full table scans
 * Uses PostgreSQL pg_class statistics for O(1) count estimation
 * 
 * Requirement 9.6: Avoid full table scans for total counts
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../../config/SupabaseConfig';

export interface CountEstimationOptions {
  table: string;
  filters?: Record<string, any>;
  useExact?: boolean; // Force exact count (slower)
}

export interface CountEstimationResult {
  count: number;
  isEstimate: boolean;
  executionTime?: number;
}

/**
 * Count Estimation Service
 */
export class CountEstimationService {
  private client: SupabaseClient;
  private cache: Map<string, { count: number; timestamp: number }> = new Map();
  private cacheTTL: number = 60000; // 1 minute

  constructor(client?: SupabaseClient) {
    this.client = client || supabase;
  }

  /**
   * Get estimated count for a table
   * Requirement 9.6: Use pg_class statistics to avoid full table scans
   */
  async getEstimatedCount(options: CountEstimationOptions): Promise<CountEstimationResult> {
    const startTime = Date.now();

    // Check cache first
    const cacheKey = this.getCacheKey(options);
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return {
        count: cached.count,
        isEstimate: true,
        executionTime: Date.now() - startTime
      };
    }

    try {
      let count: number;
      let isEstimate: boolean;

      if (options.useExact) {
        // Use exact count (slower, but accurate)
        count = await this.getExactCount(options);
        isEstimate = false;
      } else {
        // Use estimated count (fast)
        count = await this.getEstimateFromPgClass(options);
        isEstimate = true;
      }

      // Cache result
      this.cache.set(cacheKey, {
        count,
        timestamp: Date.now()
      });

      return {
        count,
        isEstimate,
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      console.error('Count estimation failed:', error);
      throw error;
    }
  }

  /**
   * Get estimated count from pg_class statistics
   * This is very fast (O(1)) as it reads from PostgreSQL's internal statistics
   */
  private async getEstimateFromPgClass(options: CountEstimationOptions): Promise<number> {
    try {
      // Try using the RPC function we created
      const { data, error } = await this.client.rpc('get_estimated_count', {
        table_name: options.table
      });

      if (!error && typeof data === 'number') {
        // If filters are provided, apply a rough adjustment
        if (options.filters && Object.keys(options.filters).length > 0) {
          // Estimate that filters reduce results by 50% (rough heuristic)
          return Math.floor(data * 0.5);
        }
        return data;
      }

      // Fallback: use Supabase's estimated count
      return await this.getEstimateFromSupabase(options);
    } catch (error) {
      console.warn('pg_class estimation failed, using Supabase estimate:', error);
      return await this.getEstimateFromSupabase(options);
    }
  }

  /**
   * Get estimated count using Supabase's count with 'estimated' hint
   */
  private async getEstimateFromSupabase(options: CountEstimationOptions): Promise<number> {
    let query = this.client
      .from(options.table)
      .select('*', { count: 'estimated', head: true });

    // Apply filters
    if (options.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }

    const { count, error } = await query;

    if (error) {
      throw new Error(`Supabase count estimation failed: ${error.message}`);
    }

    return count || 0;
  }

  /**
   * Get exact count (slower, performs actual count)
   * Only use when accuracy is critical
   */
  private async getExactCount(options: CountEstimationOptions): Promise<number> {
    let query = this.client
      .from(options.table)
      .select('*', { count: 'exact', head: true });

    // Apply filters
    if (options.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }

    const { count, error } = await query;

    if (error) {
      throw new Error(`Exact count failed: ${error.message}`);
    }

    return count || 0;
  }

  /**
   * Get count with automatic strategy selection
   * Uses estimate for large tables, exact for small tables
   */
  async getSmartCount(options: CountEstimationOptions): Promise<CountEstimationResult> {
    // First, get an estimate
    const estimate = await this.getEstimatedCount({
      ...options,
      useExact: false
    });

    // If estimate is small (< 1000 rows), get exact count
    if (estimate.count < 1000) {
      return await this.getEstimatedCount({
        ...options,
        useExact: true
      });
    }

    return estimate;
  }

  /**
   * Invalidate cache for a table
   */
  invalidateCache(table: string): void {
    const keysToDelete: string[] = [];

    for (const key of this.cache.keys()) {
      if (key.startsWith(`${table}:`)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }

  /**
   * Generate cache key
   */
  private getCacheKey(options: CountEstimationOptions): string {
    const filterKey = options.filters
      ? JSON.stringify(options.filters)
      : 'no-filters';
    return `${options.table}:${filterKey}`;
  }

  /**
   * Set cache TTL in milliseconds
   */
  setCacheTTL(ttl: number): void {
    this.cacheTTL = ttl;
  }
}

// Singleton instance
export const countEstimationService = new CountEstimationService();
