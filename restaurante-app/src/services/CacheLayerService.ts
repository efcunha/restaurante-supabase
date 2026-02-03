/**
 * Cache Layer Service - Intelligent Caching
 * 
 * Implementa cache local inteligente com:
 * - TTL configurável (5min para stats, 30s para orders)
 * - Cache invalidation quando dados mudam
 * - Background refresh para dados stale
 * - Compressão com LZ-string para dados grandes
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { compress, decompress } from 'lz-string';

/**
 * Configuração de cache
 */
interface CacheConfig {
  defaultTTL: number;
  compressionThreshold: number; // bytes
  enableCompression: boolean;
  enableBackgroundRefresh: boolean;
}

/**
 * Entrada de cache
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  compressed: boolean;
}

/**
 * Estatísticas de cache
 */
interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  entries: number;
}

/**
 * Cache Layer Service
 */
class CacheLayerService {
  private config: CacheConfig = {
    defaultTTL: 5 * 60 * 1000, // 5 minutos
    compressionThreshold: 1024, // 1KB
    enableCompression: true,
    enableBackgroundRefresh: false
  };

  private stats = {
    hits: 0,
    misses: 0
  };

  private refreshCallbacks: Map<string, () => Promise<any>> = new Map();
  private readonly CACHE_PREFIX = '@cache:';

  /**
   * Obtém valor do cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const cacheKey = this.getCacheKey(key);
      const cached = await AsyncStorage.getItem(cacheKey);

      if (!cached) {
        this.stats.misses++;
        return null;
      }

      const entry: CacheEntry<T> = JSON.parse(cached);

      // Verifica se expirou
      const now = Date.now();
      const age = now - entry.timestamp;

      if (age > entry.ttl) {
        // Cache expirado
        this.stats.misses++;
        
        // Remove entrada expirada
        await this.invalidate(key);

        // Tenta background refresh se configurado
        if (this.config.enableBackgroundRefresh) {
          this.triggerBackgroundRefresh(key);
        }

        return null;
      }

      // Cache hit
      this.stats.hits++;

      // Descomprime se necessário
      let data = entry.data;
      if (entry.compressed && typeof data === 'string') {
        const decompressed = decompress(data);
        data = JSON.parse(decompressed) as T;
      }

      return data;
    } catch (error) {
      console.error('[CacheLayer] Error getting cache:', error);
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Armazena valor no cache
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const cacheKey = this.getCacheKey(key);
      const effectiveTTL = ttl || this.config.defaultTTL;

      // Serializa dados
      let data: any = value;
      let compressed = false;

      // Verifica se deve comprimir
      const serialized = JSON.stringify(value);
      const sizeBytes = new Blob([serialized]).size;

      if (
        this.config.enableCompression &&
        sizeBytes > this.config.compressionThreshold
      ) {
        data = compress(serialized);
        compressed = true;
      }

      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl: effectiveTTL,
        compressed
      };

      await AsyncStorage.setItem(cacheKey, JSON.stringify(entry));
    } catch (error) {
      console.error('[CacheLayer] Error setting cache:', error);
    }
  }

  /**
   * Invalida entrada de cache
   */
  async invalidate(key: string): Promise<void> {
    try {
      const cacheKey = this.getCacheKey(key);
      await AsyncStorage.removeItem(cacheKey);
    } catch (error) {
      console.error('[CacheLayer] Error invalidating cache:', error);
    }
  }

  /**
   * Invalida múltiplas entradas por padrão
   */
  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(key => 
        key.startsWith(this.CACHE_PREFIX) &&
        key.includes(pattern)
      );

      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
      }
    } catch (error) {
      console.error('[CacheLayer] Error invalidating pattern:', error);
    }
  }

  /**
   * Registra callback para background refresh
   */
  registerRefreshCallback(key: string, callback: () => Promise<any>): void {
    this.refreshCallbacks.set(key, callback);
  }

  /**
   * Dispara background refresh
   */
  private async triggerBackgroundRefresh(key: string): Promise<void> {
    const callback = this.refreshCallbacks.get(key);
    if (!callback) {
      return;
    }

    try {
      const freshData = await callback();
      await this.set(key, freshData);
    } catch (error) {
      console.error('[CacheLayer] Background refresh failed:', error);
    }
  }

  /**
   * Obtém estatísticas de cache
   */
  getHitRate(): number {
    const total = this.stats.hits + this.stats.misses;
    if (total === 0) {
      return 0;
    }
    return this.stats.hits / total;
  }

  /**
   * Obtém tamanho total do cache
   */
  async getCacheSize(): Promise<number> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(key => key.startsWith(this.CACHE_PREFIX));

      let totalSize = 0;

      for (const key of cacheKeys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          totalSize += new Blob([value]).size;
        }
      }

      return totalSize;
    } catch (error) {
      console.error('[CacheLayer] Error getting cache size:', error);
      return 0;
    }
  }

  /**
   * Obtém estatísticas completas
   */
  async getStats(): Promise<CacheStats> {
    const allKeys = await AsyncStorage.getAllKeys();
    const cacheKeys = allKeys.filter(key => key.startsWith(this.CACHE_PREFIX));

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: this.getHitRate(),
      size: await this.getCacheSize(),
      entries: cacheKeys.length
    };
  }

  /**
   * Limpa todo o cache
   */
  async clear(): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(key => key.startsWith(this.CACHE_PREFIX));

      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
      }

      // Reset stats
      this.stats.hits = 0;
      this.stats.misses = 0;
    } catch (error) {
      console.error('[CacheLayer] Error clearing cache:', error);
    }
  }

  /**
   * Configura parâmetros do cache
   */
  configure(config: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Gera chave de cache com prefixo
   */
  private getCacheKey(key: string): string {
    return `${this.CACHE_PREFIX}${key}`;
  }

  /**
   * Wrapper para operações com cache automático
   */
  async withCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: { ttl?: number; forceRefresh?: boolean }
  ): Promise<T> {
    // Verifica cache primeiro (se não for force refresh)
    if (!options?.forceRefresh) {
      const cached = await this.get<T>(key);
      if (cached !== null) {
        return cached;
      }
    }

    // Busca dados frescos
    const data = await fetcher();

    // Armazena no cache
    await this.set(key, data, options?.ttl);

    return data;
  }
}

// Singleton instance
export const cacheLayerService = new CacheLayerService();

// Export para testes
export { CacheLayerService };
export type { CacheConfig, CacheEntry, CacheStats };
