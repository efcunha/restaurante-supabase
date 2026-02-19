/**
 * Optimized Supabase Client
 * 
 * Wraps Supabase client with automatic query optimization, analysis, and slow query logging.
 * Integrates QueryOptimizerService, PerformanceMonitorService, and CacheLayerService.
 * Configures Supabase client with optimal connection pool settings.
 * 
 * Requirements: 1.1, 1.2, 1.6, 3.1, 3.7, 4.1, 4.2, 4.3, 4.4, 11.1
 */

import { supabase } from '../../config/SupabaseConfig';
import { queryOptimizerService } from './QueryOptimizerService';
import { performanceMonitorService } from './PerformanceMonitorService';
import { connectionPoolManager } from './ConnectionPoolManager';
import { cacheLayerService } from '../../services/CacheLayerService';
import type { PostgrestFilterBuilder } from '@supabase/postgrest-js';

/**
 * Query execution wrapper that adds optimization and monitoring
 */
class OptimizedSupabaseClient {
  private readonly SLOW_QUERY_THRESHOLD_MS = 100;
  private activeQueries = 0;

  constructor() {
    // Initialize connection pool manager
    this.initializeConnectionPool();
  }

  /**
   * Initialize connection pool with optimal settings
   * Requirements: 3.1, 3.7
   */
  private async initializeConnectionPool(): Promise<void> {
    try {
      await connectionPoolManager.initialize();
      console.log('[OptimizedSupabaseClient] Connection pool initialized');
    } catch (error) {
      console.error('[OptimizedSupabaseClient] Failed to initialize connection pool:', error);
    }
  }

  /**
   * Get connection pool statistics
   * Requirements: 3.5, 11.3
   */
  getPoolStats() {
    return connectionPoolManager.getPoolStats();
  }

  /**
   * Execute a query with automatic optimization, caching, and monitoring
   * 
   * @param queryBuilder - Supabase query builder
   * @param operationName - Name of the operation for tracking
   * @param cacheOptions - Optional cache configuration
   * @returns Query result with optimization applied
   */
  async executeQuery<T>(
    queryBuilder: PostgrestFilterBuilder<any, any, any, any>,
    operationName: string,
    cacheOptions?: {
      enabled?: boolean;
      key?: string;
      ttl?: number;
      tags?: string[];
      forceRefresh?: boolean;
    }
  ): Promise<{ data: T[] | null; error: any }> {
    const startTime = Date.now();
    this.activeQueries++;

    try {
      // If caching is enabled, try cache first
      if (cacheOptions?.enabled && cacheOptions.key) {
        const cacheKey = cacheOptions.key;

        // Use cache wrapper
        const result = await cacheLayerService.withCache(
          cacheKey,
          async () => {
            const queryResult = await queryBuilder;
            return queryResult;
          },
          {
            ttl: cacheOptions.ttl,
            forceRefresh: cacheOptions.forceRefresh,
            tags: cacheOptions.tags,
          }
        );

        const executionTime = Date.now() - startTime;

        // Track query execution for N+1 detection
        const queryString = this.extractQueryString(queryBuilder);
        queryOptimizerService.trackQueryExecution(queryString, executionTime);

        // Track performance metrics
        await performanceMonitorService.trackOperation(
          operationName,
          async () => result,
          {
            executionTime,
            queryType: 'select',
            poolStats: this.getPoolStats(),
            cached: true,
          }
        );

        return result;
      }

      // Execute without cache
      const result = await queryBuilder;

      const executionTime = Date.now() - startTime;

      // Track query execution for N+1 detection
      const queryString = this.extractQueryString(queryBuilder);
      queryOptimizerService.trackQueryExecution(queryString, executionTime);

      // Log slow queries
      if (executionTime > this.SLOW_QUERY_THRESHOLD_MS) {
        await this.logSlowQuery(queryString, executionTime);
      }

      // Track performance metrics
      await performanceMonitorService.trackOperation(
        operationName,
        async () => result,
        {
          executionTime,
          queryType: 'select',
          poolStats: this.getPoolStats(),
          cached: false,
        }
      );

      return result;
    } catch (error) {
      console.error(`[OptimizedSupabaseClient] Error executing ${operationName}:`, error);
      throw error;
    } finally {
      this.activeQueries--;
    }
  }

  /**
   * Execute a mutation (insert/update/delete) with monitoring and cache invalidation
   * 
   * @param queryBuilder - Supabase query builder
   * @param operationName - Name of the operation
   * @param mutationType - Type of mutation (insert, update, delete)
   * @param invalidateCacheTags - Cache tags to invalidate after mutation
   * @returns Mutation result
   */
  async executeMutation<T>(
    queryBuilder: any,
    operationName: string,
    mutationType: 'insert' | 'update' | 'delete',
    invalidateCacheTags?: string[]
  ): Promise<{ data: T | null; error: any }> {
    const startTime = Date.now();
    this.activeQueries++;

    try {
      const result = await queryBuilder;

      const executionTime = Date.now() - startTime;

      // Invalidate cache after successful mutation
      if (result.error === null && invalidateCacheTags && invalidateCacheTags.length > 0) {
        await cacheLayerService.invalidateByTags(invalidateCacheTags);
      }

      // Track performance metrics
      await performanceMonitorService.trackOperation(
        operationName,
        async () => result,
        {
          executionTime,
          queryType: mutationType,
          poolStats: this.getPoolStats(),
        }
      );

      return result;
    } catch (error) {
      console.error(`[OptimizedSupabaseClient] Error executing ${operationName}:`, error);
      throw error;
    } finally {
      this.activeQueries--;
    }
  }

