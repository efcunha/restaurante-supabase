/**
 * Performance Optimization Types
 * 
 * TypeScript interfaces and types for performance monitoring and optimization services.
 * These types support the database and application performance tuning infrastructure.
 * 
 * Requirements: 11.1, 11.2, 11.3, 11.4
 */

// ============================================================================
// Query Optimizer Types
// ============================================================================

/**
 * Query analysis result from EXPLAIN ANALYZE
 */
export interface QueryAnalysis {
  executionTime: number;
  rowsScanned: number;
  rowsReturned: number;
  indexesUsed: string[];
  suggestions: string[];
  severity: 'low' | 'medium' | 'high';
  executionPlan?: any;
}

/**
 * Index suggestion for query optimization
 */
export interface IndexSuggestion {
  table: string;
  columns: string[];
  type: 'btree' | 'gin' | 'gist' | 'hash';
  partial: boolean;
  whereClause?: string;
  estimatedImprovement: number;
}

/**
 * Query execution plan from PostgreSQL
 */
export interface ExecutionPlan {
  planningTime: number;
  executionTime: number;
  totalCost: number;
  plan: any;
}

/**
 * N+1 query pattern detection
 */
export interface N1Pattern {
  queryPattern: string;
  occurrences: number;
  totalTime: number;
  suggestion: string;
}

// ============================================================================
// Connection Pool Types
// ============================================================================

/**
 * Connection pool configuration
 */
export interface PoolConfig {
  minConnections: number;
  maxConnections: number;
  idleTimeout: number;
  connectionTimeout: number;
  retryAttempts: number;
  retryDelay: number;
}

/**
 * Connection pool statistics
 */
export interface PoolStats {
  active: number;
  idle: number;
  waiting: number;
  total: number;
  utilization: number;
}

/**
 * Database connection interface
 */
export interface Connection {
  query<T = any>(sql: string, params?: any[]): Promise<T>;
  release(): void;
}

// ============================================================================
// Cache Layer Types
// ============================================================================

/**
 * Cache entry with metadata
 */
export interface CacheEntry<T> {
  key: string;
  data: T;
  timestamp: number;
  ttl: number;
  compressed: boolean;
  tags: string[];
  hits: number;
  lastAccessed: Date;
}

/**
 * Cache options for operations
 */
export interface CacheOptions {
  ttl?: number;
  forceRefresh?: boolean;
  tags?: string[];
}

/**
 * Cache statistics
 */
export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  entries: number;
}

// ============================================================================
// Real-Time Listener Types
// ============================================================================

/**
 * Real-time subscription filter
 */
export interface RealtimeFilter {
  table: string;
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string;
}

/**
 * Real-time subscription
 */
export interface Subscription {
  id: string;
  channel: string;
  filters: RealtimeFilter;
  callback: (payload: any) => void;
  unsubscribe: () => void;
}

/**
 * Real-time subscription statistics
 */
export interface SubscriptionStats {
  activeSubscriptions: number;
  messagesReceived: number;
  averageLatency: number;
  reconnections: number;
}

// ============================================================================
// Batch Operation Types
// ============================================================================

/**
 * Database operation for batching
 */
export interface Operation {
  type: 'insert' | 'update' | 'delete';
  table: string;
  data: any;
  where?: any;
}

/**
 * Batch operation result
 */
export interface BatchResult {
  success: boolean;
  affectedRows: number;
  errors: Error[];
  executionTime: number;
}

// ============================================================================
// Performance Monitoring Types
// ============================================================================

/**
 * Performance metric record
 */
export interface PerformanceMetric {
  id: string;
  metricType: 'query' | 'cache' | 'connection' | 'realtime';
  operationName: string;
  value: number;
  unit: 'ms' | 'count' | 'bytes' | 'percent';
  timestamp: Date;
  metadata: Record<string, any>;
}

/**
 * Metrics summary for dashboard
 */
export interface MetricsSummary {
  totalOperations: number;
  averageLatency: number;
  p95Latency: number;
  p99Latency: number;
  slowQueries: number;
  cacheHitRate: number;
  connectionPoolUtilization: number;
}

/**
 * Dashboard data structure
 */
export interface DashboardData {
  summary: MetricsSummary;
  queryMetrics: QueryMetric[];
  cacheMetrics: CacheMetric[];
  connectionMetrics: ConnectionMetric[];
  realtimeMetrics: RealtimeMetric[];
}

/**
 * Query performance metric
 */
export interface QueryMetric {
  query: string;
  executionTime: number;
  rowsScanned: number;
  rowsReturned: number;
  timestamp: Date;
}

/**
 * Cache performance metric
 */
export interface CacheMetric {
  key: string;
  hits: number;
  misses: number;
  hitRate: number;
  timestamp: Date;
}

/**
 * Connection pool metric
 */
export interface ConnectionMetric {
  active: number;
  idle: number;
  waiting: number;
  utilization: number;
  timestamp: Date;
}

/**
 * Real-time subscription metric
 */
export interface RealtimeMetric {
  channel: string;
  messagesReceived: number;
  latency: number;
  timestamp: Date;
}

// ============================================================================
// Query Performance Log Types
// ============================================================================

/**
 * Query performance log entry for database storage
 */
export interface QueryPerformanceLog {
  id: string;
  query: string;
  executionTime: number;
  rowsScanned: number;
  rowsReturned: number;
  indexesUsed: string[];
  executionPlan: any;
  timestamp: Date;
  companyId: string;
  userId?: string;
}

// ============================================================================
// Index Metadata Types
// ============================================================================

/**
 * Database index metadata
 */
export interface IndexMetadata {
  tableName: string;
  indexName: string;
  columns: string[];
  indexType: 'btree' | 'gin' | 'gist' | 'hash';
  isPartial: boolean;
  whereClause?: string;
  sizeBytes: number;
  scansCount: number;
  lastUsed?: Date;
  createdAt: Date;
}

// ============================================================================
// Pagination Types
// ============================================================================

/**
 * Cursor-based pagination result
 */
export interface PageResult<T> {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  cursor?: string;
  pageSize?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}
