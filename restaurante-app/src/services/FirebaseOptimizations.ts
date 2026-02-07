/**
 * FirebaseOptimizations.ts
 * Utilitários para otimização de performance do Firebase
 * 
 * Requirements: 22.1, 22.2
 * 
 * MELHORIAS IMPLEMENTADAS:
 * 1. Cache de queries com TTL
 * 2. Batched writes para múltiplas operações
 * 3. Debounce de listeners para evitar re-renders excessivos
 * 4. Persistência offline otimizada
 * 5. Índices compostos sugeridos
 */

import { 
  writeBatch, 
  DocumentReference,
  WriteBatch
} from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================================
// TYPES
// ============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface BatchOperation {
  type: 'set' | 'update' | 'delete';
  ref: DocumentReference;
  data?: any;
}

interface OfflineCacheEntry {
  data: any;
  timestamp: number;
}

interface OfflineCache {
  [key: string]: OfflineCacheEntry;
}

interface DateKeyRange {
  startKey: string;
  endKey: string;
}

interface RecommendedIndex {
  collection: string;
  fields: string[];
  description: string;
}

type Period = 'hoje' | 'semana' | 'mes' | 'mesVigente';

// ============================================================================
// 1. CACHE DE QUERIES COM TTL
// ============================================================================

const queryCache = new Map<string, CacheEntry<any>>();
const CACHE_TTL = 30000; // 30 segundos

/**
 * Executa query com cache
 */
export async function cachedQuery<T>(
  cacheKey: string, 
  queryFn: () => Promise<T>, 
  ttl: number = CACHE_TTL
): Promise<T> {
  const cached = queryCache.get(cacheKey);
  const now = Date.now();
  
  if (cached && (now - cached.timestamp) < ttl) {
    console.log(`[Cache HIT] ${cacheKey}`);
    return cached.data as T;
  }
  
  console.log(`[Cache MISS] ${cacheKey}`);
  const data = await queryFn();
  queryCache.set(cacheKey, { data, timestamp: now });
  
  return data;
}

/**
 * Invalida cache por prefixo
 */
export function invalidateCache(prefix: string = ''): void {
  if (!prefix) {
    queryCache.clear();
    return;
  }
  
  for (const key of queryCache.keys()) {
    if (key.startsWith(prefix)) {
      queryCache.delete(key);
    }
  }
}

// ============================================================================
// 2. BATCHED WRITES
// ============================================================================

/**
 * Executa múltiplas operações de escrita em batch
 * Muito mais eficiente que operações individuais
 */
export async function batchedWrite(operations: BatchOperation[]): Promise<void> {
  if (!operations || operations.length === 0) return;
  
  // Firestore permite máximo 500 operações por batch
  const BATCH_SIZE = 500;
  const batches: WriteBatch[] = [];
  
  for (let i = 0; i < operations.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const chunk = operations.slice(i, i + BATCH_SIZE);
    
    chunk.forEach(({ type, ref, data }) => {
      switch (type) {
        case 'set':
          if (data) batch.set(ref, data);
          break;
        case 'update':
          if (data) batch.update(ref, data);
          break;
        case 'delete':
          batch.delete(ref);
          break;
      }
    });
    
    batches.push(batch);
  }
  
  // Executar todos os batches em paralelo
  await Promise.all(batches.map(b => b.commit()));
  console.log(`[Batch] ${operations.length} operações em ${batches.length} batch(es)`);
}

// ============================================================================
// 3. DEBOUNCE DE LISTENERS
// ============================================================================

const listenerDebounceMap = new Map<string, NodeJS.Timeout>();

/**
 * Cria um listener com debounce para evitar re-renders excessivos
 */
export function debouncedCallback<T>(
  key: string, 
  callback: (data: T) => void, 
  delay: number = 100
): (data: T) => void {
  return (data: T) => {
    const existing = listenerDebounceMap.get(key);
    if (existing) {
      clearTimeout(existing);
    }
    
    const timeout = setTimeout(() => {
      callback(data);
      listenerDebounceMap.delete(key);
    }, delay);
    
    listenerDebounceMap.set(key, timeout);
  };
}

// ============================================================================
// 4. CACHE OFFLINE COM ASYNCSTORAGE
// ============================================================================

const OFFLINE_CACHE_KEY = '@firebase_offline_cache';

/**
 * Salva dados no cache offline
 */
