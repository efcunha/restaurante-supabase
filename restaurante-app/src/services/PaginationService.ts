/**
 * Pagination Service - Cursor-Based Pagination
 * 
 * Implementa paginação cursor-based com:
 * - Threshold de 50 itens para ativar paginação
 * - Page size limit de 50 itens por página
 * - Cache de páginas já carregadas
 * - Inserção ordenada de novos itens sem invalidar cache
 * 
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5
 */

import {
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  QueryConstraint,
  DocumentSnapshot,
  QueryDocumentSnapshot
} from 'firebase/firestore';
import { db } from '../config/firebaseConfig';

/**
 * Configuração de paginação
 */
interface PaginationConfig {
  threshold: number;
  pageSize: number;
  enableCache: boolean;
}

/**
 * Resultado de página
 */
interface PageResult<T> {
  items: T[];
  nextCursor?: DocumentSnapshot;
  hasMore: boolean;
  pageNumber: number;
}

/**
 * Cache de página
 */
interface PageCache<T> {
  items: T[];
  cursor?: DocumentSnapshot;
  timestamp: number;
}

/**
 * Pagination Service
 */
class PaginationService {
  private config: PaginationConfig = {
    threshold: 50,
    pageSize: 50,
    enableCache: true
  };

  private pageCache: Map<string, PageCache<any>> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutos

  /**
   * Verifica se deve usar paginação
   */
  shouldPaginate(totalItems: number): boolean {
    return totalItems > this.config.threshold;
  }

  /**
   * Obtém primeira página
   */
  async getFirstPage<T>(
    collectionPath: string,
    orderByField: string = 'createdAt',
    orderDirection: 'asc' | 'desc' = 'desc',
    additionalConstraints: QueryConstraint[] = []
  ): Promise<PageResult<T>> {
    const cacheKey = this.getCacheKey(collectionPath, 0);

    // Verifica cache
    if (this.config.enableCache) {
      const cached = this.pageCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return {
          items: cached.items,
          nextCursor: cached.cursor,
          hasMore: !!cached.cursor,
          pageNumber: 0
        };
      }
    }

    // Query primeira página
    const collectionRef = collection(db, collectionPath);
    const constraints: QueryConstraint[] = [
      ...additionalConstraints,
      orderBy(orderByField, orderDirection),
      limit(this.config.pageSize)
    ];

    const q = query(collectionRef, ...constraints);
    const snapshot = await getDocs(q);

    const items = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as T[];

    const lastDoc = snapshot.docs[snapshot.docs.length - 1];
    const hasMore = snapshot.docs.length === this.config.pageSize;

    // Cacheia resultado
    if (this.config.enableCache) {
      this.pageCache.set(cacheKey, {
        items,
        cursor: lastDoc,
        timestamp: Date.now()
      });
    }

    return {
      items,
      nextCursor: lastDoc,
      hasMore,
      pageNumber: 0
    };
  }

  /**
   * Obtém próxima página
   */
  async getNextPage<T>(
    collectionPath: string,
    cursor: DocumentSnapshot,
    pageNumber: number,
    orderByField: string = 'createdAt',
    orderDirection: 'asc' | 'desc' = 'desc',
    additionalConstraints: QueryConstraint[] = []
  ): Promise<PageResult<T>> {
    const cacheKey = this.getCacheKey(collectionPath, pageNumber);

    // Verifica cache
    if (this.config.enableCache) {
      const cached = this.pageCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return {
          items: cached.items,
          nextCursor: cached.cursor,
          hasMore: !!cached.cursor,
          pageNumber
        };
      }
    }

    // Query próxima página
    const collectionRef = collection(db, collectionPath);
    const constraints: QueryConstraint[] = [
      ...additionalConstraints,
      orderBy(orderByField, orderDirection),
      startAfter(cursor),
      limit(this.config.pageSize)
    ];

    const q = query(collectionRef, ...constraints);
    const snapshot = await getDocs(q);

    const items = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as T[];

    const lastDoc = snapshot.docs[snapshot.docs.length - 1];
    const hasMore = snapshot.docs.length === this.config.pageSize;

    // Cacheia resultado
    if (this.config.enableCache) {
      this.pageCache.set(cacheKey, {
        items,
        cursor: lastDoc,
        timestamp: Date.now()
      });
    }

    return {
      items,
      nextCursor: lastDoc,
      hasMore,
      pageNumber
    };
  }

  /**
   * Insere novo item mantendo ordenação
   */
  insertItemSorted<T extends { id: string; [key: string]: any }>(
    items: T[],
    newItem: T,
    orderByField: string = 'createdAt',
    orderDirection: 'asc' | 'desc' = 'desc'
  ): T[] {
    // Cria cópia do array
    const result = [...items];

    // Encontra posição de inserção
    let insertIndex = 0;
    
    for (let i = 0; i < result.length; i++) {
      const comparison = this.compareItems(
        newItem,
        result[i],
        orderByField,
        orderDirection
      );

      if (comparison <= 0) {
        insertIndex = i;
        break;
      }
      insertIndex = i + 1;
    }

    // Insere na posição correta
    result.splice(insertIndex, 0, newItem);

    return result;
  }

  /**
   * Compara dois itens para ordenação
   */
  private compareItems(
    a: any,
    b: any,
    field: string,
    direction: 'asc' | 'desc'
  ): number {
    const aValue = this.getFieldValue(a, field);
    const bValue = this.getFieldValue(b, field);

    let comparison = 0;

    if (aValue < bValue) {
      comparison = -1;
    } else if (aValue > bValue) {
      comparison = 1;
    }

    return direction === 'desc' ? -comparison : comparison;
  }

  /**
   * Obtém valor do campo (suporta timestamps)
   */
  private getFieldValue(item: any, field: string): any {
    const value = item[field];

    // Converte Timestamp para número
    if (value && typeof value === 'object' && 'seconds' in value) {
      return value.seconds;
    }

    if (value instanceof Date) {
      return value.getTime();
    }

    return value;
  }

  /**
   * Invalida cache de uma collection
   */
  invalidateCache(collectionPath: string): void {
    const keysToDelete: string[] = [];

    for (const key of this.pageCache.keys()) {
      if (key.startsWith(collectionPath)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.pageCache.delete(key));
  }

  /**
   * Limpa cache expirado
   */
  cleanExpiredCache(): void {
    const now = Date.now();

    for (const [key, cached] of this.pageCache.entries()) {
      if (now - cached.timestamp > this.CACHE_TTL) {
        this.pageCache.delete(key);
      }
    }
  }

  /**
   * Gera chave de cache
   */
  private getCacheKey(collectionPath: string, pageNumber: number): string {
    return `${collectionPath}:page:${pageNumber}`;
  }

  /**
   * Obtém estatísticas de cache
   */
  getCacheStats() {
    return {
      size: this.pageCache.size,
      pages: Array.from(this.pageCache.keys())
    };
  }

  /**
   * Configura parâmetros de paginação
   */
  configure(config: Partial<PaginationConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// Singleton instance
export const paginationService = new PaginationService();

// Export para testes
export { PaginationService };
export type { PaginationConfig, PageResult, PageCache };
