import { Redis } from '@upstash/redis';
import { logInfo, logWarn, logError } from './logger.js';

let redisInstance: Redis | null = null;
let redisReady = false;
let redisError: Error | null = null;

/**
 * Initialize Redis client from REDIS_URL env var
 * Uses Upstash Redis client for distributed rate limiting
 */
export async function initRedis(redisUrl?: string): Promise<void> {
  const url = redisUrl || process.env.REDIS_URL;

  if (!url) {
    logWarn('REDIS_URL not configured; rate limiting will use in-memory fallback');
    redisReady = false;
    return;
  }

  try {
    // Upstash Redis client initialization
    // REDIS_URL format: redis://:token@host:port
    // Extract token from URL for Upstash
    const urlObj = new URL(url);
    const token = urlObj.password || '';

    redisInstance = new Redis({
      url,
      token: token || undefined,
    });

    // Test connection
    await redisInstance.ping();
    redisReady = true;
    logInfo('Redis connected successfully');
  } catch (error) {
    redisReady = false;
    redisError = error instanceof Error ? error : new Error(String(error));
    logWarn(`Redis connection failed: ${redisError.message}`);
  }
}

/**
 * Get Redis client instance
 */
export function getRedisClient(): Redis | null {
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
