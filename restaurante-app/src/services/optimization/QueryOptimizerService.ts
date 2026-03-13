/**
 * Query Optimizer Service
 * 
 * Analyzes and optimizes database queries for Supabase (PostgreSQL).
 * Provides query analysis, EXPLAIN ANALYZE parsing, N+1 detection, and index suggestions.
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.6, 2.6
 */

import { supabase } from '../../config/SupabaseConfig';
import type {
  QueryAnalysis,
  IndexSuggestion,
  ExecutionPlan,
  N1Pattern,
} from '../../types/performance';

/**
 * Query execution tracking for N+1 detection
 */
interface QueryExecution {
  query: string;
  timestamp: number;
  executionTime: number;
  stackTrace?: string;
}

/**
 * Prepared statement cache entry
 */
interface PreparedStatement {
  query: string;
  executionCount: number;
  lastExecuted: number;
}

/**
 * Query Optimizer Service
 * 
 * Provides comprehensive query optimization capabilities including:
 * - Query performance analysis with EXPLAIN ANALYZE
 * - N+1 query pattern detection
 * - Index suggestion generation
 * - Prepared statement management
 */
export class QueryOptimizerService {
  private queryExecutions: QueryExecution[] = [];
  private preparedStatements: Map<string, PreparedStatement> = new Map();
  private readonly SLOW_QUERY_THRESHOLD_MS = 100;
  private readonly N1_DETECTION_WINDOW_MS = 5000;
  private readonly PREPARED_STATEMENT_THRESHOLD = 10;

  /**
   * Analyze query performance using EXPLAIN ANALYZE
   * 
   * @param sql - SQL query to analyze
   * @returns Query analysis with performance metrics
   * 
   * Requirements: 1.1, 1.2
   */
  async analyzeQuery(sql: string): Promise<QueryAnalysis> {
    try {
      // Execute EXPLAIN ANALYZE to get query execution plan
      const explainQuery = `EXPLAIN (ANALYZE, FORMAT JSON) ${sql}`;

      const { data, error } = await supabase.rpc('execute_sql', {
        query: explainQuery
      });

      if (error) {
        throw new Error(`Failed to analyze query: ${error.message}`);
      }

      // The RPC returns the JSONB result directly.
      // Since FORMAT JSON is used, it should be an array of query plans.
      let planArray: any[] = [];
      let planData: any = null;

      if (Array.isArray(data)) {
        // Case 1: data is the plan array itself (most common with RPC returning JSONB)
        if (data.length > 0 && (data[0]['Plan'] || data[0]['QUERY PLAN'])) {
          planArray = data;
        }
        // Case 2: data is wrapped in a 'result' property (legacy or specific RPC config)
        else if (data[0]?.result && Array.isArray(data[0].result)) {
          planArray = data[0].result;
        }
        // Case 3: Just treat data as the array if it has valid items
        else if (data.length > 0) {
          planArray = data;
        }
      }

      if (planArray.length === 0) {
        console.warn('[QueryOptimizer] Unexpected RPC response format:', JSON.stringify(data));
        throw new Error('Invalid execution plan format - expected array');
      }

      // The plan array contains objects with "Plan" (JSON) or "QUERY PLAN" (Text) key
      planData = planArray[0]?.['Plan'] || planArray[0]?.['QUERY PLAN'];

      if (!planData) {
        // Sometimes the plan is the object itself if parsing failed in a specific way
        console.warn('[QueryOptimizer] No Plan found in:', JSON.stringify(planArray[0]));
        throw new Error('No QUERY PLAN found in response');
      }

      // planData is the actual execution plan object
      return this.parseExecutionPlan(planData, sql);
    } catch (error) {
      console.error('[QueryOptimizer] Error analyzing query:', error);

      // Return a basic analysis on error
      return {
        executionTime: 0,
        rowsScanned: 0,
        rowsReturned: 0,
        indexesUsed: [],
        suggestions: [`Failed to analyze query: ${error instanceof Error ? error.message : 'Unknown error'}`],
        severity: 'high',
      };
    }
  }

