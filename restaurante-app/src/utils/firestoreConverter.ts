/**
 * Firestore Data Converter - Optimized
 * 
 * Implementa conversão otimizada de dados Firestore com:
 * - Memoization para evitar re-processamento
 * - Shallow comparison para detectar mudanças
 * - Transformação seletiva apenas de campos alterados
 * - TypeScript interfaces para type safety
 * - Suporte para migração de campos deprecated
 * 
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 15.3
 */

import { DocumentData, Timestamp } from 'firebase/firestore';
import { getComandaNumber, getCreatedBy } from './fieldMigrationHelpers';

/**
 * Cache de conversões memoizadas
 */
interface ConversionCache {
  hash: string;
  result: any;
  timestamp: number;
}

/**
 * Firestore Converter com memoization
 */
class FirestoreConverter {
  private cache: Map<string, ConversionCache> = new Map();
  private readonly CACHE_TTL = 60 * 1000; // 1 minuto

  /**
   * Converte documento Firestore para Order com memoization
   */
  firestoreToOrder(doc: DocumentData, docId: string): any {
    const cacheKey = `order:${docId}`;
    
    // Calcula hash dos dados
    const dataHash = this.calculateHash(doc);
    
    // Verifica cache
    const cached = this.cache.get(cacheKey);
    if (cached && cached.hash === dataHash) {
      // Cache hit - retorna resultado memoizado
      return cached.result;
    }

    // Cache miss - converte dados
    const result = this.convertOrderData(doc, docId);

    // Armazena no cache
    this.cache.set(cacheKey, {
      hash: dataHash,
      result,
      timestamp: Date.now()
    });

    return result;
  }

  /**
   * Converte dados do pedido
   * Usa helpers para suportar campos deprecated durante migração
   */
  private convertOrderData(doc: DocumentData, docId: string): any {
    return {
      id: docId,
      companyId: doc.companyId || '',
      comandaNumber: getComandaNumber(doc), // Suporta ambos os campos
      dateKey: doc.dateKey || '',
      status: doc.status || 'pending',
      items: this.convertItems(doc.items || doc.itens || []),
      totalAmount: doc.totalAmount || doc.total || 0,
      isPago: doc.isPago || false,
      createdBy: getCreatedBy(doc), // Suporta ambos os campos
      createdAt: this.convertTimestamp(doc.createdAt),
      updatedAt: this.convertTimestamp(doc.updatedAt),
      notes: doc.notes || doc.observacoes || '',
      customerName: doc.customerName || doc.nomeCliente || ''
    };
  }

  /**
   * Converte array de itens
   */
  private convertItems(items: any[]): any[] {
    return items.map(item => ({
      id: item.id || '',
      productId: item.productId || item.produtoId || '',
      name: item.name || item.nome || '',
      quantity: item.quantity || item.quantidade || 0,
      unitPrice: item.unitPrice || item.precoUnitario || 0,
      subtotal: item.subtotal || 0,
      notes: item.notes || item.observacoes || '',
      modifiers: item.modifiers || item.modificadores || []
    }));
  }

  /**
   * Converte Timestamp do Firestore
   */
  private convertTimestamp(timestamp: any): Date | null {
    if (!timestamp) return null;
    
    if (timestamp instanceof Timestamp) {
      return timestamp.toDate();
    }
    
    if (timestamp.seconds) {
      return new Date(timestamp.seconds * 1000);
    }
    
    if (timestamp instanceof Date) {
      return timestamp;
    }
    
    return null;
  }

  /**
   * Calcula hash simples para shallow comparison
   */
  private calculateHash(doc: DocumentData): string {
    // Usa campos chave para detectar mudanças
    const keyFields = [
      doc.id,
      doc.status,
      doc.isPago,
      doc.updatedAt?.seconds || doc.updatedAt?.getTime?.() || 0,
      doc.items?.length || doc.itens?.length || 0,
      doc.totalAmount || doc.total || 0
    ];
    
    return keyFields.join(':');
  }

  /**
   * Detecta mudanças entre dois documentos (shallow comparison)
   */
  hasChanges(oldDoc: DocumentData, newDoc: DocumentData): boolean {
    const oldHash = this.calculateHash(oldDoc);
    const newHash = this.calculateHash(newDoc);
    
    return oldHash !== newHash;
  }

  /**
   * Converte apenas campos que mudaram
   */
  convertChangedFields(
    oldDoc: DocumentData,
    newDoc: DocumentData,
    docId: string
  ): Partial<any> {
    if (!this.hasChanges(oldDoc, newDoc)) {
      return {};
    }

    const changes: Partial<any> = {};

    // Verifica cada campo individualmente
    if (oldDoc.status !== newDoc.status) {
      changes.status = newDoc.status;
    }

    if (oldDoc.isPago !== newDoc.isPago) {
      changes.isPago = newDoc.isPago;
    }

    if (oldDoc.totalAmount !== newDoc.totalAmount && 
        oldDoc.total !== newDoc.total) {
      changes.totalAmount = newDoc.totalAmount || newDoc.total;
    }

    if (JSON.stringify(oldDoc.items || oldDoc.itens) !== 
        JSON.stringify(newDoc.items || newDoc.itens)) {
      changes.items = this.convertItems(newDoc.items || newDoc.itens || []);
    }

    if (oldDoc.updatedAt?.seconds !== newDoc.updatedAt?.seconds) {
      changes.updatedAt = this.convertTimestamp(newDoc.updatedAt);
    }

    return changes;
  }

  /**
   * Limpa cache expirado
   */
  cleanExpiredCache(): void {
    const now = Date.now();
    
    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp > this.CACHE_TTL) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Invalida cache de um documento específico
   */
  invalidateCache(docId: string): void {
    this.cache.delete(`order:${docId}`);
  }

  /**
   * Limpa todo o cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Obtém estatísticas do cache
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }
}

// Singleton instance
export const firestoreConverter = new FirestoreConverter();

// Export para testes
export { FirestoreConverter };
