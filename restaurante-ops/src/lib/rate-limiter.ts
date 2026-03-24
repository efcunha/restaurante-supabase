import { getRedisClient, isRedisReady } from './redis.js';
import { logWarn } from './logger.js';

/**
 * Rate limiting result
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfterSeconds?: number;
}

/**
 * In-memory fallback for rate limiting when Redis is unavailable
 */
const memoryFallback = new Map<string, { count: number; windowStart: number }>();

/**
 * Check if request is allowed under rate limit
 * Uses Redis if available, falls back to in-memory storage
 *
 * @param key Rate limit key (e.g., "login:{ip}:{email}" or "billing:{userId}")
 * @param maxAttempts Maximum attempts allowed in the window
 * @param windowMs Time window in milliseconds
 * @returns Rate limit result with allowed status and remaining attempts
 */
export async function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const now = Date.now();

  // Try Redis first if available
  if (isRedisReady()) {
    try {
      const redis = getRedisClient();
      if (redis) {
        const current = await redis.incr(key);

        // Set TTL on first increment
        if (current === 1) {
          await redis.expire(key, Math.ceil(windowMs / 1000));
        }

        const remaining = Math.max(0, maxAttempts - current);
        const allowed = current <= maxAttempts;
        const resetAt = new Date(now + windowMs);

        return {
          allowed,
          remaining,
          resetAt,
          retryAfterSeconds: allowed ? undefined : Math.ceil(windowMs / 1000),
        };
      }
    } catch (error) {
      // Fall through to memory fallback
      logWarn(`Redis rate limit check failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Fallback to in-memory storage
  return checkRateLimitMemory(key, maxAttempts, windowMs, now);
}

/**
 * In-memory rate limit check (fallback when Redis unavailable)
 */
function checkRateLimitMemory(
  key: string,
  maxAttempts: number,
  windowMs: number,
  now: number,
): RateLimitResult {
  const state = memoryFallback.get(key);

  // Initialize or check if window has expired
  if (!state || now - state.windowStart >= windowMs) {
    memoryFallback.set(key, { count: 1, windowStart: now });
    return {
      allowed: true,
      remaining: maxAttempts - 1,
      resetAt: new Date(now + windowMs),
    };
  }

  // Increment count
  const newCount = state.count + 1;
  state.count = newCount;
  memoryFallback.set(key, state);

  const remaining = Math.max(0, maxAttempts - newCount);
  const allowed = newCount <= maxAttempts;
  const elapsed = now - state.windowStart;
  const resetAt = new Date(state.windowStart + windowMs);
  const retryAfterSeconds = allowed ? undefined : Math.ceil((windowMs - elapsed) / 1000);

  return {
    allowed,
    remaining,
    resetAt,
    retryAfterSeconds,
  };
}

/**
 * Reset rate limit counter for a key
 */
export async function resetRateLimit(key: string): Promise<void> {
  const redis = getRedisClient();
  if (redis && isRedisReady()) {
    try {
      await redis.del(key);
    } catch (error) {
      logWarn(`Failed to reset Redis rate limit: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Also reset in memory
  memoryFallback.delete(key);
}

/**
 * Cleanup old in-memory entries (call periodically)
 */
export function cleanupMemoryFallback(windowMs: number): void {
  const now = Date.now();
  let cleaned = 0;

  for (const [key, state] of memoryFallback.entries()) {
    if (now - state.windowStart >= windowMs) {
      memoryFallback.delete(key);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    logWarn(`Cleaned up ${cleaned} expired rate limit entries from memory`);
  }
}