  /**
   * Parse PostgreSQL execution plan and extract metrics
   * 
   * @param plan - Execution plan from EXPLAIN ANALYZE
   * @param sql - Original SQL query
   * @returns Parsed query analysis
   */
  private parseExecutionPlan(plan: any, sql: string): QueryAnalysis {
    const executionTime = plan['Execution Time'] || 0;
    const planningTime = plan['Planning Time'] || 0;
    const totalTime = executionTime + planningTime;

    // Extract rows scanned and returned
    const rowsScanned = this.extractRowsScanned(plan.Plan);
    const rowsReturned = plan.Plan?.['Actual Rows'] || 0;

    // Extract indexes used
    const indexesUsed = this.extractIndexes(plan.Plan);

    // Generate suggestions
    const suggestions = this.generateSuggestions(
      totalTime,
      rowsScanned,
      rowsReturned,
      indexesUsed,
      sql
    );

    // Determine severity
    const severity = this.determineSeverity(totalTime, rowsScanned, rowsReturned);

    return {
      executionTime: totalTime,
      rowsScanned,
      rowsReturned,
      indexesUsed,
      suggestions,
      severity,
      executionPlan: plan, // Keep as is for internal use
    };
  }

  /**
   * Extract total rows scanned from execution plan
   */
  private extractRowsScanned(planNode: any): number {
    if (!planNode) return 0;

    let total = planNode['Actual Rows'] || 0;

    // Recursively sum rows from child plans
    if (planNode.Plans && Array.isArray(planNode.Plans)) {
      for (const childPlan of planNode.Plans) {
        total += this.extractRowsScanned(childPlan);
      }
    }

    return total;
  }

  /**
   * Extract index names from execution plan
   */
  private extractIndexes(planNode: any): string[] {
    const indexes: string[] = [];

    if (!planNode) return indexes;

    // Check if this node uses an index
    if (planNode['Index Name']) {
      indexes.push(planNode['Index Name']);
    }

    // Recursively check child plans
    if (planNode.Plans && Array.isArray(planNode.Plans)) {
      for (const childPlan of planNode.Plans) {
        indexes.push(...this.extractIndexes(childPlan));
      }
    }

    return indexes;
  }

  /**
   * Generate optimization suggestions based on analysis
   */
  private generateSuggestions(
    executionTime: number,
    rowsScanned: number,
    rowsReturned: number,
    indexesUsed: string[],
    sql: string
  ): string[] {
    const suggestions: string[] = [];

    // Slow query suggestion
    if (executionTime > this.SLOW_QUERY_THRESHOLD_MS) {
      suggestions.push(
        `Query execution time (${executionTime.toFixed(2)}ms) exceeds threshold (${this.SLOW_QUERY_THRESHOLD_MS}ms)`
      );
    }

    // Sequential scan suggestion
    if (indexesUsed.length === 0 && rowsScanned > 100) {
      suggestions.push(
        'No indexes used - consider adding indexes on filtered/joined columns'
      );
    }

    // High scan-to-return ratio
    if (rowsReturned > 0 && rowsScanned / rowsReturned > 10) {
      suggestions.push(
        `High scan-to-return ratio (${(rowsScanned / rowsReturned).toFixed(1)}:1) - consider more selective filters`
      );
    }

    // JSONB query suggestion
    if (sql.includes('->') || sql.includes('->>')) {
      if (!indexesUsed.some(idx => idx.includes('gin'))) {
        suggestions.push('JSONB query detected - consider adding GIN index');
      }
    }

    // Full table scan suggestion
    if (rowsScanned > 1000 && indexesUsed.length === 0) {
      suggestions.push('Full table scan detected - add appropriate indexes');
    }

    return suggestions;
  }

