/**
 * Performance Optimization Services
 * 
 * Central export point for all performance optimization services.
 * These services provide database and application-level performance improvements.
 * 
 * Requirements: 11.1, 11.2, 11.3, 11.4
 */

// Export types
export * from '../../types/performance';

// Export Query Optimizer Service
export { queryOptimizerService, QueryOptimizerService } from './QueryOptimizerService';

// Export Optimized Supabase Client
export { optimizedSupabaseClient, OptimizedSupabaseClient, OptimizedQueryBuilder } from './OptimizedSupabaseClient';

// Export Connection Pool Manager
export { connectionPoolManager, ConnectionPoolManager } from './ConnectionPoolManager';

// Export Real-Time Listener Manager
export { realTimeListenerManager, RealTimeListenerManager } from './RealTimeListenerManager';
export type { RealtimeFilter, Subscription, SubscriptionStats, SubscriptionCallback } from './RealTimeListenerManager';

// Export Batch Operation Manager
export { batchOperationManager, BatchOperationManager } from './BatchOperationManager';

// Export Batch Operation Helper
export { batchOperationHelper, BatchOperationHelper } from './BatchOperationHelper';

// Export Performance Monitor Service
export { performanceMonitorService, PerformanceMonitorService } from './PerformanceMonitorService';
export type { PerformanceBaseline, PerformanceAlert, DatabaseResourceMetrics } from './PerformanceMonitorService';

// Export Cursor Pagination Service
export { cursorPaginationService, CursorPaginationService } from './CursorPaginationService';
export type { PaginationConfig, PaginationCursor, PaginationResult, PaginationOptions } from './CursorPaginationService';

// Export Count Estimation Service
export { countEstimationService, CountEstimationService } from './CountEstimationService';
export type { CountEstimationOptions, CountEstimationResult } from './CountEstimationService';

// Export Request Deduplicator
export { requestDeduplicator, RequestDeduplicator, deduplicateRequest, withDeduplication, Deduplicate } from './RequestDeduplicator';
export type { RequestOptions, RequestMetrics } from './RequestDeduplicator';

// Services will be exported here as they are implemented
// export { cacheLayerService } from './CacheLayerService';