  /**
   * Log slow query with execution plan
   */
  private async logSlowQuery(query: string, executionTime: number): Promise<void> {
    try {
      // Analyze the query to get execution plan
      const analysis = await queryOptimizerService.analyzeQuery(query);

      // Log to performance monitor
      await performanceMonitorService.logSlowQuery(
        query,
        executionTime,
        analysis.executionPlan
      );

      console.warn(
        `[OptimizedSupabaseClient] Slow query detected (${executionTime}ms):`,
        {
          query,
          executionTime,
          suggestions: analysis.suggestions,
          severity: analysis.severity,
        }
      );
    } catch (error) {
      console.error('[OptimizedSupabaseClient] Error logging slow query:', error);
    }
  }

  /**
   * Extract query string from Supabase query builder
   * This is a best-effort extraction for logging purposes
   */
  private extractQueryString(queryBuilder: any): string {
    try {
      // Supabase query builders don't expose the raw SQL directly
      // We'll construct a representative string from the builder state
      const url = queryBuilder.url?.toString() || '';
      const params = new URL(url).searchParams;

      let queryStr = `SELECT * FROM ${this.extractTableName(url)}`;

      // Add filters
      const select = params.get('select');
      if (select) {
        queryStr = `SELECT ${select} FROM ${this.extractTableName(url)}`;
      }

      // Add WHERE clauses from URL params
      const filters: string[] = [];
      params.forEach((value, key) => {
        if (key !== 'select' && key !== 'order' && key !== 'limit' && key !== 'offset') {
          filters.push(this.parseFilter(key, value));
        }
      });

      if (filters.length > 0) {
        queryStr += ` WHERE ${filters.join(' AND ')}`;
      }

      // Add ORDER BY
      const order = params.get('order');
      if (order) {
        // Handle PostgREST order syntax: col.desc, col.asc
        const orderParts = order.split(',').map(part => {
          const [col, dir] = part.split('.');
          return `${col} ${dir ? dir.toUpperCase() : 'ASC'}`;
        });
        queryStr += ` ORDER BY ${orderParts.join(', ')}`;
      }

      // Add LIMIT
      const limit = params.get('limit');
      if (limit) {
        queryStr += ` LIMIT ${limit}`;
      }

      return queryStr;
    } catch {
      return 'UNKNOWN_QUERY';
    }
  }

  /**
   * Parse PostgREST filter syntax to SQL
   */
  private parseFilter(key: string, value: string): string {
    const separatorIndex = value.indexOf('.');
    if (separatorIndex === -1) return `${key} = ${this.formatValue(value)}`;

    const operator = value.substring(0, separatorIndex);
    const operand = value.substring(separatorIndex + 1);

    switch (operator) {
      case 'eq': return `${key} = ${this.formatValue(operand)}`;
      case 'neq': return `${key} <> ${this.formatValue(operand)}`;
      case 'gt': return `${key} > ${this.formatValue(operand)}`;
      case 'gte': return `${key} >= ${this.formatValue(operand)}`;
      case 'lt': return `${key} < ${this.formatValue(operand)}`;
      case 'lte': return `${key} <= ${this.formatValue(operand)}`;
      case 'like': return `${key} LIKE ${this.formatValue(operand)}`;
      case 'ilike': return `${key} ILIKE ${this.formatValue(operand)}`;
      case 'is': return `${key} IS ${operand.toUpperCase()}`; // null, true, false
      case 'in': {
        // Handle (val1,val2) format
        const cleanOperand = operand.replace(/^\(|\)$/g, '');
        const values = cleanOperand.split(',').map(v => this.formatValue(v));
        return `${key} IN (${values.join(', ')})`;
      }
      default: return `${key} = ${this.formatValue(value)}`;
    }
  }

  /**
   * Format value for SQL (quote strings, leave numbers/booleans)
   */
  private formatValue(value: string): string {
    // Check if number
    if (!isNaN(Number(value)) && value.trim() !== '') return value;
    // Check for boolean
    if (value === 'true' || value === 'false') return value;
    // Check for null
    if (value === 'null') return 'NULL';

    // String - single quote and escape existing quotes
    return `'${value.replace(/'/g, "''")}'`;
  }