  /**
   * Determine severity level based on metrics
   */
  private determineSeverity(
    executionTime: number,
    rowsScanned: number,
    rowsReturned: number
  ): 'low' | 'medium' | 'high' {
    if (executionTime > 500 || rowsScanned > 10000) {
      return 'high';
    }
    if (executionTime > 100 || rowsScanned > 1000) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Get query execution plan without executing the query
   * 
   * @param sql - SQL query to explain
   * @returns Execution plan details
   * 
   * Requirements: 1.2
   */
  async explainQuery(sql: string): Promise<ExecutionPlan> {
    try {
      const explainQuery = `EXPLAIN (FORMAT JSON) ${sql}`;

      const { data, error } = await supabase.rpc('execute_sql', {
        query: explainQuery
      });

      if (error) {
        throw new Error(`Failed to explain query: ${error.message}`);
      }

      // Parse the RPC response (same logic as analyzeQuery)
      let planArray: any[] = [];
      let planData: any = null;

      if (Array.isArray(data)) {
        if (data.length > 0 && (data[0]['Plan'] || data[0]['QUERY PLAN'])) {
          planArray = data;
        } else if (data[0]?.result && Array.isArray(data[0].result)) {
          planArray = data[0].result;
        } else if (data.length > 0) {
          planArray = data;
        }
      }

      if (planArray.length === 0) {
        throw new Error('Invalid execution plan format - expected array');
      }

      planData = planArray[0]?.['Plan'] || planArray[0]?.['QUERY PLAN'];

      if (!planData) {
        throw new Error('No QUERY PLAN found in response');
      }

      return {
        planningTime: planData['Planning Time'] || 0,
        executionTime: 0, // EXPLAIN doesn't execute
        totalCost: planData.Plan?.['Total Cost'] || 0,
        plan: planData.Plan,
      };
    } catch (error) {
      console.error('[QueryOptimizer] Error explaining query:', error);
      throw error;
    }
  }

  /**
   * Optimize query by applying optimization rules
   * 
   * @param query - Query builder or SQL string
   * @returns Optimized query
   * 
   * Requirements: 1.6
   */
  optimizeQuery(query: any): any {
    // If query is a Supabase query builder, apply optimizations
    if (this.isSupabaseQueryBuilder(query)) {
      return this.optimizeSupabaseQuery(query);
    }

    // If query is a SQL string, return as-is (optimization happens at analysis level)
    return query;
  }

  /**
   * Check if object is a Supabase query builder
   */
  private isSupabaseQueryBuilder(query: any): boolean {
    return query && typeof query === 'object' &&
      typeof query.select === 'function' &&
      typeof query.filter === 'function';
  }

  /**
   * Optimize Supabase query builder
   */
  private optimizeSupabaseQuery(query: any): any {
    // Apply common optimizations:
    // 1. Ensure company_id filter is present (for RLS optimization)
    // 2. Add appropriate ordering
    // 3. Limit results to prevent large result sets

    // Note: Actual query modification depends on the query builder API
    // This is a framework for optimization - specific optimizations
    // will be applied based on query patterns

    return query;
  }

  /**
   * Apply filters to optimize query performance
   * 
   * @param query - Supabase query builder
   * @param filters - Filters to apply
   * @returns Query with filters applied
   */
  applyFilters(query: any, filters: Record<string, any>): any {
    let optimizedQuery = query;

    // Apply each filter
    for (const [column, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          optimizedQuery = optimizedQuery.in(column, value);
        } else {
          optimizedQuery = optimizedQuery.eq(column, value);
        }
      }
    }

    return optimizedQuery;
  }

  /**
   * Reorder query operations for optimal performance
   * 
   * @param query - Supabase query builder
   * @returns Query with reordered operations
   */
  reorderOperations(query: any): any {
    // In PostgreSQL/Supabase, the query optimizer handles operation ordering
    // This method is a placeholder for any client-side reordering logic
    // that might be beneficial

    return query;
  }

