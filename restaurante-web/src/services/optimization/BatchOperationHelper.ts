/**
 * Batch Operation Helper
 * 
 * Provides convenient wrappers for common batch operation patterns.
 * Integrates BatchOperationManager with application-level operations.
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */

import { batchOperationManager } from './BatchOperationManager';
import { supabase } from '../../config/SupabaseConfig';
import type { Operation } from '../../types/performance';

/**
 * Batch Operation Helper Service
 */
export class BatchOperationHelper {
  /**
   * Batch insert multiple records
   * Requirements: 6.1
   * 
   * @param table - Table name
   * @param records - Array of records to insert
   * @returns Promise with insert result
   */
  async batchInsert<T = any>(table: string, records: Partial<T>[]): Promise<{ data: T[] | null; error: any }> {
    if (records.length === 0) {
      return { data: [], error: null };
    }

    // For small batches, use direct insert
    if (records.length <= 10) {
      return supabase.from(table).insert(records).select();
    }

    // For larger batches, use batch manager
    const operations: Operation[] = records.map(record => ({
      type: 'insert',
      table,
      data: record,
    }));

    // Add operations to batch
    operations.forEach(op => batchOperationManager.addOperation(op));

    // Execute batch
    const result = await batchOperationManager.executeBatch();

    if (!result.success) {
      return {
        data: null,
        error: result.errors[0] || new Error('Batch insert failed'),
      };
    }

    // Fetch inserted records
    // Note: This is a simplified approach. In production, you'd want to track IDs
    return { data: null, error: null };
  }

  /**
   * Batch update multiple records
   * Requirements: 6.2
   * 
   * @param table - Table name
   * @param updates - Array of updates with where conditions
   * @returns Promise with update result
   */
  async batchUpdate<T = any>(
    table: string,
    updates: Array<{ where: Record<string, any>; data: Partial<T> }>
  ): Promise<{ success: boolean; error: any }> {
    if (updates.length === 0) {
      return { success: true, error: null };
    }

    // For small batches, execute directly
    if (updates.length <= 5) {
      try {
        for (const update of updates) {
          let query = supabase.from(table).update(update.data);
          
          // Apply where conditions
          for (const [key, value] of Object.entries(update.where)) {
            query = query.eq(key, value);
          }
          
          const { error } = await query;
          if (error) throw error;
        }
        return { success: true, error: null };
      } catch (error) {
        return { success: false, error };
      }
    }

    // For larger batches, use batch manager
    const operations: Operation[] = updates.map(update => ({
      type: 'update',
      table,
      data: update.data,
      where: update.where,
    }));

    // Add operations to batch
    operations.forEach(op => batchOperationManager.addOperation(op));

    // Execute batch
    const result = await batchOperationManager.executeBatch();

    return {
      success: result.success,
      error: result.success ? null : result.errors[0],
    };
  }

  /**
   * Batch delete multiple records
   * Requirements: 6.3
   * 
   * @param table - Table name
   * @param conditions - Array of where conditions for deletion
   * @returns Promise with delete result
   */
  async batchDelete(
    table: string,
    conditions: Array<Record<string, any>>
  ): Promise<{ success: boolean; error: any }> {
    if (conditions.length === 0) {
      return { success: true, error: null };
    }

    // For small batches, execute directly
    if (conditions.length <= 5) {
      try {
        for (const condition of conditions) {
          let query = supabase.from(table).delete();
          
          // Apply where conditions
          for (const [key, value] of Object.entries(condition)) {
            query = query.eq(key, value);
          }
          
          const { error } = await query;
          if (error) throw error;
        }
        return { success: true, error: null };
      } catch (error) {
        return { success: false, error };
      }
    }

    // For larger batches, use batch manager
    const operations: Operation[] = conditions.map(where => ({
      type: 'delete',
      table,
      data: {},
      where,
    }));

    // Add operations to batch
    operations.forEach(op => batchOperationManager.addOperation(op));

    // Execute batch
    const result = await batchOperationManager.executeBatch();

    return {
      success: result.success,
      error: result.success ? null : result.errors[0],
    };
  }

  /**
   * Batch upsert (insert or update) multiple records
   * 
   * @param table - Table name
   * @param records - Array of records to upsert
   * @param onConflict - Column(s) to check for conflicts
   * @returns Promise with upsert result
   */
  async batchUpsert<T = any>(
    table: string,
    records: Partial<T>[],
    onConflict?: string
  ): Promise<{ data: T[] | null; error: any }> {
    if (records.length === 0) {
      return { data: [], error: null };
    }

    // Supabase supports upsert natively
    const query = supabase.from(table).upsert(records);
    
    if (onConflict) {
      // @ts-ignore - onConflict is available but not in types
      query.onConflict(onConflict);
    }

    return query.select();
  }

  /**
   * Execute multiple operations with automatic batching
   * Requirements: 6.1, 6.2, 6.3, 6.4
   * 
   * @param operations - Array of operations to execute
   * @returns Promise with batch result
   */
  async executeOperations(operations: Operation[]) {
    // Split into batches if needed
    const batches = batchOperationManager.splitBatch(operations);

    const results = [];
    
    for (const batch of batches) {
      // Add operations to batch manager
      batch.forEach(op => batchOperationManager.addOperation(op));
      
      // Execute batch
      const result = await batchOperationManager.executeBatch();
      results.push(result);
      
      // If any batch fails, stop execution
      if (!result.success) {
        return {
          success: false,
          results,
          error: result.errors[0],
        };
      }
    }

    return {
      success: true,
      results,
      error: null,
    };
  }
}

// Singleton instance
export const batchOperationHelper = new BatchOperationHelper();
