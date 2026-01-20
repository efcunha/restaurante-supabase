/**
 * FirebaseOptimizations.js
 * Utilitários para otimização de performance do Firebase
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
  enableIndexedDbPersistence,
  enableMultiTabIndexedDbPersistence,
  CACHE_SIZE_UNLIMITED,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ==========================================
// 1. CACHE DE QUERIES COM TTL
// ==========================================

const queryCache = new Map();
const CACHE_TTL = 30000; // 30 segundos

/**
 * Executa query com cache
 * @param {string} cacheKey - Chave única para o cache
 * @param {Function} queryFn - Função que executa a query
 * @param {number} ttl - Tempo de vida do cache em ms
 */
export async function cachedQuery(cacheKey, queryFn, ttl = CACHE_TTL) {
  const cached = queryCache.get(cacheKey);
  const now = Date.now();
  
  if (cached && (now - cached.timestamp) < ttl) {
    console.log(`[Cache HIT] ${cacheKey}`);
    return cached.data;
  }
  
  console.log(`[Cache MISS] ${cacheKey}`);
  const data = await queryFn();
  queryCache.set(cacheKey, { data, timestamp: now });
  
  return data;
}

/**
 * Invalida cache por prefixo
 */
export function invalidateCache(prefix = '') {
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

// ==========================================
// 2. BATCHED WRITES
// ==========================================

/**
 * Executa múltiplas operações de escrita em batch
 * Muito mais eficiente que operações individuais
 * 
 * @param {Array} operations - Array de { type: 'set'|'update'|'delete', ref, data }
 */
export async function batchedWrite(operations) {
  if (!operations || operations.length === 0) return;
  
  // Firestore permite máximo 500 operações por batch
  const BATCH_SIZE = 500;
  const batches = [];
  
  for (let i = 0; i < operations.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const chunk = operations.slice(i, i + BATCH_SIZE);
    
    chunk.forEach(({ type, ref, data }) => {
      switch (type) {
        case 'set':
          batch.set(ref, data);
          break;
        case 'update':
          batch.update(ref, data);
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

// ==========================================
// 3. DEBOUNCE DE LISTENERS
// ==========================================

const listenerDebounceMap = new Map();

/**
 * Cria um listener com debounce para evitar re-renders excessivos
 * 
 * @param {string} key - Identificador único do listener
 * @param {Function} callback - Callback a ser executado
 * @param {number} delay - Delay em ms (padrão 100ms)
 */
export function debouncedCallback(key, callback, delay = 100) {
  return (data) => {
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

// ==========================================
// 4. CACHE OFFLINE COM ASYNCSTORAGE
// ==========================================

const OFFLINE_CACHE_KEY = '@firebase_offline_cache';

/**
 * Salva dados no cache offline
 */
export async function saveToOfflineCache(key, data) {
  try {
    const cache = await getOfflineCache();
    cache[key] = {
      data,
      timestamp: Date.now()
    };
    await AsyncStorage.setItem(OFFLINE_CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.warn('[OfflineCache] Erro ao salvar:', error.message);
  }
}

/**
 * Recupera dados do cache offline
 */
export async function getFromOfflineCache(key, maxAge = 3600000) { // 1 hora padrão
  try {
    const cache = await getOfflineCache();
    const entry = cache[key];
    
    if (entry && (Date.now() - entry.timestamp) < maxAge) {
      return entry.data;
    }
    return null;
  } catch (error) {
    console.warn('[OfflineCache] Erro ao recuperar:', error.message);
    return null;
  }
}

async function getOfflineCache() {
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
export async function cleanExpiredOfflineCache(maxAge = 86400000) { // 24 horas
  try {
    const cache = await getOfflineCache();
    const now = Date.now();
    const cleaned = {};
    
    for (const [key, entry] of Object.entries(cache)) {
      if ((now - entry.timestamp) < maxAge) {
        cleaned[key] = entry;
      }
    }
    
    await AsyncStorage.setItem(OFFLINE_CACHE_KEY, JSON.stringify(cleaned));
  } catch (error) {
    console.warn('[OfflineCache] Erro ao limpar:', error.message);
  }
}

// ==========================================
// 5. OTIMIZAÇÃO DE QUERIES
// ==========================================

/**
 * Gera dateKey para queries - usando data LOCAL (não UTC)
 * IMPORTANTE: Usar data local para consistência com o horário do usuário
 */
export function getTodayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Gera range de dateKeys para período - usando data LOCAL (não UTC)
 */
export function getDateKeyRange(periodo) {
  const now = new Date();
  
  // Função auxiliar para formatar data local como YYYY-MM-DD
  const formatLocalDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  let startDate = new Date(now);
  
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

// ==========================================
// 6. ÍNDICES RECOMENDADOS (FIRESTORE)
// ==========================================

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

export const RECOMMENDED_INDEXES = [
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

// ==========================================
// 7. THROTTLE PARA ATUALIZAÇÕES FREQUENTES
// ==========================================

const throttleMap = new Map();

/**
 * Executa função com throttle (máximo 1x por intervalo)
 */
export function throttle(key, fn, interval = 1000) {
  const last = throttleMap.get(key) || 0;
  const now = Date.now();
  
  if (now - last >= interval) {
    throttleMap.set(key, now);
    return fn();
  }
  
  return Promise.resolve();
}

// ==========================================
// 8. PREFETCH DE DADOS COMUNS
// ==========================================

/**
 * Pré-carrega dados que serão usados frequentemente
 */
export async function prefetchCommonData() {
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
    console.warn('[Prefetch] Erro:', error.message);
  }
}

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
