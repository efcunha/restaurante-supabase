# Query Optimizer Service - Implementation Notes

## Overview

The QueryOptimizerService has been successfully implemented for Supabase (PostgreSQL) database optimization. This service provides comprehensive query analysis, optimization, and monitoring capabilities.

## Completed Tasks

### Task 2.1: Core Interfaces ✅
- Created `QueryOptimizerService` class with all required interfaces
- Implemented TypeScript types for `QueryAnalysis`, `IndexSuggestion`, `ExecutionPlan`, and `N1Pattern`
- Set up service structure with proper error handling

### Task 2.2: Query Analysis and EXPLAIN ANALYZE Parsing ✅
- Implemented `analyzeQuery()` method to execute EXPLAIN ANALYZE
- Created PostgreSQL function `execute_sql()` for safe query analysis
- Implemented execution plan parsing to extract:
  - Execution time and planning time
  - Rows scanned and returned
  - Indexes used
  - Performance suggestions
- Added severity classification (low/medium/high)

### Task 2.4: Query Optimization Logic ✅
- Implemented `optimizeQuery()` method with query builder detection
- Created `applyFilters()` for adding filters to queries
- Added `reorderOperations()` framework for operation optimization
- Implemented prepared statement tracking and caching

### Task 2.6: N+1 Query Pattern Detection ✅
- Implemented `detectN1Patterns()` to identify N+1 anti-patterns
- Created query execution tracking with time windows
- Added rapid succession detection (queries < 100ms apart)
- Implemented pattern grouping and analysis
- Generated actionable suggestions for N+1 fixes

### Task 2.7: Index Suggestion Logic ✅
- Implemented `suggestIndexes()` with comprehensive analysis
- Created query structure parser to extract:
  - Table names
  - WHERE clause columns
  - JOIN columns
  - ORDER BY columns
  - JSONB operations
- Added specialized index suggestions:
  - Composite indexes for company_id + date_key
  - Partial indexes for status filters
  - GIN indexes for JSONB columns
  - B-tree indexes for standard columns

## Key Features

### 1. Query Performance Analysis
```typescript
const analysis = await queryOptimizerService.analyzeQuery(sql);
// Returns: execution time, rows scanned, indexes used, suggestions
```

### 2. N+1 Pattern Detection
```typescript
queryOptimizerService.trackQueryExecution(query, executionTime);
const patterns = queryOptimizerService.analyzeN1Patterns();
// Detects queries executed in loops
```

### 3. Index Suggestions
```typescript
const suggestions = await queryOptimizerService.suggestIndexes(query);
// Returns: recommended indexes with estimated improvement
```

### 4. Prepared Statement Management
```typescript
if (queryOptimizerService.shouldUsePreparedStatement(query)) {
  // Use prepared statement for this query
}
```

## Database Migration

A migration file has been created at:
```
supabase/migrations/20260206160000_create_execute_sql_function.sql
```

This migration creates the `execute_sql()` PostgreSQL function needed for EXPLAIN ANALYZE operations.

**To apply the migration:**
```bash
cd supabase
supabase db push
```

## Testing

### Unit Tests
All unit tests pass successfully (13/13):
- Query execution tracking
- Query normalization for prepared statements
- N+1 pattern detection
- Query optimization
- Filter application
- Query history management

**Run tests:**
```bash
cd restaurante-app
npm test -- QueryOptimizerService.test.ts
```

## Usage Examples

### Basic Query Analysis
```typescript
import { queryOptimizerService } from './services/optimization';

// Analyze a slow query
const sql = 'SELECT * FROM orders WHERE company_id = $1 AND date_key = $2';
const analysis = await queryOptimizerService.analyzeQuery(sql);

if (analysis.severity === 'high') {
  console.log('Slow query detected:', analysis.suggestions);
}
```

### Track Queries for N+1 Detection
```typescript
// Track each query execution
queryOptimizerService.trackQueryExecution(query, executionTime);

// Periodically check for N+1 patterns
const patterns = queryOptimizerService.analyzeN1Patterns();
patterns.forEach(pattern => {
  console.log(`N+1 detected: ${pattern.suggestion}`);
});
```

### Get Index Suggestions
```typescript
const query = 'SELECT * FROM orders WHERE company_id = 123 AND status = pending';
const suggestions = await queryOptimizerService.suggestIndexes(query);

suggestions.forEach(suggestion => {
  console.log(`Suggested index on ${suggestion.table}:`, suggestion.columns);
  console.log(`Estimated improvement: ${suggestion.estimatedImprovement}%`);
});
```

## Configuration

The service uses the following default thresholds:
- Slow query threshold: 100ms
- N+1 detection window: 5000ms (5 seconds)
- Prepared statement threshold: 10 executions

These can be adjusted by modifying the class constants.

## Next Steps

The following optional tasks remain:
- **Task 2.3**: Write property test for slow query logging
- **Task 2.5**: Write property test for query execution plan generation

These property-based tests will provide additional validation using the `fast-check` library.

## Integration

The service is exported from:
```typescript
import { queryOptimizerService } from './services/optimization';
```

It can be integrated into:
- Data fetching hooks
- Service layer methods
- Performance monitoring dashboards
- Development tools

## Performance Impact

The QueryOptimizerService is designed to have minimal performance impact:
- Query tracking uses in-memory storage with automatic cleanup
- EXPLAIN ANALYZE is only executed when explicitly requested
- Prepared statement detection uses normalized query patterns
- N+1 detection runs on a sliding time window

## Requirements Satisfied

- ✅ Requirement 1.1: Query execution time monitoring (>100ms)
- ✅ Requirement 1.2: Query execution plan generation
- ✅ Requirement 1.3: N+1 query pattern detection
- ✅ Requirement 1.6: Prepared statement usage
- ✅ Requirement 2.6: Index suggestion generation

## Notes

- The `execute_sql()` function is restricted to EXPLAIN queries only for security
- Query analysis requires database access and will fail gracefully in unit tests
- The service maintains a singleton instance for application-wide usage
- Query history is automatically cleaned up outside the detection window
