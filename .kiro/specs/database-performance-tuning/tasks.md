# Implementation Plan: Database and Application Performance Tuning

## Overview

This implementation plan breaks down the database and application performance optimization into discrete, incremental coding tasks. The approach focuses on building core optimization services first, then implementing database-level optimizations, followed by application-level optimizations, and finally integration and monitoring.

The implementation uses TypeScript for all code components and targets the existing React Native + Supabase architecture.

## Tasks

- [x] 1. Set up performance optimization infrastructure
  - Create directory structure for optimization services
  - Set up TypeScript types and interfaces for performance monitoring
  - Install required dependencies (fast-check for property testing, pg for direct PostgreSQL access)
  - Configure testing framework for property-based tests (minimum 100 iterations)
  - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [x] 2. Implement Query Optimizer Service
  - [x] 2.1 Create QueryOptimizerService with core interfaces
    - Implement QueryAnalysis, IndexSuggestion, and ExecutionPlan types
    - Create service class with method stubs
    - _Requirements: 1.1, 1.2_
  
  - [x] 2.2 Implement query analysis and EXPLAIN ANALYZE parsing
    - Write analyzeQuery() method to execute EXPLAIN ANALYZE
    - Parse PostgreSQL execution plan JSON
    - Extract execution time, rows scanned, indexes used
    - _Requirements: 1.1, 1.2_
  
  - [ ]* 2.3 Write property test for slow query logging
    - **Property 1: Slow query logging**
    - **Validates: Requirements 1.1, 11.1**
  
  - [x] 2.4 Implement query optimization logic
    - Write optimizeQuery() method to add filters and reorder operations
    - Implement prepared statement detection and caching
    - _Requirements: 1.6_
  
  - [ ]* 2.5 Write property test for query execution plan generation
    - **Property 2: Query execution plan generation**
    - **Validates: Requirements 1.2**
  
  - [x] 2.6 Implement N+1 query pattern detection
    - Write detectN1Patterns() method to identify queries in loops
    - Track query execution patterns and timing
    - _Requirements: 1.3_
  
  - [x] 2.7 Implement index suggestion logic
    - Write suggestIndexes() method to analyze query patterns
    - Generate index recommendations based on WHERE clauses and JOIN conditions
    - _Requirements: 2.6_

- [x] 3. Implement Connection Pool Manager
  - [x] 3.1 Create ConnectionPoolManager with configuration
    - Implement PoolConfig and PoolStats interfaces
    - Create connection pool with min/max connection limits (5-20)
    - Configure timeouts (idle: 60s, connection: 5s)
    - _Requirements: 3.1, 3.2, 3.3_
  
  - [x] 3.2 Implement connection lifecycle management
    - Write getConnection() and releaseConnection() methods
    - Implement connection validation and health checks
    - Add connection timeout handling
    - _Requirements: 3.2, 3.7_
  
  - [ ]* 3.3 Write property test for connection pool bounds
    - **Property 9: Connection pool bounds**
    - **Validates: Requirements 3.1**
  
  - [x] 3.4 Implement retry logic with exponential backoff
    - Write retry mechanism for connection failures
    - Implement exponential backoff calculation
    - Add maximum retry attempt limits
    - _Requirements: 3.4, 5.6_
  
  - [ ]* 3.5 Write property test for exponential backoff
    - **Property 10: Exponential backoff for connection errors**
    - **Validates: Requirements 3.4, 5.6**
  
  - [x] 3.6 Implement pool metrics tracking
    - Write getPoolStats() method
    - Track active, idle, and waiting connection counts
    - Add utilization percentage calculation
    - _Requirements: 3.5, 11.3_
  
  - [ ]* 3.7 Write property test for connection pool metrics
    - **Property 11: Connection pool metrics tracking**
    - **Validates: Requirements 3.5, 11.3**
  
  - [ ]* 3.8 Write property test for connection pooling usage
    - **Property 12: Connection pooling for all operations**
    - **Validates: Requirements 3.7**

