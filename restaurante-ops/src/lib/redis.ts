import { createClient, type RedisClientType } from 'redis';
import { logInfo, logWarn } from './logger.js';

let redisInstance: RedisClientType | null = null;
let redisReady = false;
let redisError: Error | null = null;

/**
 * Initialize Redis client from REDIS_URL env var.
 * Compatible with Railway Redis URLs (redis://user:password@host:port).
 */
export async function initRedis(redisUrl?: string): Promise<void> {
  const url = redisUrl || process.env.REDIS_URL;

  if (!url) {
    logWarn('REDIS_URL not configured; rate limiting will use in-memory fallback');
    redisReady = false;
    return;
  }

  try {
    redisInstance = createClient({ url });
    redisInstance.on('error', (err: Error) => {
      redisReady = false;
      redisError = err;
      logWarn('redis.runtime_error', { detail: err.message });
    });

    await redisInstance.connect();

    // Test connection
    await redisInstance.ping();
    redisReady = true;
    redisError = null;
    logInfo('redis.connected');
  } catch (error) {
    redisReady = false;
    redisError = error instanceof Error ? error : new Error(String(error));
    logWarn('redis.connection_failed', { detail: redisError.message });
  }
}

/**
 * Get Redis client instance
 */
export function getRedisClient(): RedisClientType | null {
  return redisInstance;
}

/**
 * Check if Redis is ready and connected
 */
export function isRedisReady(): boolean {
  return redisReady;
}

/**
 * Get last Redis error (if any)
 */
export function getRedisError(): Error | null {
  return redisError;
}

/**
 * Check Redis health
 */
export async function checkRedisHealth(): Promise<{
  status: 'ok' | 'error';
  message: string;
}> {
  if (!redisInstance) {
    return {
      status: 'error',
      message: 'Redis not initialized (using memory fallback)',
    };
  }

  try {
    await redisInstance.ping();
    return {
      status: 'ok',
      message: 'Redis connected',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      status: 'error',
      message: `Redis health check failed: ${message}`,
    };
  }
}