  /**
   * Extract table name from URL
   */
  private extractTableName(url: string): string {
    try {
      const match = url.match(/\/rest\/v1\/([^?]+)/);
      return match ? match[1] : 'unknown';
    } catch {
      return 'unknown';
    }
  }

  /**
   * Create an optimized query builder for a table
   * 
   * @param tableName - Name of the table
   * @returns Optimized query builder
   */
  from<T = any>(tableName: string) {
    return new OptimizedQueryBuilder<T>(supabase.from(tableName), tableName);
  }

  /**
   * Analyze N+1 query patterns from recent executions
   * 
   * @returns Detected N+1 patterns
   */
  analyzeN1Patterns() {
    return queryOptimizerService.analyzeN1Patterns();
  }

  /**
   * Get prepared statement statistics
   */
  getPreparedStatementStats() {
    return queryOptimizerService.getPreparedStatementStats();
  }
}

/**
 * Optimized Query Builder
 * 
 * Wraps Supabase query builder with automatic optimization and monitoring
 */
class OptimizedQueryBuilder<T> {
  constructor(
    private queryBuilder: any,
    private tableName: string
  ) { }

  /**
   * Select columns
   */
  select(columns?: string) {
    this.queryBuilder = this.queryBuilder.select(columns);
    return this;
  }

  /**
   * Filter by equality
   */
  eq(column: string, value: any) {
    this.queryBuilder = this.queryBuilder.eq(column, value);
    return this;
  }

  /**
   * Filter by inequality
   */
  neq(column: string, value: any) {
    this.queryBuilder = this.queryBuilder.neq(column, value);
    return this;
  }

  /**
   * Filter by greater than
   */
  gt(column: string, value: any) {
    this.queryBuilder = this.queryBuilder.gt(column, value);
    return this;
  }

  /**
   * Filter by greater than or equal
   */
  gte(column: string, value: any) {
    this.queryBuilder = this.queryBuilder.gte(column, value);
    return this;
  }

  /**
   * Filter by less than
   */
  lt(column: string, value: any) {
    this.queryBuilder = this.queryBuilder.lt(column, value);
    return this;
  }

  /**
   * Filter by less than or equal
   */
  lte(column: string, value: any) {
    this.queryBuilder = this.queryBuilder.lte(column, value);
    return this;
  }

  /**
   * Filter by IN clause
   */
  in(column: string, values: any[]) {
    this.queryBuilder = this.queryBuilder.in(column, values);
    return this;
  }

  /**
   * Filter by NOT IN clause
   */
  not(column: string, operator: string, value: any) {
    this.queryBuilder = this.queryBuilder.not(column, operator, value);
    return this;
  }

  /**
   * Order results
   */
  order(column: string, options?: { ascending?: boolean; nullsFirst?: boolean }) {
    this.queryBuilder = this.queryBuilder.order(column, options);
    return this;
  }

  /**
   * Limit results
   */
  limit(count: number) {
    this.queryBuilder = this.queryBuilder.limit(count);
    return this;
  }

  /**
   * Range/pagination
   */
  range(from: number, to: number) {
    this.queryBuilder = this.queryBuilder.range(from, to);
    return this;
  }

  /**
   * Single result
   */
  single() {
    this.queryBuilder = this.queryBuilder.single();
    return this;
  }

  /**
   * Maybe single result
   */
  maybeSingle() {
    this.queryBuilder = this.queryBuilder.maybeSingle();
    return this;
  }

  /**
   * Execute the query with optimization and monitoring
   */
  async execute(): Promise<{ data: T[] | null; error: any }> {
    const client = new OptimizedSupabaseClient();
    return client.executeQuery<T>(
      this.queryBuilder,
      `${this.tableName}_query`
    );
  }

  /**
   * Insert data
   */
  async insert(data: Partial<T> | Partial<T>[]): Promise<{ data: T | T[] | null; error: any }> {
    const client = new OptimizedSupabaseClient();
    return client.executeMutation<T | T[]>(
      this.queryBuilder.insert(data),
      `${this.tableName}_insert`,
      'insert'
    );
  }

  /**
   * Update data
   */
  async update(data: Partial<T>): Promise<{ data: T | T[] | null; error: any }> {
    const client = new OptimizedSupabaseClient();
    return client.executeMutation<T | T[]>(
      this.queryBuilder.update(data),
      `${this.tableName}_update`,
      'update'
    );
  }

  /**
   * Delete data
   */
  async delete(): Promise<{ data: T | T[] | null; error: any }> {
    const client = new OptimizedSupabaseClient();
    return client.executeMutation<T | T[]>(
      this.queryBuilder.delete(),
      `${this.tableName}_delete`,
      'delete'
    );
  }

  /**
   * Get the underlying Supabase query builder
   * Use this when you need direct access to Supabase features
   */
  getQueryBuilder() {
    return this.queryBuilder;
  }
}

// Singleton instance
export const optimizedSupabaseClient = new OptimizedSupabaseClient();

// Export types
export { OptimizedSupabaseClient, OptimizedQueryBuilder };
