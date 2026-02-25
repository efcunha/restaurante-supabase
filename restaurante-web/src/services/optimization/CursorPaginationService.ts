/**
 * Cursor-Based Pagination Service for Supabase
 * 
 * Implements efficient cursor-based pagination that:
 * - Avoids OFFSET (which causes full table scans)
 * - Uses indexed columns for cursor keys
 * - Limits page size to maximum 50 records
 * - Validates cursor integrity
 * - Provides count estimation without full scans
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../../config/SupabaseConfig';

/**
 * Pagination configuration
 */
export interface PaginationConfig {
  maxPageSize: number;
  defaultPageSize: number;
}

/**
 * Cursor for pagination
 */
export interface PaginationCursor {
  value: any;
  column: string;
  direction: 'asc' | 'desc';
  timestamp: number;
  signature: string;
}

/**
 * Pagination result
 */
export interface PaginationResult<T> {
  items: T[];
  nextCursor: string | null;
  prevCursor: string | null;
  hasMore: boolean;
  pageSize: number;
  estimatedTotal?: number;
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  pageSize?: number;
  cursor?: string;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  filters?: Record<string, any>;
}

/**
 * Cursor-Based Pagination Service
 */
export class CursorPaginationService {
  private config: PaginationConfig = {
    maxPageSize: 50,
    defaultPageSize: 20
  };

  private client: SupabaseClient;
  private secret: string = 'cursor-secret-key'; // In production, use env variable

  constructor(client?: SupabaseClient) {
    this.client = client || supabase;
  }

  /**
   * Paginate query results using cursor-based pagination
   * Requirement 9.1: Use cursor-based pagination
   * Requirement 9.3: Use indexed columns for cursor keys
   * Requirement 9.4: Avoid OFFSET
   */
  async paginate<T = any>(
    table: string,
    options: PaginationOptions = {}
  ): Promise<PaginationResult<T>> {
    // Requirement 9.2: Limit page size to maximum 50 records
    const pageSize = this.enforcePageSizeLimit(options.pageSize);
    const orderBy = options.orderBy || 'created_at';
    const orderDirection = options.orderDirection || 'desc';

    // Build query
    let query = this.client
      .from(table)
      .select('*', { count: 'estimated' });

    // Apply filters
    if (options.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }

    // Apply cursor if provided
    if (options.cursor) {
      const decodedCursor = this.decodeCursor(options.cursor);
      
      // Requirement 9.5: Validate cursor integrity
      if (!this.validateCursor(decodedCursor)) {
        throw new Error('Invalid or tampered cursor');
      }

      // Apply cursor filter using indexed column
      const operator = orderDirection === 'desc' ? 'lt' : 'gt';
      query = query[operator](orderBy, decodedCursor.value);
    }

    // Apply ordering and limit
    query = query
      .order(orderBy, { ascending: orderDirection === 'asc' })
      .limit(pageSize + 1); // Fetch one extra to check if there are more

    // Execute query
    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Pagination query failed: ${error.message}`);
    }

    const items = data || [];
    const hasMore = items.length > pageSize;

    // Remove extra item if present
    if (hasMore) {
      items.pop();
    }

    // Generate next cursor
    const nextCursor = hasMore && items.length > 0
      ? this.encodeCursor({
          value: items[items.length - 1][orderBy],
          column: orderBy,
          direction: orderDirection,
          timestamp: Date.now(),
          signature: ''
        })
      : null;

    // Generate previous cursor (for backward pagination)
    const prevCursor = items.length > 0 && options.cursor
      ? this.encodeCursor({
          value: items[0][orderBy],
          column: orderBy,
          direction: orderDirection === 'desc' ? 'asc' : 'desc',
          timestamp: Date.now(),
          signature: ''
        })
      : null;

    return {
      items: items as T[],
      nextCursor,
      prevCursor,
      hasMore,
      pageSize: items.length,
      estimatedTotal: count || undefined
    };
  }

  /**
   * Requirement 9.2: Enforce maximum page size of 50 records
   */
  private enforcePageSizeLimit(requestedSize?: number): number {
    if (!requestedSize) {
      return this.config.defaultPageSize;
    }

    if (requestedSize > this.config.maxPageSize) {
      return this.config.maxPageSize;
    }

    if (requestedSize < 1) {
      return this.config.defaultPageSize;
    }

    return requestedSize;
  }

  /**
   * Encode cursor to base64 string with signature
   */
  private encodeCursor(cursor: Omit<PaginationCursor, 'signature'>): string {
    const cursorWithSignature: PaginationCursor = {
      ...cursor,
      signature: this.generateSignature(cursor)
    };

    const json = JSON.stringify(cursorWithSignature);
    return Buffer.from(json).toString('base64');
  }

  /**
   * Decode cursor from base64 string
   */
  private decodeCursor(encodedCursor: string): PaginationCursor {
    try {
      const json = Buffer.from(encodedCursor, 'base64').toString('utf-8');
      return JSON.parse(json);
    } catch (error) {
      throw new Error('Invalid cursor format');
    }
  }

  /**
   * Requirement 9.5: Validate cursor integrity
   * Reject invalid or tampered cursors
   */
  private validateCursor(cursor: PaginationCursor): boolean {
    // Check required fields
    if (!cursor.value || !cursor.column || !cursor.direction || !cursor.timestamp || !cursor.signature) {
      return false;
    }

    // Check timestamp (reject cursors older than 1 hour)
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    if (cursor.timestamp < oneHourAgo) {
      return false;
    }

    // Verify signature
    const expectedSignature = this.generateSignature({
      value: cursor.value,
      column: cursor.column,
      direction: cursor.direction,
      timestamp: cursor.timestamp
    });

    return cursor.signature === expectedSignature;
  }

  /**
   * Generate signature for cursor integrity
   */
  private generateSignature(cursor: Omit<PaginationCursor, 'signature'>): string {
    const data = `${cursor.value}:${cursor.column}:${cursor.direction}:${cursor.timestamp}:${this.secret}`;
    
    // Simple hash function (in production, use crypto.createHmac)
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    return hash.toString(36);
  }

  /**
   * Requirement 9.6: Get count estimation without full table scans
   * Uses pg_class statistics for fast estimation
   */
  async getEstimatedCount(table: string, filters?: Record<string, any>): Promise<number> {
    try {
      // Try to get estimated count from pg_class
      const { data, error } = await this.client.rpc('get_estimated_count', {
        table_name: table
      });

      if (!error && data) {
        return data;
      }

      // Fallback: use Supabase's count with 'estimated' hint
      let query = this.client
        .from(table)
        .select('*', { count: 'estimated', head: true });

      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }

      const { count } = await query;
      return count || 0;
    } catch (error) {
      console.warn('Failed to get estimated count:', error);
      return 0;
    }
  }

  /**
   * Configure pagination settings
   */
  configure(config: Partial<PaginationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): PaginationConfig {
    return { ...this.config };
  }
}

// Singleton instance
export const cursorPaginationService = new CursorPaginationService();
