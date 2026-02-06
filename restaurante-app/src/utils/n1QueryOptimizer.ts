/**
 * N+1 Query Optimizer Utility
 * 
 * Provides utilities to detect and fix N+1 query patterns
 * Requirement 1.3: Refactor N+1 patterns to use batch queries or joins
 */

import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Batch fetch records by IDs to avoid N+1 queries
 * 
 * Instead of:
 *   for (const id of ids) {
 *     const record = await supabase.from('table').select().eq('id', id).single();
 *   }
 * 
 * Use:
 *   const records = await batchFetchByIds(supabase, 'table', ids);
 */
export async function batchFetchByIds<T = any>(
  client: SupabaseClient,
  table: string,
  ids: string[],
  selectFields: string = '*'
): Promise<Map<string, T>> {
  if (ids.length === 0) {
    return new Map();
  }

  // Fetch all records in a single query
  const { data, error } = await client
    .from(table)
    .select(selectFields)
    .in('id', ids);

  if (error) {
    throw new Error(`Batch fetch failed: ${error.message}`);
  }

  // Create a map for O(1) lookups
  const recordMap = new Map<string, T>();
  (data || []).forEach((record: any) => {
    recordMap.set(record.id, record as T);
  });

  return recordMap;
}

/**
 * Batch fetch records by foreign key to avoid N+1 queries
 * 
 * Instead of:
 *   for (const order of orders) {
 *     const items = await supabase.from('order_items').select().eq('order_id', order.id);
 *   }
 * 
 * Use:
 *   const itemsByOrderId = await batchFetchByForeignKey(supabase, 'order_items', 'order_id', orderIds);
 */
export async function batchFetchByForeignKey<T = any>(
  client: SupabaseClient,
  table: string,
  foreignKeyColumn: string,
  foreignKeyValues: string[],
  selectFields: string = '*'
): Promise<Map<string, T[]>> {
  if (foreignKeyValues.length === 0) {
    return new Map();
  }

  // Fetch all records in a single query
  const { data, error } = await client
    .from(table)
    .select(selectFields)
    .in(foreignKeyColumn, foreignKeyValues);

  if (error) {
    throw new Error(`Batch fetch by foreign key failed: ${error.message}`);
  }

  // Group records by foreign key
  const recordsByKey = new Map<string, T[]>();
  (data || []).forEach((record: any) => {
    const key = record[foreignKeyColumn];
    if (!recordsByKey.has(key)) {
      recordsByKey.set(key, []);
    }
    recordsByKey.get(key)!.push(record as T);
  });

  return recordsByKey;
}

/**
 * Batch update records to avoid N+1 queries
 * 
 * Instead of:
 *   for (const id of ids) {
 *     await supabase.from('table').update(data).eq('id', id);
 *   }
 * 
 * Use:
 *   await batchUpdate(supabase, 'table', updates);
 */
export async function batchUpdate(
  client: SupabaseClient,
  table: string,
  updates: Array<{ id: string; data: Record<string, any> }>
): Promise<void> {
  if (updates.length === 0) {
    return;
  }

  // Group updates by identical data to minimize queries
  const updateGroups = new Map<string, string[]>();
  
  updates.forEach(({ id, data }) => {
    const dataKey = JSON.stringify(data);
    if (!updateGroups.has(dataKey)) {
      updateGroups.set(dataKey, []);
    }
    updateGroups.get(dataKey)!.push(id);
  });

  // Execute grouped updates
  const promises = Array.from(updateGroups.entries()).map(([dataKey, ids]) => {
    const data = JSON.parse(dataKey);
    return client
      .from(table)
      .update(data)
      .in('id', ids);
  });

  const results = await Promise.all(promises);
  
  // Check for errors
  const errors = results.filter(r => r.error);
  if (errors.length > 0) {
    throw new Error(`Batch update failed: ${errors.map(e => e.error?.message).join(', ')}`);
  }
}

/**
 * Fetch with joins to avoid N+1 queries
 * 
 * Instead of:
 *   const orders = await supabase.from('orders').select();
 *   for (const order of orders) {
 *     const items = await supabase.from('order_items').select().eq('order_id', order.id);
 *     order.items = items;
 *   }
 * 
 * Use:
 *   const orders = await fetchWithJoin(supabase, 'orders', 'order_items(*)');
 */
export async function fetchWithJoin<T = any>(
  client: SupabaseClient,
  table: string,
  joinSpec: string,
  filters?: Record<string, any>
): Promise<T[]> {
  let query = client
    .from(table)
    .select(`*, ${joinSpec}`);

  // Apply filters
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Fetch with join failed: ${error.message}`);
  }

  return (data || []) as T[];
}

/**
 * Detect potential N+1 patterns in code
 * This is a runtime detector that logs warnings
 */
export class N1QueryDetector {
  private queryLog: Map<string, number> = new Map();
  private threshold: number = 5; // Warn if same query pattern executed > 5 times

  /**
   * Track a query execution
   */
  trackQuery(table: string, operation: string, context?: string): void {
    const key = `${table}:${operation}:${context || 'default'}`;
    const count = (this.queryLog.get(key) || 0) + 1;
    this.queryLog.set(key, count);

    if (count > this.threshold) {
      console.warn(
        `[N+1 Detection] Potential N+1 pattern detected: ${key} executed ${count} times. ` +
        `Consider using batch operations or joins.`
      );
    }
  }

  /**
   * Reset query log
   */
  reset(): void {
    this.queryLog.clear();
  }

  /**
   * Get query statistics
   */
  getStats(): Record<string, number> {
    return Object.fromEntries(this.queryLog);
  }

  /**
   * Set detection threshold
   */
  setThreshold(threshold: number): void {
    this.threshold = threshold;
  }
}

// Singleton detector
export const n1Detector = new N1QueryDetector();