- [x] 4. Checkpoint - Ensure core services work
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement Cache Layer Service
  - [x] 5.1 Create CacheLayerService with core interfaces
    - Implement CacheEntry, CacheOptions, and CacheStats types
    - Create service class with in-memory storage
    - Set up LRU eviction policy
    - _Requirements: 4.5_
  
  - [x] 5.2 Implement cache get/set operations with TTL
    - Write get() method with expiration checking
    - Write set() method with TTL configuration
    - Implement TTL defaults (products: 5min, settings: 10min, profiles: 3min)
    - _Requirements: 4.1, 4.2, 4.3_
  
  - [ ]* 5.3 Write property test for cache TTL enforcement
    - **Property 13: Cache TTL enforcement**
    - **Validates: Requirements 4.1, 4.2, 4.3**
  
  - [x] 5.4 Implement cache invalidation
    - Write invalidate() method for single key removal
    - Write invalidatePattern() method for pattern-based removal
    - Implement tag-based invalidation
    - _Requirements: 4.4_
  
  - [ ]* 5.5 Write property test for cache invalidation on updates
    - **Property 14: Cache invalidation on updates**
    - **Validates: Requirements 4.4**
  
  - [x] 5.6 Implement LRU eviction and memory management
    - Track access times for each cache entry
    - Implement eviction when memory exceeds 50MB
    - Write eviction logic to remove least recently used entries
    - _Requirements: 4.5, 4.6_
  
  - [ ]* 5.7 Write property test for LRU eviction
    - **Property 15: LRU eviction policy**
    - **Validates: Requirements 4.5**
  
  - [x] 5.8 Implement cache metrics tracking
    - Write getStats() method
    - Track hits, misses, and calculate hit rate
    - Track cache size and entry count
    - _Requirements: 4.7, 11.2_
  
  - [ ]* 5.9 Write property test for cache metrics
    - **Property 16: Cache metrics tracking**
    - **Validates: Requirements 4.7, 11.2**
  
  - [x] 5.10 Implement withCache() wrapper method
    - Write withCache() to wrap fetch operations with caching
    - Handle cache misses by calling fetcher function
    - Implement forceRefresh option
    - _Requirements: 4.1, 4.2, 4.3_

- [x] 6. Implement Real-Time Listener Manager
  - [x] 6.1 Create RealTimeListenerManager with core interfaces
    - Implement RealtimeFilter, Subscription, and SubscriptionStats types
    - Create service class with subscription tracking
    - _Requirements: 5.1_
  
  - [x] 6.2 Implement filtered subscription creation
    - Write subscribe() method with company_id and date_key filters
    - Configure Supabase real-time channel with filters
    - _Requirements: 5.1_
  
  - [ ]* 6.3 Write property test for subscription filtering
    - **Property 17: Real-time subscription filtering**
    - **Validates: Requirements 5.1**
  
  - [x] 6.4 Implement shared subscription management
    - Write getSharedSubscription() method
    - Track subscriptions by channel and filter key
    - Reuse existing subscriptions for identical requests
    - _Requirements: 5.2_
  
  - [ ]* 6.5 Write property test for shared subscriptions
    - **Property 18: Shared subscription deduplication**
    - **Validates: Requirements 5.2**
  
  - [x] 6.6 Implement subscription cleanup
    - Write unsubscribe() method
    - Track component lifecycle and auto-cleanup on unmount
    - _Requirements: 5.3_
  
  - [ ]* 6.7 Write property test for subscription cleanup
    - **Property 19: Subscription cleanup on unmount**
    - **Validates: Requirements 5.3**
  
  - [x] 6.8 Implement update debouncing
    - Write debounceUpdates() method with 500ms delay
    - Apply debouncing to real-time callbacks
    - _Requirements: 5.4_
  
  - [ ]* 6.9 Write property test for update debouncing
    - **Property 20: Real-time update debouncing**
    - **Validates: Requirements 5.4**
  
  - [x] 6.10 Implement subscription limit enforcement
    - Track active subscription count per client
    - Enforce maximum of 5 concurrent subscriptions
    - Queue or reject additional subscription requests
    - _Requirements: 5.5_
  
  - [ ]* 6.11 Write property test for subscription limits
    - **Property 21: Subscription limit enforcement**
    - **Validates: Requirements 5.5**
  
  - [x] 6.12 Implement reconnection logic with exponential backoff
    - Detect disconnection events
    - Implement exponential backoff for reconnection attempts
    - Limit maximum reconnection attempts
    - _Requirements: 5.6_
  
  - [x] 6.13 Implement subscription metrics tracking
    - Write getStats() method
    - Track active subscriptions, messages received, latency
    - _Requirements: 11.4_
  
  - [ ]* 6.14 Write property test for subscription metrics
    - **Property 23: Real-time subscription metrics**
    - **Validates: Requirements 11.4**

