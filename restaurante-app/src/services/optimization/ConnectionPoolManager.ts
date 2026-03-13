/**
 * Connection Pool Manager
 * 
 * Manages database connections efficiently with pooling, health checks, and retry logic.
 * Provides connection lifecycle management with configurable timeouts and limits.
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.7, 5.6, 11.3
 */

import { supabase } from '../../config/SupabaseConfig';
import type { PoolConfig, PoolStats, Connection } from '../../types/performance';

/**
 * Internal connection wrapper with metadata
 */
interface PooledConnection {
  id: string;
  connection: any;
  inUse: boolean;
  createdAt: Date;
  lastUsedAt: Date;
  healthCheckCount: number;
}

/**
 * Connection request in the waiting queue
 */
interface ConnectionRequest {
  resolve: (connection: Connection) => void;
  reject: (error: Error) => void;
  timestamp: Date;
}

/**
 * Default pool configuration
 * Requirements: 3.1, 3.2, 3.3
 */
const DEFAULT_CONFIG: PoolConfig = {
  minConnections: 5,
  maxConnections: 20,
  idleTimeout: 60000, // 60 seconds
  connectionTimeout: 5000, // 5 seconds
  retryAttempts: 3,
  retryDelay: 1000, // 1 second base delay
};

/**
 * Connection Pool Manager Service
 * 
 * Manages a pool of database connections with:
 * - Min/max connection limits (5-20)
 * - Connection lifecycle management
 * - Health checks and validation
 * - Retry logic with exponential backoff
 * - Metrics tracking
 */
export class ConnectionPoolManager {
  private config: PoolConfig;
  private pool: PooledConnection[] = [];
  private waitingQueue: ConnectionRequest[] = [];
  private stats = {
    active: 0,
    idle: 0,
    waiting: 0,
    total: 0,
    utilization: 0,
  };
  private cleanupInterval?: NodeJS.Timeout;
  private initialized = false;

  constructor(config?: Partial<PoolConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the connection pool
   * Creates minimum number of connections
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Create minimum connections
    const promises: Promise<void>[] = [];
    for (let i = 0; i < this.config.minConnections; i++) {
      promises.push(this.createConnection());
    }

    await Promise.all(promises);

    // Start cleanup interval for idle connections
    this.startCleanupInterval();

    this.initialized = true;
  }

  /**
   * Get a connection from the pool
   * Requirements: 3.2, 3.7
   * 
   * @returns Promise<Connection> - A database connection
   * @throws Error if connection timeout is reached
   */
  async getConnection(): Promise<Connection> {
    // Find an idle connection
    const pooledConn = this.pool.find(c => !c.inUse);

    if (pooledConn) {
      // Mark as in use
      pooledConn.inUse = true;
      pooledConn.lastUsedAt = new Date();
      this.updateStats();

      // Validate connection health
      const isHealthy = await this.validateConnection(pooledConn);
      if (!isHealthy) {
        // Remove unhealthy connection and create a new one
        await this.removeConnection(pooledConn.id);
        return this.getConnection(); // Retry
      }

      return this.wrapConnection(pooledConn);
    }

    // No idle connections available
    if (this.pool.length < this.config.maxConnections) {
      // Create a new connection
      await this.createConnection();
      return this.getConnection(); // Retry with new connection
    }

    // Pool is exhausted, queue the request
    return this.queueConnectionRequest();
  }

  /**
   * Release a connection back to the pool
   * Requirements: 3.2
   * 
   * @param connection - The connection to release
   */
  releaseConnection(connectionId: string): void {
    const pooledConn = this.pool.find(c => c.id === connectionId);
    
    if (pooledConn) {
      pooledConn.inUse = false;
      pooledConn.lastUsedAt = new Date();
      this.updateStats();

      // Process waiting queue
      this.processWaitingQueue();
    }
  }

  /**
   * Execute a query with automatic connection management
   * Requirements: 3.7
   * 
   * @param query - SQL query string
   * @param params - Query parameters
   * @returns Promise<T> - Query result
   */
  async executeQuery<T = any>(query: string, params?: any[]): Promise<T> {
    const connection = await this.getConnection();
    
    try {
      const result = await connection.query<T>(query, params);
      return result;
    } finally {
      connection.release();
    }
  }

  /**
   * Get pool statistics
   * Requirements: 3.5, 11.3
   * 
   * @returns PoolStats - Current pool statistics
   */
  getPoolStats(): PoolStats {
    return { ...this.stats };
  }

