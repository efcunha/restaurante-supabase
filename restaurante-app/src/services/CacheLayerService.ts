/**
 * Cache Layer Service - Intelligent Caching with LRU Eviction
 * 
 * Implements intelligent in-memory caching with:
 * - Configurable TTL (products: 5min, settings: 10min, profiles: 3min)
 * - Cache invalidation when data changes
 * - LRU (Least Recently Used) eviction policy
 * - Memory management (50MB limit)
 * - Tag-based invalidation
 * - Performance metrics tracking
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 11.2
 */

/**
 * Cache entry with LRU tracking
 */
interface CacheEntry<T> {
  key: string;
  data: T;
  timestamp: number;
  ttl: number;
  tags: string[];
  hits: number;
  lastAccessed: number;
  size: number; // Estimated size in bytes
}

/**
 * Cache options for set/withCache operations
 */
interface CacheOptions {
  ttl?: number;
  forceRefresh?: boolean;
  tags?: string[];
}

/**
 * Cache statistics
 */
interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  entries: number;
}

/**
 * TTL defaults for different data types (in milliseconds)
 */
const TTL_DEFAULTS = {
  products: 5 * 60 * 1000,    // 5 minutes
  settings: 10 * 60 * 1000,   // 10 minutes
  profiles: 3 * 60 * 1000,    // 3 minutes
  orders: 30 * 1000,          // 30 seconds
  statistics: 5 * 60 * 1000,  // 5 minutes
  default: 5 * 60 * 1000      // 5 minutes
};

/**
 * Cache Layer Service with LRU Eviction
 */
class CacheLayerService {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private tagIndex: Map<string, Set<string>> = new Map(); // tag -> Set of keys
  
  private stats = {
    hits: 0,
    misses: 0
  };

  private readonly MAX_MEMORY_BYTES = 50 * 1024 * 1024; // 50MB
  private currentMemoryUsage = 0;
  private compressionThreshold = 10 * 1024; // 10KB default

  /**
   * Configure cache settings
   */
  configure(options: { compressionThreshold?: number }): void {
    if (options.compressionThreshold !== undefined) {
      this.compressionThreshold = options.compressionThreshold;
    }
  }

  /**
   * Get value from cache with expiration checking
   */
  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    const now = Date.now();
    const age = now - entry.timestamp;

    if (age > entry.ttl) {
      // Cache expired
      this.stats.misses++;
      await this.invalidate(key);
      return null;
    }

    // Cache hit - update LRU tracking
    this.stats.hits++;
    entry.hits++;
    entry.lastAccessed = now;

    return entry.data as T;
  }

  /**
   * Set value in cache with TTL
   */
  async set<T>(key: string, value: T, ttl?: number, tags?: string[]): Promise<void> {
    const now = Date.now();
    const effectiveTTL = ttl || TTL_DEFAULTS.default;
    
    // Estimate size of the data
    const estimatedSize = this.estimateSize(value);

    // Check if we need to evict entries to make room
    await this.ensureMemoryAvailable(estimatedSize);

    // Remove old entry if exists
    if (this.cache.has(key)) {
      await this.invalidate(key);
    }

    // Create new entry
    const entry: CacheEntry<T> = {
      key,
      data: value,
      timestamp: now,
      ttl: effectiveTTL,
      tags: tags || [],
      hits: 0,
      lastAccessed: now,
      size: estimatedSize
    };

    this.cache.set(key, entry);
    this.currentMemoryUsage += estimatedSize;

    // Update tag index
    if (tags && tags.length > 0) {
      for (const tag of tags) {
        if (!this.tagIndex.has(tag)) {
          this.tagIndex.set(tag, new Set());
        }
        this.tagIndex.get(tag)!.add(key);
      }
    }
  }

  /**
   * Invalidate single cache entry
   */
  async invalidate(key: string): Promise<void> {
    const entry = this.cache.get(key);
    if (!entry) {
      return;
    }

    // Remove from tag index
    for (const tag of entry.tags) {
      const tagSet = this.tagIndex.get(tag);
      if (tagSet) {
        tagSet.delete(key);
        if (tagSet.size === 0) {
          this.tagIndex.delete(tag);
        }
      }
    }

    // Update memory usage
    this.currentMemoryUsage -= entry.size;

    // Remove from cache
    this.cache.delete(key);
  }

  /**
   * Invalidate entries by pattern matching
   */
  async invalidatePattern(pattern: string): Promise<void> {
    const keysToInvalidate: string[] = [];

    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        keysToInvalidate.push(key);
      }
    }

    for (const key of keysToInvalidate) {
      await this.invalidate(key);
    }
  }

  /**
   * Invalidate entries by tag
   */
  async invalidateByTag(tag: string): Promise<void> {
    const tagSet = this.tagIndex.get(tag);
    if (!tagSet) {
      return;
    }

    const keysToInvalidate = Array.from(tagSet);
    for (const key of keysToInvalidate) {
      await this.invalidate(key);
    }
  }

  /**
   * Invalidate multiple tags at once
   */
  async invalidateByTags(tags: string[]): Promise<void> {
    for (const tag of tags) {
      await this.invalidateByTag(tag);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: this.getHitRate(),
      size: this.currentMemoryUsage,
      entries: this.cache.size
    };
  }

  /**
   * Calculate hit rate
   */
  getHitRate(): number {
    const total = this.stats.hits + this.stats.misses;
    if (total === 0) {
      return 0;
    }
    return this.stats.hits / total;
  }

  /**
   * Wrapper for operations with automatic caching
   */
  async withCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    // Check cache first (unless force refresh)
    if (!options?.forceRefresh) {
      const cached = await this.get<T>(key);
      if (cached !== null) {
        return cached;
      }
    }

    // Fetch fresh data
    const data = await fetcher();

    // Store in cache
    await this.set(key, data, options?.ttl, options?.tags);

    return data;
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    this.cache.clear();
    this.tagIndex.clear();
    this.currentMemoryUsage = 0;
    // Reset stats to ensure clean state
    this.stats = {
      hits: 0,
      misses: 0
    };
  }

  /**
   * Ensure memory is available by evicting LRU entries
   */
  private async ensureMemoryAvailable(requiredBytes: number): Promise<void> {
    // If adding this entry would exceed limit, evict LRU entries
    while (this.currentMemoryUsage + requiredBytes > this.MAX_MEMORY_BYTES && this.cache.size > 0) {
      await this.evictLRU();
    }
  }

  /**
   * Evict least recently used entry
   */
  private async evictLRU(): Promise<void> {
    let lruKey: string | null = null;
    let lruTime = Infinity;

    // Find entry with oldest lastAccessed time
    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < lruTime) {
        lruTime = entry.lastAccessed;
        lruKey = key;
      }
    }

    if (lruKey) {
      await this.invalidate(lruKey);
    }
  }

  /**
   * Estimate size of data in bytes
   */
  private estimateSize(data: any): number {
    try {
      const serialized = JSON.stringify(data);
      // Rough estimate: 2 bytes per character in UTF-16
      return serialized.length * 2;
    } catch {
      // If can't serialize, use a default estimate
      return 1024; // 1KB default
    }
  }

  /**
   * Get TTL for a specific data type
   */
  getTTLForType(type: keyof typeof TTL_DEFAULTS): number {
    return TTL_DEFAULTS[type] || TTL_DEFAULTS.default;
  }
}

// Singleton instance
export const cacheLayerService = new CacheLayerService();

// Export for tests
export { CacheLayerService, TTL_DEFAULTS };
export type { CacheEntry, CacheOptions, CacheStats };