- [x] 7. Checkpoint - Ensure optimization services work
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement Batch Operation Manager
  - [x] 8.1 Create BatchOperationManager with core interfaces
    - Implement Operation and BatchResult types
    - Create service class with operation queue
    - _Requirements: 6.1, 6.2, 6.3_
  
  - [x] 8.2 Implement batch operation consolidation
    - Write addOperation() method to queue operations
    - Group operations by type and table
    - _Requirements: 6.1, 6.2, 6.3_
  
  - [ ]* 8.3 Write property test for batch consolidation
    - **Property 24: Batch operation consolidation**
    - **Validates: Requirements 6.1, 6.2, 6.3**
  
  - [x] 8.4 Implement batch execution with transactions
    - Write executeBatch() method
    - Wrap all operations in a single database transaction
    - _Requirements: 6.4_
  
  - [ ]* 8.5 Write property test for batch atomicity
    - **Property 25: Batch transaction atomicity**
    - **Validates: Requirements 6.4**
  
  - [x] 8.6 Implement error handling and rollback
    - Detect operation failures within batch
    - Rollback transaction on any error
    - Collect and report detailed error information
    - _Requirements: 6.5_
  
  - [ ]* 8.7 Write property test for batch rollback
    - **Property 26: Batch rollback on failure**
    - **Validates: Requirements 6.5**
  
  - [x] 8.8 Implement batch size limits
    - Enforce maximum 100 operations per batch
    - Reject or split batches exceeding limit
    - _Requirements: 6.6, 6.7_
  
  - [ ]* 8.9 Write property test for batch size limits
    - **Property 27: Batch size limit enforcement**
    - **Validates: Requirements 6.6**
  
  - [ ]* 8.10 Write property test for batch splitting
    - **Property 28: Batch splitting for oversized operations**
    - **Validates: Requirements 6.7**
  
  - [x] 8.11 Implement auto-flush mechanism
    - Write setAutoFlush() method
    - Trigger batch execution after 1 second or when max size reached
    - _Requirements: 6.6_

- [x] 9. Implement Performance Monitor Service
  - [x] 9.1 Create PerformanceMonitorService with core interfaces
    - Implement MetricsSummary, PerformanceMetric, and DashboardData types
    - Create service class with metrics storage
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_
  
  - [x] 9.2 Implement operation tracking
    - Write trackOperation() method to wrap and time operations
    - Record execution time and metadata
    - _Requirements: 11.1_
  
  - [x] 9.3 Implement slow query logging
    - Write logSlowQuery() method
    - Log queries exceeding 100ms with execution plans
    - Store in query_performance_logs table
    - _Requirements: 11.1_
  
  - [x] 9.4 Implement metrics aggregation
    - Write getMetricsSummary() method
    - Calculate average, p95, and p99 latencies
    - Aggregate cache hit rates and pool utilization
    - _Requirements: 11.2, 11.3_
  
  - [x] 9.5 Implement performance degradation alerting
    - Track baseline performance for queries
    - Detect when execution time increases by >50%
    - Trigger alerts for performance degradation
    - _Requirements: 11.6_
  
  - [ ]* 9.6 Write property test for degradation alerting
    - **Property 41: Performance degradation alerting**
    - **Validates: Requirements 11.6**
  
  - [x] 9.7 Implement database resource monitoring
    - Collect CPU and memory usage metrics from PostgreSQL
    - Query pg_stat_database and pg_stat_activity
    - _Requirements: 11.5_
  
  - [ ]* 9.8 Write property test for resource monitoring
    - **Property 42: Database resource monitoring**
    - **Validates: Requirements 11.5**
  
  - [x] 9.9 Implement dashboard data generation
    - Write getDashboardData() method
    - Format metrics for visualization
    - Include time-series data for charts
    - _Requirements: 11.7_