  /**
   * Detect N+1 query patterns
   * 
   * @param queries - Array of executed queries
   * @returns Detected N+1 patterns
   * 
   * Requirements: 1.3
   */
  detectN1Patterns(queries: QueryExecution[]): N1Pattern[] {
    const patterns: Map<string, N1Pattern> = new Map();

    // Group queries by normalized pattern
    const queryGroups = this.groupQueriesByPattern(queries);

    // Analyze each group for N+1 patterns
    for (const [pattern, executions] of queryGroups.entries()) {
      // N+1 pattern indicators:
      // 1. Same query executed multiple times in short time window
      // 2. Queries executed in rapid succession (< 100ms apart)
      // 3. More than 5 occurrences of the same pattern

      if (executions.length > 5) {
        // Check if queries are in rapid succession
        const isRapidSuccession = this.checkRapidSuccession(executions);

        if (isRapidSuccession) {
          const totalTime = executions.reduce((sum, e) => sum + e.executionTime, 0);

          patterns.set(pattern, {
            queryPattern: pattern,
            occurrences: executions.length,
            totalTime,
            suggestion: this.generateN1Suggestion(pattern, executions.length, totalTime),
          });
        }
      }
    }

    return Array.from(patterns.values());
  }

  /**
   * Group queries by normalized pattern
   */
  private groupQueriesByPattern(queries: QueryExecution[]): Map<string, QueryExecution[]> {
    const groups = new Map<string, QueryExecution[]>();

    for (const query of queries) {
      const pattern = this.normalizeQuery(query.query);

      if (!groups.has(pattern)) {
        groups.set(pattern, []);
      }

      groups.get(pattern)!.push(query);
    }

    return groups;
  }

  /**
   * Check if queries are executed in rapid succession
   */
  private checkRapidSuccession(executions: QueryExecution[]): boolean {
    if (executions.length < 2) return false;

    // Sort by timestamp
    const sorted = [...executions].sort((a, b) => a.timestamp - b.timestamp);

    // Check if most queries are within 100ms of each other
    let rapidCount = 0;
    for (let i = 1; i < sorted.length; i++) {
      const timeDiff = sorted[i].timestamp - sorted[i - 1].timestamp;
      if (timeDiff < 100) {
        rapidCount++;
      }
    }

    // If more than 70% of queries are in rapid succession, it's likely N+1
    return rapidCount / (sorted.length - 1) > 0.7;
  }

  /**
   * Generate suggestion for N+1 pattern
   */
  private generateN1Suggestion(pattern: string, occurrences: number, totalTime: number): string {
    const avgTime = totalTime / occurrences;

    let suggestion = `N+1 query pattern detected: ${occurrences} similar queries executed in rapid succession. `;
    suggestion += `Total time: ${totalTime.toFixed(2)}ms (avg: ${avgTime.toFixed(2)}ms per query). `;

    // Provide specific suggestions based on query pattern
    if (pattern.includes('WHERE') && pattern.includes('=')) {
      suggestion += 'Consider using a JOIN or IN clause to fetch all related data in a single query.';
    } else if (pattern.includes('SELECT')) {
      suggestion += 'Consider batching these queries or using a more efficient data fetching strategy.';
    } else {
      suggestion += 'Refactor to use batch queries or joins instead of individual queries in a loop.';
    }

    return suggestion;
  }

  /**
   * Analyze current query execution history for N+1 patterns
   * 
   * @returns Detected N+1 patterns from recent executions
   */
  analyzeN1Patterns(): N1Pattern[] {
    return this.detectN1Patterns(this.queryExecutions);
  }