export async function saveToOfflineCache(key: string, data: any): Promise<void> {
  try {
    const cache = await getOfflineCache();
    cache[key] = {
      data,
      timestamp: Date.now()
    };
    await AsyncStorage.setItem(OFFLINE_CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    const err = error as Error;
    console.warn('[OfflineCache] Erro ao salvar:', err.message);
  }
}

/**
 * Recupera dados do cache offline
 */
export async function getFromOfflineCache<T>(
  key: string, 
  maxAge: number = 3600000 // 1 hora padrão
): Promise<T | null> {
  try {
    const cache = await getOfflineCache();
    const entry = cache[key];
    
    if (entry && (Date.now() - entry.timestamp) < maxAge) {
      return entry.data as T;
    }
    return null;
  } catch (error) {
    const err = error as Error;
    console.warn('[OfflineCache] Erro ao recuperar:', err.message);
    return null;
  }
}

async function getOfflineCache(): Promise<OfflineCache> {
  try {
    const cached = await AsyncStorage.getItem(OFFLINE_CACHE_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch {
    return {};
  }
}

/**
 * Limpa cache offline expirado
 */
export async function cleanExpiredOfflineCache(maxAge: number = 86400000): Promise<void> { // 24 horas
  try {
    const cache = await getOfflineCache();
    const now = Date.now();
    const cleaned: OfflineCache = {};
    
    for (const [key, entry] of Object.entries(cache)) {
      if ((now - entry.timestamp) < maxAge) {
        cleaned[key] = entry;
      }
    }
    
    await AsyncStorage.setItem(OFFLINE_CACHE_KEY, JSON.stringify(cleaned));
  } catch (error) {
    const err = error as Error;
    console.warn('[OfflineCache] Erro ao limpar:', err.message);
  }
}

// ============================================================================
// 5. OTIMIZAÇÃO DE QUERIES
// ============================================================================

/**
 * Gera dateKey para queries - usando data LOCAL (não UTC)
 * IMPORTANTE: Usar data local para consistência com o horário do usuário
 */
export function getTodayKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Gera range de dateKeys para período - usando data LOCAL (não UTC)
 */
export function getDateKeyRange(periodo: Period): DateKeyRange {
  const now = new Date();
  
  // Função auxiliar para formatar data local como YYYY-MM-DD
  const formatLocalDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  const startDate = new Date(now);
  
  switch (periodo) {
    case 'semana':
      startDate.setDate(now.getDate() - 7);
      break;
    case 'mes':
    case 'mesVigente':
      // 🔧 CORREÇÃO: Pegar início do mês atual, não mês anterior
      startDate.setDate(1); // Primeiro dia do mês atual
      break;
    case 'hoje':
    default:
      // Para 'hoje', startKey e endKey são iguais
      break;
  }
  
  return {
    startKey: formatLocalDate(startDate),
    endKey: formatLocalDate(now)
  };
}

// ============================================================================
// 6. ÍNDICES RECOMENDADOS (FIRESTORE)
// ============================================================================

/**
 * Índices compostos recomendados para criar no Firebase Console:
 * 
 * Collection: pedidos
 * 1. dateKey (ASC) + status (ASC) + horaPedido (DESC)
 * 2. dateKey (ASC) + criadoPor (ASC)
 * 3. dateKey (ASC) + isPago (ASC)
 * 
 * Collection: comandas
 * 1. dateKey (ASC) + status (ASC)
 * 2. dateKey (ASC) + comandaNumber (ASC)
 * 
 * Para criar, acesse:
 * https://console.firebase.google.com/project/restaurante-6f221/firestore/indexes
 */

export const RECOMMENDED_INDEXES: RecommendedIndex[] = [
  {
    collection: 'pedidos',
    fields: ['dateKey', 'status', 'horaPedido'],
    description: 'Busca pedidos por dia e status'
  },
  {
    collection: 'pedidos',
    fields: ['dateKey', 'criadoPor'],
    description: 'Estatísticas por garçom'
  },
  {
    collection: 'pedidos',
    fields: ['dateKey', 'isPago'],
    description: 'Pedidos pagos/pendentes'
  },
  {
    collection: 'comandas',
    fields: ['dateKey', 'status'],
    description: 'Comandas abertas/fechadas'
  }
];

// ============================================================================
// 7. THROTTLE PARA ATUALIZAÇÕES FREQUENTES
// ============================================================================

const throttleMap = new Map<string, number>();

/**
 * Executa função com throttle (máximo 1x por intervalo)
 */
export function throttle<T>(
  key: string, 
  fn: () => Promise<T>, 
  interval: number = 1000
): Promise<T | void> {
  const last = throttleMap.get(key) || 0;
  const now = Date.now();
  
  if (now - last >= interval) {
    throttleMap.set(key, now);
    return fn();
  }
  
  return Promise.resolve();
}

// ============================================================================
// 8. PREFETCH DE DADOS COMUNS
// ============================================================================

/**
 * Pré-carrega dados que serão usados frequentemente
 */
export async function prefetchCommonData(): Promise<void> {
  try {
    // Pré-carregar cardápio do AsyncStorage
    const cardapio = await AsyncStorage.getItem('@cardapio_cache');
    if (!cardapio) {
      // Se não existe, será carregado na primeira requisição
      console.log('[Prefetch] Cardápio não encontrado no cache');
    }
    
    // Limpar cache expirado em background
    cleanExpiredOfflineCache();
    
  } catch (error) {
    const err = error as Error;
    console.warn('[Prefetch] Erro:', err.message);
  }
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default {
  cachedQuery,
  invalidateCache,
  batchedWrite,
  debouncedCallback,
  saveToOfflineCache,
  getFromOfflineCache,
  cleanExpiredOfflineCache,
  getTodayKey,
  getDateKeyRange,
  throttle,
  prefetchCommonData,
  RECOMMENDED_INDEXES
};