- [x] 10. Checkpoint - Ensure monitoring works
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Implement database schema enhancements
  - [x] 11.1 Create query_performance_logs table
    - Write migration to create table with proper columns
    - Add indexes for company_id, created_at, and execution_time_ms
    - _Requirements: 11.1_
  
  - [x] 11.2 Create composite indexes for orders table
    - Create idx_orders_company_date index (company_id, date_key DESC)
    - Create idx_orders_company_status index (company_id, status)
    - Create idx_orders_company_comanda index (company_id, comanda_number, date_key)
    - _Requirements: 2.1_
  
  - [ ]* 11.3 Write property test for composite index usage
    - **Property 6: Composite index usage for company and date**
    - **Validates: Requirements 2.1**
  
  - [x] 11.4 Create partial indexes for orders table
    - Create idx_orders_active partial index for pending/preparing orders
    - Create idx_orders_unpaid partial index for unpaid orders
    - _Requirements: 2.2_
  
  - [ ]* 11.5 Write property test for partial index usage
    - **Property 7: Partial index usage for status filters**
    - **Validates: Requirements 2.2**
  
  - [x] 11.6 Create GIN indexes for JSONB fields
    - Create idx_orders_items_gin for orders.items JSONB field
    - Create idx_daily_stats_data_gin for daily_statistics JSONB fields
    - _Requirements: 1.4, 2.3_
  
  - [ ]* 11.7 Write property test for JSONB GIN index usage
    - **Property 3: JSONB GIN index usage**
    - **Validates: Requirements 1.4, 2.3**
  
  - [x] 11.8 Implement table partitioning for orders
    - Create orders_partitioned table with RANGE partitioning by date_key
    - Create initial monthly partitions
    - Write function to automatically create new partitions
    - _Requirements: 8.1, 8.3, 8.4_
  
  - [ ]* 11.9 Write property test for partition key usage
    - **Property 32: Partition key usage in queries**
    - **Validates: Requirements 8.2**
  
  - [ ]* 11.10 Write property test for monthly partition existence
    - **Property 33: Monthly partition existence**
    - **Validates: Requirements 8.3**
  
  - [x] 11.11 Implement partition maintenance
    - Write function to archive or drop old partitions (>12 months)
    - Schedule automatic partition cleanup
    - _Requirements: 8.5_
  
  - [ ]* 11.12 Write property test for old partition handling
    - **Property 34: Old partition handling**
    - **Validates: Requirements 8.5**

- [x] 12. Implement PostgreSQL configuration tuning
  - [x] 12.1 Create database configuration script
    - Write SQL script to apply memory settings (shared_buffers, effective_cache_size, work_mem)
    - Configure query planning settings (jit, random_page_cost, effective_io_concurrency)
    - Configure connection settings (max_connections, timeouts)
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.7_
  
  - [x] 12.2 Configure checkpoint and WAL settings
    - Set checkpoint_completion_target, wal_buffers, max_wal_size
    - _Requirements: 10.5_
  
  - [x] 12.3 Configure auto-vacuum settings
    - Enable auto-vacuum with appropriate thresholds
    - Set autovacuum_vacuum_scale_factor and autovacuum_analyze_scale_factor
    - _Requirements: 10.6_
  
  - [ ]* 12.4 Write unit tests for configuration validation
    - Test that configuration values are within acceptable ranges
    - Verify configuration is applied correctly
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