  /**
   * Configure pool settings
   * 
   * @param config - Partial pool configuration
   */
  configure(config: Partial<PoolConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Shutdown the pool and close all connections
   */
  async shutdown(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Close all connections
    const promises = this.pool.map(c => this.removeConnection(c.id));
    await Promise.all(promises);

    // Reject all waiting requests
    this.waitingQueue.forEach(req => {
      req.reject(new Error('Connection pool is shutting down'));
    });
    this.waitingQueue = [];

    this.initialized = false;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Create a new connection with retry logic
   * Requirements: 3.4, 5.6
   */
  private async createConnection(attempt = 0): Promise<void> {
    try {
      // For Supabase, we use the client directly
      // In a real implementation with direct PostgreSQL, you would create a pg.Client here
      const connection = supabase;

      const pooledConn: PooledConnection = {
        id: this.generateConnectionId(),
        connection,
        inUse: false,
        createdAt: new Date(),
        lastUsedAt: new Date(),
        healthCheckCount: 0,
      };

      this.pool.push(pooledConn);
      this.updateStats();
    } catch (error) {
      // Retry with exponential backoff
      if (attempt < this.config.retryAttempts) {
        const delay = this.calculateBackoffDelay(attempt);
        await this.sleep(delay);
        return this.createConnection(attempt + 1);
      }

      throw new Error(`Failed to create connection after ${this.config.retryAttempts} attempts: ${error}`);
    }
  }

  /**
   * Remove a connection from the pool
   */
  private async removeConnection(connectionId: string): Promise<void> {
    const index = this.pool.findIndex(c => c.id === connectionId);
    
    if (index !== -1) {
      const pooledConn = this.pool[index];
      
      // For Supabase client, we don't need to explicitly close
      // In a real pg.Client implementation, you would call client.end() here
      
      this.pool.splice(index, 1);
      this.updateStats();
    }
  }

  /**
   * Validate connection health
   * Requirements: 3.2
   */
  private async validateConnection(pooledConn: PooledConnection): Promise<boolean> {
    try {
      // Simple health check query
      const { error } = await pooledConn.connection
        .from('companies')
        .select('id')
        .limit(1)
        .single();

      pooledConn.healthCheckCount++;
      
      // Consider connection healthy if no error or if it's just "no rows" error
      return !error || error.code === 'PGRST116';
    } catch (error) {
      return false;
    }
  }

  /**
   * Wrap a pooled connection for external use
   */
  private wrapConnection(pooledConn: PooledConnection): Connection {
    return {
      query: async <T = any>(sql: string, params?: any[]): Promise<T> => {
        // For Supabase, we execute raw SQL using rpc or direct queries
        // This is a simplified implementation
        const { data, error } = await pooledConn.connection.rpc('execute_sql', {
          query: sql,
          params: params || [],
        });

        if (error) {
          throw error;
        }

        return data as T;
      },
      release: () => {
        this.releaseConnection(pooledConn.id);
      },
    };
  }

  /**
   * Queue a connection request when pool is exhausted
   * Requirements: 3.2, 3.3
   */
  private queueConnectionRequest(): Promise<Connection> {
    return new Promise((resolve, reject) => {
      const request: ConnectionRequest = {
        resolve,
        reject,
        timestamp: new Date(),
      };

      this.waitingQueue.push(request);
      this.updateStats();

      // Set timeout for the request
      setTimeout(() => {
        const index = this.waitingQueue.indexOf(request);
        if (index !== -1) {
          this.waitingQueue.splice(index, 1);
          this.updateStats();
          reject(new Error('Connection request timeout'));
        }
      }, this.config.connectionTimeout);
    });
  }

  /**
   * Process waiting queue when connections become available
   */
  private async processWaitingQueue(): Promise<void> {
    if (this.waitingQueue.length === 0) {
      return;
    }

    const request = this.waitingQueue.shift();
    if (request) {
      this.updateStats();
      
      try {
        const connection = await this.getConnection();
        request.resolve(connection);
      } catch (error) {
        request.reject(error as Error);
      }
    }
  }

  /**
   * Start cleanup interval for idle connections
   * Requirements: 3.3
   */
  private startCleanupInterval(): void {
    // Only start if not already running
    if (this.cleanupInterval) {
      return;
    }
    
    this.cleanupInterval = setInterval(() => {
      this.cleanupIdleConnections();
    }, 30000); // Check every 30 seconds
    
    // Unref the interval so it doesn't keep the process alive
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Clean up idle connections that exceed idle timeout
   * Requirements: 3.3
   */
  private async cleanupIdleConnections(): Promise<void> {
    const now = Date.now();
    const idleConnections = this.pool.filter(c => {
      if (c.inUse) return false;
      
      const idleTime = now - c.lastUsedAt.getTime();
      return idleTime > this.config.idleTimeout;
    });

    // Keep minimum connections
    const connectionsToRemove = Math.max(
      0,
      this.pool.length - idleConnections.length - this.config.minConnections
    );

    for (let i = 0; i < Math.min(connectionsToRemove, idleConnections.length); i++) {
      await this.removeConnection(idleConnections[i].id);
    }
  }

  /**
   * Update pool statistics
   * Requirements: 3.5, 11.3
   */
  private updateStats(): void {
    this.stats.active = this.pool.filter(c => c.inUse).length;
    this.stats.idle = this.pool.filter(c => !c.inUse).length;
    this.stats.waiting = this.waitingQueue.length;
    this.stats.total = this.pool.length;
    this.stats.utilization = this.stats.total > 0 
      ? (this.stats.active / this.stats.total) * 100 
      : 0;
  }

  /**
   * Calculate exponential backoff delay
   * Requirements: 3.4, 5.6
   * 
   * @param attempt - Current retry attempt number
   * @returns Delay in milliseconds
   */
  private calculateBackoffDelay(attempt: number): number {
    const baseDelay = this.config.retryDelay;
    const maxDelay = 30000; // 30 seconds max
    const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
    return delay;
  }

  /**
   * Generate unique connection ID
   */
  private generateConnectionId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Sleep utility for delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
export const connectionPoolManager = new ConnectionPoolManager();
