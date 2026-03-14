/**
 * Request Deduplication Usage Examples
 * 
 * This file demonstrates how to use the RequestDeduplicator
 * to prevent redundant API calls in various scenarios.
 */

import { supabase } from '../../config/SupabaseConfig';
import { 
  requestDeduplicator, 
  deduplicateRequest,
  withDeduplication,
  RequestDeduplicator 
} from './RequestDeduplicator';

// ============================================================================
// Example 1: Basic Usage with Supabase Queries
// ============================================================================

/**
 * Fetch products with deduplication
 * If multiple components request products simultaneously,
 * only one actual query is executed
 */
export async function fetchProductsWithDeduplication(companyId: string) {
  const key = `products:${companyId}`;
  
  return deduplicateRequest(
    key,
    async () => {
      console.log('Executing actual products query...');
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('company_id', companyId)
        .eq('available', true);

      if (error) throw error;
      return data;
    },
    { ttl: 30000 } // Cache for 30 seconds
  );
}

/**
 * Fetch orders with deduplication
 */
export async function fetchOrdersWithDeduplication(
  companyId: string,
  dateKey: string
) {
  const key = `orders:${companyId}:${dateKey}`;
  
  return deduplicateRequest(
    key,
    async () => {
      console.log('Executing actual orders query...');
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('company_id', companyId)
        .eq('date_key', dateKey)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    { ttl: 5000 } // Cache for 5 seconds
  );
}

// ============================================================================
// Example 2: Using withDeduplication HOF
// ============================================================================

/**
 * Original function without deduplication
 */
async function fetchUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Wrapped version with automatic deduplication
 */
export const fetchUserProfileDeduplicated = withDeduplication(
  fetchUserProfile,
  (userId: string) => `profile:${userId}`
);

// ============================================================================
// Example 3: Class-based Service with Decorator
// ============================================================================

export class ProductService {
  /**
   * Fetch products with automatic deduplication using decorator
   */
  async getProducts(companyId: string) {
    console.log('Fetching products from database...');
    
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('company_id', companyId)
      .eq('available', true);

    if (error) throw error;
    return data;
  }

  /**
   * Fetch product by ID with deduplication
   */
  async getProductById(companyId: string, productId: string) {
    console.log(`Fetching product ${productId}...`);
    
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('company_id', companyId)
      .eq('id', productId)
      .single();

    if (error) throw error;
    return data;
  }
}

// ============================================================================
// Example 4: React Hook Integration
// ============================================================================

/**
 * Custom hook that uses request deduplication
 * Multiple components can call this hook simultaneously,
 * but only one actual request will be made
 */
export function useProductsWithDeduplication(companyId: string) {
  // In a real React hook, you would use useState and useEffect
  // This is a simplified example showing the deduplication logic
  
  return fetchProductsWithDeduplication(companyId);
}

// ============================================================================
// Example 5: Manual Deduplicator Instance
// ============================================================================

/**
 * Create a dedicated deduplicator for a specific feature
 */
export class OrdersDeduplicator {
  private deduplicator = new RequestDeduplicator();

  constructor() {
    // Set custom TTL for orders (10 seconds)
    this.deduplicator.setDefaultTTL(10000);
  }

  async fetchOrders(companyId: string, dateKey: string) {
    const key = RequestDeduplicator.generateKey(
      'orders',
      { companyId, dateKey }
    );

    return this.deduplicator.deduplicate(
      key,
      async () => {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('company_id', companyId)
          .eq('date_key', dateKey);

        if (error) throw error;
        return data;
      }
    );
  }

  /**
   * Invalidate orders cache when new order is created
   */
  invalidateOrders(companyId: string, dateKey: string) {
    const key = RequestDeduplicator.generateKey(
      'orders',
      { companyId, dateKey }
    );
    this.deduplicator.invalidate(key);
  }

  /**
   * Invalidate all orders for a company
   */
  invalidateAllOrders(companyId: string) {
    this.deduplicator.invalidatePattern(`orders.*${companyId}`);
  }

  /**
   * Get deduplication metrics
   */
  getMetrics() {
    return this.deduplicator.getMetrics();
  }
}

// ============================================================================
// Example 6: Integration with Existing Services
// ============================================================================

/**
 * Wrap existing service methods with deduplication
 */
export class OptimizedComandasService {
  async listarComandasAbertas(companyId: string) {
    const key = `comandas:abertas:${companyId}`;
    
    return deduplicateRequest(
      key,
      async () => {
        // Original service logic
        const { data } = await supabase
          .from('comandas')
          .select('*')
          .eq('company_id', companyId)
          .eq('status', 'aberta')
          .order('comanda_number', { ascending: true });

        return data || [];
      },
      { ttl: 3000 } // Cache for 3 seconds
    );
  }

  /**
   * Invalidate cache after creating/updating comanda
   */
  async ensureComandaAberta(
    companyId: string,
    _comandaNumber: string,
    // ... other params
  ) {
    // Perform the operation
    // ... original logic ...

    // Invalidate cache
    requestDeduplicator.invalidate(`comandas:abertas:${companyId}`);
  }
}

// ============================================================================
// Example 7: Monitoring and Debugging
// ============================================================================

/**
 * Monitor deduplication effectiveness
 */
export function logDeduplicationMetrics() {
  const metrics = requestDeduplicator.getMetrics();
  
  console.log('Request Deduplication Metrics:');
  console.log(`  Total Requests: ${metrics.totalRequests}`);
  console.log(`  Deduplicated: ${metrics.deduplicatedRequests}`);
  console.log(`  Unique: ${metrics.uniqueRequests}`);
  console.log(`  Deduplication Rate: ${metrics.deduplicationRate}%`);
  
  const cacheStats = requestDeduplicator.getCacheStats();
  console.log(`  Cache Size: ${cacheStats.cacheSize}`);
  console.log(`  Pending Requests: ${cacheStats.pendingRequests}`);
}

/**
 * Periodic cleanup of expired cache entries
 */
export function startPeriodicCleanup(intervalMs: number = 60000) {
  return setInterval(() => {
    requestDeduplicator.cleanupExpired();
    console.log('Cleaned up expired cache entries');
  }, intervalMs);
}

// ============================================================================
// Example 8: Testing Deduplication
// ============================================================================

/**
 * Test function to demonstrate deduplication in action
 */
export async function testDeduplication() {
  console.log('Testing request deduplication...\n');

  const companyId = 'test-company-123';

  // Simulate 5 concurrent requests for the same data
  console.log('Making 5 concurrent requests...');
  const promises = Array(5).fill(null).map((_, i) => {
    console.log(`  Request ${i + 1} started`);
    return fetchProductsWithDeduplication(companyId);
  });

  // Wait for all requests to complete
  const results = await Promise.all(promises);

  console.log('\nAll requests completed!');
  console.log(`Results received: ${results.length}`);
  console.log('All results are identical:', 
    results.every(r => JSON.stringify(r) === JSON.stringify(results[0]))
  );

  // Show metrics
  console.log('\n');
  logDeduplicationMetrics();

  // Expected output:
  // - Only 1 "Executing actual products query..." log
  // - 5 results returned (all identical)
  // - Deduplication rate: 80% (4 out of 5 requests deduplicated)
}