- [x] 13. Implement RLS policy optimizations
  - [x] 13.1 Audit existing RLS policies
    - Review all RLS policies for performance issues
    - Identify policies with circular dependencies or complex subqueries
    - _Requirements: 7.1_
  
  - [x] 13.2 Optimize RLS helper functions
    - Mark helper functions as STABLE or IMMUTABLE
    - Avoid SECURITY DEFINER unless necessary
    - _Requirements: 7.2, 7.4_
  
  - [ ]* 13.3 Write property test for RLS helper function volatility
    - **Property 29: RLS helper function volatility**
    - **Validates: Requirements 7.2**
  
  - [x] 13.4 Ensure RLS policies use indexed columns
    - Verify all RLS policies filter by indexed columns (company_id)
    - Add indexes if missing
    - _Requirements: 7.3_
  
  - [ ]* 13.5 Write property test for RLS indexed column usage
    - **Property 30: RLS indexed column usage**
    - **Validates: Requirements 7.3**
  
  - [x] 13.6 Refactor complex RLS policies
    - Break complex policies into multiple simpler policies
    - Use direct subqueries instead of function calls where possible
    - _Requirements: 7.5, 7.7_
  
  - [ ]* 13.7 Write property test for RLS policy performance
    - **Property 31: RLS policy performance**
    - **Validates: Requirements 7.6**

- [x] 14. Checkpoint - Ensure database optimizations work
  - Ensure all tests pass, ask the user if questions arise.

- [x] 15. Implement application-level query optimizations
  - [x] 15.1 Implement cursor-based pagination utility
    - Write pagination helper function using cursor-based approach
    - Avoid OFFSET, use indexed columns for cursor keys
    - Limit page size to maximum 50 records
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.7_
  
  - [ ]* 15.2 Write property test for cursor-based pagination
    - **Property 37: Cursor-based pagination implementation**
    - **Validates: Requirements 9.1, 9.3, 9.4, 9.7**
  
  - [ ]* 15.3 Write property test for page size limits
    - **Property 38: Page size limit enforcement**
    - **Validates: Requirements 9.2**
  
  - [x] 15.4 Implement pagination cursor validation
    - Write cursor validation logic
    - Reject invalid or tampered cursors
    - _Requirements: 9.5_
  
  - [ ]* 15.5 Write property test for cursor validation
    - **Property 39: Pagination cursor validation**
    - **Validates: Requirements 9.5**
  
  - [x] 15.6 Implement count estimation
    - Write count estimation using pg_class statistics
    - Avoid full table scans for total counts
    - _Requirements: 9.6_
  
  - [ ]* 15.7 Write property test for count estimation
    - **Property 40: Count estimation without full scans**
    - **Validates: Requirements 9.6**
  
  - [x] 15.8 Refactor N+1 query patterns in existing code
    - Identify and refactor N+1 patterns in orders, products, and payments queries
    - Use joins or batch queries instead of loops
    - _Requirements: 1.3_
  
  - [x] 15.9 Implement request deduplication
    - Create RequestDeduplicator class
    - Deduplicate concurrent identical requests
    - _Requirements: 12.3_
  
  - [ ]* 15.10 Write property test for request deduplication
    - **Property 44: Request deduplication**
    - **Validates: Requirements 12.3**

- [x] 16. Implement React Native performance optimizations
  - [x] 16.1 Optimize list rendering with virtualization
    - Update FlatList components with optimization props (initialNumToRender, maxToRenderPerBatch, windowSize, removeClippedSubviews)
    - Implement getItemLayout for fixed-height items
    - _Requirements: 12.1_
  
  - [ ]* 16.2 Write property test for list virtualization
    - **Property 43: List virtualization**
    - **Validates: Requirements 12.1**
  
  - [x] 16.3 Implement component memoization
    - Add React.memo to expensive components (OrderCard, ProductCard)
    - Add useMemo for expensive computations
    - Add useCallback for event handlers
    - _Requirements: 12.2_
  
  - [ ]* 16.4 Write unit tests for memoization
    - Test that memoized components don't re-render unnecessarily
    - Test that useMemo computations are cached correctly
    - _Requirements: 12.2_
  
  - [x] 16.5 Implement lazy loading for screens
    - Use React.lazy() for screen components
    - Implement Suspense boundaries with loading indicators
    - _Requirements: 12.4_
  
  - [x] 16.6 Implement image caching and lazy loading
    - Configure image caching with react-native-fast-image or similar
    - Implement lazy loading for images outside viewport
    - _Requirements: 12.5_
  
  - [ ]* 16.7 Write property test for image caching
    - **Property 45: Image caching and lazy loading**
    - **Validates: Requirements 12.5**
  
  - [x] 16.8 Implement state update batching
    - Use React 18 automatic batching
    - Batch manual state updates where needed
    - _Requirements: 12.7_
  
  - [ ]* 16.9 Write property test for state batching
    - **Property 46: State update batching**
    - **Validates: Requirements 12.7**
  
  - [x] 16.10 Optimize bundle size
    - Analyze bundle with Metro bundler
    - Remove unused dependencies
    - Implement code splitting where appropriate
    - _Requirements: 12.6_