  /**
   * Suggest indexes for a query
   * 
   * @param query - SQL query to analyze
   * @returns Array of index suggestions
   * 
   * Requirements: 2.6
   */
  async suggestIndexes(query: string): Promise<IndexSuggestion[]> {
    const suggestions: IndexSuggestion[] = [];

    try {
      // First, analyze the query to understand its structure
      const analysis = await this.analyzeQuery(query);

      // If no indexes are being used and query is slow, suggest indexes
      if (analysis.indexesUsed.length === 0 && analysis.executionTime > this.SLOW_QUERY_THRESHOLD_MS) {
        // Parse query to extract table and column information
        const queryInfo = this.parseQueryStructure(query);

        // Suggest indexes based on WHERE clauses
        if (queryInfo.whereColumns.length > 0) {
          suggestions.push(...this.suggestWhereIndexes(queryInfo));
        }

        // Suggest indexes based on JOIN conditions
        if (queryInfo.joinColumns.length > 0) {
          suggestions.push(...this.suggestJoinIndexes(queryInfo));
        }

        // Suggest indexes for ORDER BY columns
        if (queryInfo.orderByColumns.length > 0) {
          suggestions.push(...this.suggestOrderByIndexes(queryInfo));
        }

        // Suggest GIN indexes for JSONB operations
        if (queryInfo.jsonbColumns.length > 0) {
          suggestions.push(...this.suggestJsonbIndexes(queryInfo));
        }
      }

      // Suggest composite indexes for common query patterns
      if (query.includes('company_id') && query.includes('date_key')) {
        suggestions.push({
          table: this.extractTableName(query),
          columns: ['company_id', 'date_key'],
          type: 'btree',
          partial: false,
          estimatedImprovement: 70,
        });
      }

      // Suggest partial indexes for status filters
      if (query.includes('status') && (query.includes('pending') || query.includes('preparing'))) {
        suggestions.push({
          table: this.extractTableName(query),
          columns: ['company_id', 'status'],
          type: 'btree',
          partial: true,
          whereClause: "status IN ('pending', 'preparing')",
          estimatedImprovement: 60,
        });
      }

    } catch (error) {
      console.error('[QueryOptimizer] Error suggesting indexes:', error);
    }

    return suggestions;
  }

  /**
   * Parse query structure to extract column and table information
   */
  private parseQueryStructure(query: string): {
    tables: string[];
    whereColumns: string[];
    joinColumns: string[];
    orderByColumns: string[];
    jsonbColumns: string[];
  } {
    const structure = {
      tables: [] as string[],
      whereColumns: [] as string[],
      joinColumns: [] as string[],
      orderByColumns: [] as string[],
      jsonbColumns: [] as string[],
    };

    // Extract table names (basic parsing)
    const fromMatch = query.match(/FROM\s+(\w+)/i);
    if (fromMatch) {
      structure.tables.push(fromMatch[1]);
    }

    // Extract WHERE clause columns
    const whereMatches = query.matchAll(/WHERE\s+.*?(\w+)\s*[=<>]/gi);
    for (const match of whereMatches) {
      if (match[1]) structure.whereColumns.push(match[1]);
    }

    // Extract JOIN columns
    const joinMatches = query.matchAll(/JOIN\s+\w+\s+ON\s+.*?(\w+)\s*=/gi);
    for (const match of joinMatches) {
      if (match[1]) structure.joinColumns.push(match[1]);
    }

    // Extract ORDER BY columns
    const orderByMatches = query.matchAll(/ORDER\s+BY\s+(\w+)/gi);
    for (const match of orderByMatches) {
      if (match[1]) structure.orderByColumns.push(match[1]);
    }

    // Detect JSONB operations
    if (query.includes('->') || query.includes('->>') || query.includes('@>')) {
      const jsonbMatches = query.matchAll(/(\w+)\s*-[>]{1,2}/g);
      for (const match of jsonbMatches) {
        if (match[1]) structure.jsonbColumns.push(match[1]);
      }
    }

    return structure;
  }

  /**
   * Suggest indexes for WHERE clause columns
   */
  private suggestWhereIndexes(queryInfo: any): IndexSuggestion[] {
    const suggestions: IndexSuggestion[] = [];
    const table = queryInfo.tables[0] || 'unknown';

    // Suggest single-column indexes for WHERE clauses
    for (const column of queryInfo.whereColumns) {
      suggestions.push({
        table,
        columns: [column],
        type: 'btree',
        partial: false,
        estimatedImprovement: 50,
      });
    }

    // Suggest composite index if multiple WHERE columns
    if (queryInfo.whereColumns.length > 1) {
      suggestions.push({
        table,
        columns: queryInfo.whereColumns,
        type: 'btree',
        partial: false,
        estimatedImprovement: 65,
      });
    }

    return suggestions;
  }

