/**
 * Supabase Data Converter - Optimized
 * 
 * Implements optimized data conversion with:
 * - Memoization to avoid re-processing
 * - Shallow comparison to detect changes
 * - Selective transformation of changed fields only
 * - TypeScript interfaces for type safety
 * - Support for legacy field migration
 * 
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 15.3
 */

import { getComandaNumber, getCreatedBy } from './fieldMigrationHelpers';

/**
 * Memoized conversion cache
 */
interface ConversionCache {
  hash: string;
  result: any;
  timestamp: number;
}

/**
 * Supabase Converter with memoization
 */
class SupabaseConverter {
  private cache: Map<string, ConversionCache> = new Map();
  private readonly CACHE_TTL = 60 * 1000; // 1 minute

  /**
   * Converts Supabase row to Order with memoization
   */
  supabaseToOrder(row: any, rowId: string): any {
    const cacheKey = `order:${rowId}`;
    
    // Calculate data hash
    const dataHash = this.calculateHash(row);
    
    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && cached.hash === dataHash) {
      // Cache hit - return memoized result
      return cached.result;
    }

    // Cache miss - convert data
    const result = this.convertOrderData(row, rowId);

    // Store in cache
    this.cache.set(cacheKey, {
      hash: dataHash,
      result,
      timestamp: Date.now()
    });

    return result;
  }

  /**
   * Converts order data
   * Uses helpers to support deprecated fields during migration
   */
  private convertOrderData(row: any, rowId: string): any {
    return {
      id: rowId,
      companyId: row.company_id || row.companyId || '',
      comandaNumber: getComandaNumber(row), // Supports both fields
      dateKey: row.date_key || row.dateKey || '',
      status: row.status || 'pending',
      items: this.convertItems(row.items || row.itens || []),
      totalAmount: row.total_amount || row.totalAmount || row.total || 0,
      isPago: row.is_pago || row.isPago || false,
      createdBy: getCreatedBy(row), // Supports both fields
      createdAt: this.convertTimestamp(row.created_at || row.createdAt),
      updatedAt: this.convertTimestamp(row.updated_at || row.updatedAt),
      notes: row.notes || row.observacoes || '',
      customerName: row.customer_name || row.customerName || row.nomeCliente || ''
    };
  }

  /**
   * Converts items array
   */
  private convertItems(items: any[]): any[] {
    if (!Array.isArray(items)) return [];
    
    return items.map(item => ({
      id: item.id || '',
      productId: item.product_id || item.productId || item.produtoId || '',
      name: item.name || item.nome || '',
      quantity: item.quantity || item.quantidade || 0,
      unitPrice: item.unit_price || item.unitPrice || item.precoUnitario || 0,
      subtotal: item.subtotal || 0,
      notes: item.notes || item.observacoes || '',
      modifiers: item.modifiers || item.modificadores || []
    }));
  }

  /**
   * Converts timestamp (PostgreSQL or ISO string)
   */
  private convertTimestamp(timestamp: any): Date | null {
    if (!timestamp) return null;
    
    if (timestamp instanceof Date) {
      return timestamp;
    }
    
    if (typeof timestamp === 'string') {
      return new Date(timestamp);
    }
    
    if (typeof timestamp === 'number') {
      return new Date(timestamp);
    }
    
    return null;
  }

  /**
   * Calculates simple hash for shallow comparison
   */
  private calculateHash(row: any): string {
    // Uses key fields to detect changes
    const keyFields = [
      row.id,
      row.status,
      row.is_pago || row.isPago,
      row.updated_at || row.updatedAt || 0,
      row.items?.length || row.itens?.length || 0,
      row.total_amount || row.totalAmount || row.total || 0
    ];
    
    return keyFields.join(':');
  }

  /**
   * Detects changes between two rows (shallow comparison)
   */
  hasChanges(oldRow: any, newRow: any): boolean {
    const oldHash = this.calculateHash(oldRow);
    const newHash = this.calculateHash(newRow);
    
    return oldHash !== newHash;
  }

  /**
   * Converts only changed fields
   */
  convertChangedFields(
    oldRow: any,
    newRow: any,
    rowId: string
  ): Partial<any> {
    if (!this.hasChanges(oldRow, newRow)) {
      return {};
    }

    const changes: Partial<any> = {};

    // Check each field individually
    if (oldRow.status !== newRow.status) {
      changes.status = newRow.status;
    }

    const oldIsPago = oldRow.is_pago || oldRow.isPago;
    const newIsPago = newRow.is_pago || newRow.isPago;
    if (oldIsPago !== newIsPago) {
      changes.isPago = newIsPago;
    }

    const oldTotal = oldRow.total_amount || oldRow.totalAmount || oldRow.total;
    const newTotal = newRow.total_amount || newRow.totalAmount || newRow.total;
    if (oldTotal !== newTotal) {
      changes.totalAmount = newTotal;
    }

    const oldItems = JSON.stringify(oldRow.items || oldRow.itens);
    const newItems = JSON.stringify(newRow.items || newRow.itens);
    if (oldItems !== newItems) {
      changes.items = this.convertItems(newRow.items || newRow.itens || []);
    }

    const oldUpdated = oldRow.updated_at || oldRow.updatedAt;
    const newUpdated = newRow.updated_at || newRow.updatedAt;
    if (oldUpdated !== newUpdated) {
      changes.updatedAt = this.convertTimestamp(newUpdated);
    }

    return changes;
  }

  /**
   * Cleans expired cache
   */
  cleanExpiredCache(): void {
    const now = Date.now();
    
    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp > this.CACHE_TTL) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Invalidates cache for a specific document
   */
  invalidateCache(rowId: string): void {
    this.cache.delete(`order:${rowId}`);
  }

  /**
   * Clears all cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Gets cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }
}

// Singleton instance
export const supabaseConverter = new SupabaseConverter();

// Legacy export for compatibility
export const firestoreConverter = supabaseConverter;

// Export for tests
export { SupabaseConverter };