- [x] 17. Integrate optimization services into application
  - [x] 17.1 Wire QueryOptimizerService into data layer
    - Integrate query analysis into all database queries
    - Log slow queries automatically
    - Apply query optimizations
    - _Requirements: 1.1, 1.2, 1.6_
  
  - [x] 17.2 Wire ConnectionPoolManager into Supabase client
    - Replace direct Supabase client calls with pooled connections
    - Configure pool settings based on environment
    - _Requirements: 3.1, 3.7_
  
  - [x] 17.3 Wire CacheLayerService into data fetching hooks
    - Wrap all data fetching with cache layer
    - Implement cache invalidation on mutations
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  
  - [x] 17.4 Wire RealTimeListenerManager into real-time hooks
    - Replace direct Supabase subscriptions with managed subscriptions
    - Apply filters and debouncing
    - Implement automatic cleanup
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  
  - [x] 17.5 Wire BatchOperationManager into mutation operations
    - Batch multiple inserts, updates, and deletes
    - Use transactions for atomicity
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  
  - [x] 17.6 Wire PerformanceMonitorService into application
    - Track all database operations
    - Monitor cache hit rates
    - Monitor connection pool utilization
    - _Requirements: 11.1, 11.2, 11.3_
  
  - [ ]* 17.7 Write integration tests for wired services
    - Test end-to-end data flow with optimization services
    - Verify caching, pooling, and batching work together
    - _Requirements: 1.1, 3.1, 4.1, 5.1, 6.1_

- [x] 18. Implement performance dashboard
  - [x] 18.1 Create dashboard UI components
    - Create performance metrics visualization components
    - Display query performance, cache hit rates, pool utilization
    - Show real-time subscription metrics
    - _Requirements: 11.7_
  
  - [x] 18.2 Implement dashboard data fetching
    - Fetch metrics from PerformanceMonitorService
    - Update dashboard in real-time
    - _Requirements: 11.7_
  
  - [ ]* 18.3 Write unit tests for dashboard components
    - Test metric visualization rendering
    - Test data formatting and display
    - _Requirements: 11.7_

- [x] 19. Final checkpoint - End-to-end testing
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 20. Performance validation and benchmarking
  - [ ]* 20.1 Run performance benchmarks
    - Measure query response times (target: <100ms p95)
    - Measure cache hit rates (target: >80%)
    - Measure real-time latency (target: <500ms)
    - Measure app startup time (target: <2s)
    - _Requirements: 1.1, 4.7, 5.4_
  
  - [ ]* 20.2 Load testing with concurrent users
    - Test with 50+ concurrent users
    - Verify no performance degradation
    - Monitor connection pool and cache behavior
    - _Requirements: 3.1, 3.5_
  
  - [ ]* 20.3 Write performance regression tests
    - Create automated tests to detect performance regressions
    - Set up CI/CD integration for performance testing
    - _Requirements: 11.6_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation throughout implementation
- Property tests validate universal correctness properties with minimum 100 iterations using fast-check
- Unit tests validate specific examples, edge cases, and integration points
- All code uses TypeScript for type safety and better developer experience
- Database migrations should be reversible with down migrations
- Performance optimizations should be measured before and after to validate improvements
- The implementation follows the existing React Native + Supabase architecture