  /**
   * Suggest indexes for JOIN columns
   */
  private suggestJoinIndexes(queryInfo: any): IndexSuggestion[] {
    const suggestions: IndexSuggestion[] = [];
    const table = queryInfo.tables[0] || 'unknown';

    for (const column of queryInfo.joinColumns) {
      suggestions.push({
        table,
        columns: [column],
        type: 'btree',
        partial: false,
        estimatedImprovement: 70,
      });
    }

    return suggestions;
  }

  /**
   * Suggest indexes for ORDER BY columns
   */
  private suggestOrderByIndexes(queryInfo: any): IndexSuggestion[] {
    const suggestions: IndexSuggestion[] = [];
    const table = queryInfo.tables[0] || 'unknown';

    // Combine WHERE and ORDER BY columns for composite index
    if (queryInfo.whereColumns.length > 0 && queryInfo.orderByColumns.length > 0) {
      suggestions.push({
        table,
        columns: [...queryInfo.whereColumns, ...queryInfo.orderByColumns],
        type: 'btree',
        partial: false,
        estimatedImprovement: 75,
      });
    }

    return suggestions;
  }

  /**
   * Suggest GIN indexes for JSONB columns
   */
  private suggestJsonbIndexes(queryInfo: any): IndexSuggestion[] {
    const suggestions: IndexSuggestion[] = [];
    const table = queryInfo.tables[0] || 'unknown';

    for (const column of queryInfo.jsonbColumns) {
      suggestions.push({
        table,
        columns: [column],
        type: 'gin',
        partial: false,
        estimatedImprovement: 80,
      });
    }

    return suggestions;
  }

  /**
   * Extract table name from query
   */
  private extractTableName(query: string): string {
    const match = query.match(/FROM\s+(\w+)/i);
    return match ? match[1] : 'unknown';
  }

  /**
   * Track query execution for N+1 detection
   * 
   * @param query - SQL query executed
   * @param executionTime - Query execution time in ms
   */
  trackQueryExecution(query: string, executionTime: number): void {
    const execution: QueryExecution = {
      query,
      timestamp: Date.now(),
      executionTime,
    };

    this.queryExecutions.push(execution);

    // Clean up old executions outside detection window
    const cutoff = Date.now() - this.N1_DETECTION_WINDOW_MS;
    this.queryExecutions = this.queryExecutions.filter(
      (e) => e.timestamp > cutoff
    );

    // Track for prepared statement caching
    this.trackPreparedStatement(query);
  }

  /**
   * Track query for prepared statement caching
   */
  private trackPreparedStatement(query: string): void {
    const normalized = this.normalizeQuery(query);
    const existing = this.preparedStatements.get(normalized);

    if (existing) {
      existing.executionCount++;
      existing.lastExecuted = Date.now();
    } else {
      this.preparedStatements.set(normalized, {
        query: normalized,
        executionCount: 1,
        lastExecuted: Date.now(),
      });
    }
  }

  /**
   * Normalize query for prepared statement matching
   */
  private normalizeQuery(query: string): string {
    // Replace literal values with placeholders
    return query
      .replace(/\d+/g, '?')
      .replace(/'[^']*'/g, '?')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Check if query should use prepared statement
   */
  shouldUsePreparedStatement(query: string): boolean {
    const normalized = this.normalizeQuery(query);
    const statement = this.preparedStatements.get(normalized);

    return statement
      ? statement.executionCount >= this.PREPARED_STATEMENT_THRESHOLD
      : false;
  }

  /**
   * Get prepared statement statistics
   */
  getPreparedStatementStats(): Map<string, PreparedStatement> {
    return new Map(this.preparedStatements);
  }

  /**
   * Clear query execution history
   */
  clearHistory(): void {
    this.queryExecutions = [];
    this.preparedStatements.clear();
  }
}

// Singleton instance
export const queryOptimizerService = new QueryOptimizerService();
