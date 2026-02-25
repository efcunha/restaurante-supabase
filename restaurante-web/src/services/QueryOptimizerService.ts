/**
 * Query Optimizer Service
 * 
 * Otimiza queries ao Firestore com:
 * - Filtros por status para active orders
 * - Limit de 100 resultados
 * - Uso de índices compostos
 * - Handling para lista vazia sem query
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  QueryConstraint,
  CollectionReference
} from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { cacheLayerService } from './CacheLayerService';

/**
 * Configuração do optimizer
 */
interface OptimizerConfig {
  maxResults: number;
  cacheActiveOrdersTTL: number;
  cacheStatsTTL: number;
  enableCache: boolean;
}

/**
 * Resultado de query paginada
 */
interface PageResult<T> {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
}

/**
 * Query Optimizer Service
 */
class QueryOptimizerService {
  private config: OptimizerConfig = {
    maxResults: 100,
    cacheActiveOrdersTTL: 30 * 1000, // 30 segundos
    cacheStatsTTL: 5 * 60 * 1000, // 5 minutos
    enableCache: true
  };

  /**
   * Obtém pedidos ativos otimizado
   */
  async getActiveOrders(
    companyId: string,
    options?: { limit?: number; useCache?: boolean }
  ): Promise<any[]> {
    const cacheKey = `active-orders:${companyId}`;
    const useCache = options?.useCache !== false && this.config.enableCache;

    // Tenta cache primeiro
    if (useCache) {
      const cached = await cacheLayerService.get<any[]>(cacheKey);
      if (cached !== null) {
        return cached;
      }
    }

    // Query otimizada com índice composto
    const ordersRef = collection(db, `companies/${companyId}/orders`);
    
    // Filtro por status: apenas pending e preparing
    const constraints: QueryConstraint[] = [
      where('status', 'in', ['pending', 'preparing']),
      orderBy('createdAt', 'desc'),
      limit(options?.limit || this.config.maxResults)
    ];

    const q = query(ordersRef, ...constraints);
    const snapshot = await getDocs(q);

    // Converte para array
    const orders = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Cacheia resultado
    if (useCache) {
      await cacheLayerService.set(
        cacheKey,
        orders,
        this.config.cacheActiveOrdersTTL
      );
    }

    return orders;
  }

  /**
   * Obtém pedidos por comanda (query única otimizada)
   */
  async getOrdersByComanda(
    companyId: string,
    comandaNumber: string
  ): Promise<any[]> {
    // Normaliza comandaNumber
    const normalizedComanda = this.normalizeComandaNumber(comandaNumber);

    const cacheKey = `orders-comanda:${companyId}:${normalizedComanda}`;

    // Tenta cache
    if (this.config.enableCache) {
      const cached = await cacheLayerService.get<any[]>(cacheKey);
      if (cached !== null) {
        return cached;
      }
    }

    // Query única usando índice em comandaNumber
    const ordersRef = collection(db, `companies/${companyId}/orders`);
    const q = query(
      ordersRef,
      where('comandaNumber', '==', normalizedComanda),
      orderBy('createdAt', 'desc')
    );

    try {
      const snapshot = await getDocs(q);
      const orders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Cacheia resultado
      if (this.config.enableCache) {
        await cacheLayerService.set(cacheKey, orders, this.config.cacheActiveOrdersTTL);
      }

      return orders;
    } catch (error) {
      console.error('[QueryOptimizer] Error querying by comanda:', error);
      // Retorna lista vazia em caso de erro
      return [];
    }
  }

  /**
   * Obtém pedidos por range de datas
   */
  async getOrdersByDateRange(
    companyId: string,
    startDate: string,
    endDate: string
  ): Promise<any[]> {
    const cacheKey = `orders-range:${companyId}:${startDate}:${endDate}`;

    // Tenta cache
    if (this.config.enableCache) {
      const cached = await cacheLayerService.get<any[]>(cacheKey);
      if (cached !== null) {
        return cached;
      }
    }

    const ordersRef = collection(db, `companies/${companyId}/orders`);
    const q = query(
      ordersRef,
      where('dateKey', '>=', startDate),
      where('dateKey', '<=', endDate),
      orderBy('dateKey', 'desc'),
      orderBy('createdAt', 'desc'),
      limit(this.config.maxResults)
    );

    const snapshot = await getDocs(q);
    const orders = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Cacheia resultado
    if (this.config.enableCache) {
      await cacheLayerService.set(cacheKey, orders, this.config.cacheStatsTTL);
    }

    return orders;
  }

  /**
   * Obtém pedidos pagos por data
   */
  async getPaidOrdersByDate(
    companyId: string,
    dateKey: string
  ): Promise<any[]> {
    const cacheKey = `paid-orders:${companyId}:${dateKey}`;

    // Tenta cache
    if (this.config.enableCache) {
      const cached = await cacheLayerService.get<any[]>(cacheKey);
      if (cached !== null) {
        return cached;
      }
    }

    const ordersRef = collection(db, `companies/${companyId}/orders`);
    const q = query(
      ordersRef,
      where('isPago', '==', true),
      where('dateKey', '==', dateKey),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    const orders = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Cacheia resultado
    if (this.config.enableCache) {
      await cacheLayerService.set(cacheKey, orders, this.config.cacheStatsTTL);
    }

    return orders;
  }

  /**
   * Normaliza número de comanda para formato consistente
   */
  normalizeComandaNumber(comandaNumber: string | number): string {
    // Remove espaços e converte para string
    const str = String(comandaNumber).trim();
    
    // Remove zeros à esquerda mas mantém pelo menos 1 dígito
    const normalized = str.replace(/^0+/, '') || '0';
    
    return normalized;
  }

  /**
   * Invalida cache relacionado a pedidos
   */
  async invalidateOrdersCache(companyId: string): Promise<void> {
    await cacheLayerService.invalidatePattern(`orders:${companyId}`);
    await cacheLayerService.invalidatePattern(`active-orders:${companyId}`);
    await cacheLayerService.invalidatePattern(`paid-orders:${companyId}`);
  }

  /**
   * Invalida cache de uma comanda específica
   */
  async invalidateComandaCache(companyId: string, comandaNumber: string): Promise<void> {
    const normalized = this.normalizeComandaNumber(comandaNumber);
    await cacheLayerService.invalidate(`orders-comanda:${companyId}:${normalized}`);
  }

  /**
   * Obtém estatísticas de cache
   */
  async getCacheStats() {
    return await cacheLayerService.getStats();
  }

  /**
   * Configura parâmetros do optimizer
   */
  configure(config: Partial<OptimizerConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// Singleton instance
export const queryOptimizerService = new QueryOptimizerService();

// Export para testes
export { QueryOptimizerService };
export type { OptimizerConfig, PageResult };
