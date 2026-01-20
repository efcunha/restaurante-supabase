/**
 * OrderFirestoreService - Adaptador entre OrderService e Firestore
 * Converte formato do Firestore para o formato local do app
 */

import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  doc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  serverTimestamp,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import OrderService from './OrderService.js';
import { 
  cachedQuery, 
  invalidateCache, 
  debouncedCallback,
  saveToOfflineCache,
  getFromOfflineCache,
  getTodayKey,
  getDateKeyRange,
  throttle 
} from './FirebaseOptimizations';

const PEDIDOS_COLLECTION = 'pedidos';

/**
 * Normaliza comandaNumber para garantir consistência entre String e Number
 * @param {string|number} value - Valor a ser normalizado
 * @returns {string} Valor normalizado como string
 */
const normalizeComandaNumber = (value) => {
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

/**
 * Busca pedidos por comanda com fallback para compatibilidade e tratamento robusto de erros
 * @param {string|number} comandaNumber - Número da comanda
 * @returns {Promise<Array>} Lista de pedidos encontrados
 */
const findOrdersByComanda = async (comandaNumber) => {
  const { robustFirestoreQuery, queryWithFallbacks } = await import('../utils/errorHandling');
  
  const normalized = normalizeComandaNumber(comandaNumber);
  
  // Don't search for empty comandaNumbers
  if (!normalized || normalized === '') {
    return [];
  }
  
  const todayKey = getTodayKey();
  
  // Define query strategies with fallbacks
  const queryStrategies = [
    {
      name: 'Primary query with numeroComanda',
      execute: async () => {
        const q = query(
          collection(db, PEDIDOS_COLLECTION),
          where('numeroComanda', '==', normalized),
          where('dateKey', '==', todayKey)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }
    },
    {
      name: 'Fallback with original comandaNumber value',
      execute: async () => {
        if (normalized === String(comandaNumber)) {
          return []; // Skip if same as primary
        }
        const q = query(
          collection(db, PEDIDOS_COLLECTION),
          where('numeroComanda', '==', String(comandaNumber)),
          where('dateKey', '==', todayKey)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }
    },
    {
      name: 'Legacy comandaNumber field query',
      execute: async () => {
        const q = query(
          collection(db, PEDIDOS_COLLECTION),
          where('comandaNumber', '==', normalized),
          where('dateKey', '==', todayKey)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }
    },
    {
      name: 'Client-side filtering fallback',
      execute: async () => {
        const q = query(
          collection(db, PEDIDOS_COLLECTION),
          where('dateKey', '==', todayKey)
        );
        const snapshot = await getDocs(q);
        
        // Filter on client side
        return snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(pedido => {
            const pedidoComandaNumber = normalizeComandaNumber(pedido.numeroComanda || pedido.comandaNumber);
            
            // Don't match pedidos with empty comandaNumbers
            if (!pedidoComandaNumber || pedidoComandaNumber === '') {
              return false;
            }
            
            return pedidoComandaNumber === normalized;
          });
      }
    }
  ];

  return await robustFirestoreQuery(
    async () => {
      // Try each strategy until one returns results
      for (const strategy of queryStrategies) {
        try {
          console.log(`[FindOrdersByComanda] Trying: ${strategy.name}`);
          const results = await strategy.execute();
          if (results.length > 0) {
            console.log(`[FindOrdersByComanda] Success with: ${strategy.name}, found ${results.length} pedidos`);
            return results;
          }
        } catch (error) {
          console.warn(`[FindOrdersByComanda] ${strategy.name} failed:`, error.message);
          // Continue to next strategy
        }
      }
      
      // All strategies returned empty results
      console.log(`[FindOrdersByComanda] No pedidos found for comanda ${normalized}`);
      return [];
    },
    {
      userFriendlyMessage: `Não foi possível carregar os pedidos da comanda ${normalized}. Verifique sua conexão e tente novamente.`,
      maxRetries: 2
    }
  );
};

/**
 * Converte documento Firestore para formato Order local
 */
const firestoreToOrder = (docId, data) => {
  let ts = data.horaPedido?.toDate?.() || null;
  if (!ts) {
    try {
      ts = data.criadoEm ? new Date(data.criadoEm) : null;
    } catch {}
  }
  // Se não houver timestamp válido nos dados, usar uma data "antiga" para não cair como hoje
  const timestamp = ts && !isNaN(ts.getTime()) ? ts : new Date('1970-01-01T00:00:00.000Z');
  
  // Usar data local para dateKey (consistente com getTodayKey)
  const getLocalDateKey = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  const result = {
    id: data.idFormatado || `#${docId.slice(-3)}`,
    client: data.cliente || '',
    comandaNumber: normalizeComandaNumber(data.numeroComanda || data.comandaNumber || ''),
    items: data.itens || [],
    itemsWithStatus: data.itemsWithStatus || [], // ✅ INCLUIR itemsWithStatus
    observations: data.observacoes || '',
    status: data.status || 'montagem',
    dateKey: data.dateKey || getLocalDateKey(timestamp), // ✅ CRÍTICO: Usar data local
    timestamp: timestamp.toISOString(),
    createdAt: data.criadoEm || data.horaPedido?.toDate?.()?.toISOString() || timestamp.toISOString(),
    horarioCriacao: data.horarioCriacao, // ✅ Horário formatado HH:MM
    timeInChurrasqueira: data.timeInChurrasqueira || timestamp.toISOString(),
    timeInMontagem: data.timeInMontagem || null,
    timeInProntos: data.timeInProntos || null,
    deliveredAt: data.deliveredAt || null,
    totalPrice: data.totalPrice || OrderService.calculateOrderTotal(data.itens || []),
    isPago: data.isPago === true || data.isPago === 'true', // CORREÇÃO: conversão mais rigorosa
    createdBy: data.criadoPor || '',
    createdByName: data.criadoPorNome || '',
    // ✅ CORREÇÃO: Incluir campos de rastreamento
    movidoParaMontagemPor: data.movidoParaMontagemPor || null,
    movidoParaMontagemPorNome: data.movidoParaMontagemPorNome || null,
    entreguePor: data.entreguePor || null,
    entreguePorNome: data.entreguePorNome || null,
    // ✅ CORREÇÃO: Incluir timestamp de atualização para merge
    atualizado: data.atualizado?.toDate?.()?.toISOString() || data.timestampLocal || timestamp.toISOString(),
  };
  // DEBUG ESPECÍFICO PARA isPago
  return result;
};

/**
 * Converte Order local para formato Firestore
 */
const orderToFirestore = (order) => {
  // Usar data local para dateKey fallback (consistente com getTodayKey)
  const getLocalDateKey = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  const result = {
    idFormatado: order.id,
    cliente: order.client,
    numeroComanda: normalizeComandaNumber(order.comandaNumber || ''),
    comandaNumber: normalizeComandaNumber(order.comandaNumber || ''), // Campo de compatibilidade
    itens: order.items,
    itemsWithStatus: order.itemsWithStatus || [], // ADICIONAR CAMPO PARA CONTROLE INDIVIDUAL
    observacoes: order.observations,
    status: order.status, // MANTER O STATUS ORIGINAL
    dateKey: order.dateKey || getLocalDateKey(), // ✅ CRÍTICO: Usar data local
    horaPedido: order.timestamp ? new Date(order.timestamp) : serverTimestamp(),
    horarioCriacao: order.horarioCriacao, // ✅ Horário formatado HH:MM
    criadoPor: order.createdBy || '',
    criadoPorNome: order.createdByName || '',
    criadoEm: order.createdAt || order.timestamp || new Date().toISOString(),
    timeInChurrasqueira: order.timeInChurrasqueira,
    timeInMontagem: order.timeInMontagem,
    timeInProntos: order.timeInProntos,
    deliveredAt: order.deliveredAt,
    totalPrice: order.totalPrice,
    isPago: Boolean(order.isPago), // CORREÇÃO: garantir que true/false seja preservado
    atualizado: serverTimestamp(),
  };
  return result;
};

class OrderFirestoreService {
  // Cache interno para evitar processamento duplicado
  _lastSnapshotHash = null;
  _debouncedCallbacks = new Map();

  /**
   * Escuta mudanças em pedidos ativos em tempo real
   * OTIMIZADO: Com debounce para evitar re-renders excessivos
   * @param {Function} callback - Recebe { orders, docMap }
   * @returns {Function} Função unsubscribe
   */
  listenToActiveOrders(callback) {
    const setupListener = async () => {
      const { withErrorHandling, createUserFriendlyErrorMessage, retryWithBackoff } = await import('../utils/errorHandling');
      
      // Usar dateKey para filtrar pedidos do dia (mais eficiente e confiável)
      const todayKey = getTodayKey(); // YYYY-MM-DD
      
      // Query com filtro server-side por dateKey
      const q = query(
        collection(db, PEDIDOS_COLLECTION),
        where('dateKey', '==', todayKey)
      );
      
      // Criar callback com debounce (100ms) para evitar múltiplos re-renders
      const debouncedCb = debouncedCallback('activeOrders', callback, 100);

      // Enhanced snapshot handler with error recovery
      const handleSnapshot = withErrorHandling(
        (snapshot) => {
          try {
            if (typeof window !== 'undefined' && window.localStorage && window.localStorage.getItem('limpezaEmAndamento') === '1') {
              return;
            }
          } catch (e) {
            // Ignore localStorage errors
          }
          
          // OTIMIZAÇÃO: Verificar se snapshot realmente mudou
          const snapshotHash = snapshot.docs.map(d => `${d.id}:${d.data().atualizado?.seconds || 0}`).join(',');
          if (this._lastSnapshotHash === snapshotHash) {
            return; // Dados não mudaram, não processar
          }
          this._lastSnapshotHash = snapshotHash;
          let orders = [];
          const docMap = {}; // Mapeia orderId -> firestoreDocId
          
          snapshot.forEach((doc) => {
            try {
              const data = doc.data();
              const order = firestoreToOrder(doc.id, data);
              orders.push(order);
              docMap[order.id] = doc.id; // Guardar mapeamento
            } catch (docError) {
              console.warn(`[ListenToActiveOrders] Error processing document ${doc.id}:`, docError);
              // Continue processing other documents
            }
          });

          // Filtrar somente pedidos do dia atual (evita repovoar histórico após limpeza) - redundante mas seguro
          // CORREÇÃO: Usar data LOCAL consistente com getTodayKey
          const todayKey = getTodayKey();
          orders = orders.filter(o => {
            // Usar dateKey do pedido (já está em formato local)
            return o.dateKey === todayKey;
          });
          
          // Ordenar no cliente por horaPedido (mais recente primeiro)
          orders.sort((a, b) => {
            const dateA = new Date(a.timestamp || a.createdAt);
            const dateB = new Date(b.timestamp || b.createdAt);
            return dateB - dateA; // DESC
          });
          
          // OTIMIZAÇÃO: Salvar no cache offline para acesso rápido
          try {
            saveToOfflineCache('pedidos_hoje', { orders, docMap });
          } catch (cacheError) {
            console.warn('[ListenToActiveOrders] Cache save failed:', cacheError);
            // Continue without caching
          }
          
          // Usar callback com debounce
          debouncedCb({ orders, docMap });
        },
        {
          context: 'ListenToActiveOrders',
          showAlert: false, // Don't show alerts for listener errors
          fallbackValue: null,
          onError: (error) => {
            console.error('[ListenToActiveOrders] Snapshot processing error:', error);
            // Provide empty data to prevent UI crashes
            debouncedCb({ orders: [], docMap: {} });
          }
        }
      );

      // Enhanced error handler with automatic fallbacks
      const handleError = async (error) => {
        console.error('[ListenToActiveOrders] Listener error:', error);
        
        // Try fallback strategies based on error type
        if (error.code === 'failed-precondition' || error.message.includes('index')) {
          console.log('[ListenToActiveOrders] Index error detected, using fallback query...');
          
          try {
            const fallbackQ = query(collection(db, PEDIDOS_COLLECTION));
            return onSnapshot(fallbackQ, 
              withErrorHandling(
                (snapshot) => {
                  try {
                    if (typeof window !== 'undefined' && window.localStorage && window.localStorage.getItem('limpezaEmAndamento') === '1') {
                      return;
                    }
                    let orders = [];
                    const docMap = {};
                    snapshot.forEach((doc) => {
                      try {
                        const order = firestoreToOrder(doc.id, doc.data());
                        orders.push(order);
                        docMap[order.id] = doc.id;
                      } catch (docError) {
                        console.warn(`[ListenToActiveOrders] Fallback doc error ${doc.id}:`, docError);
                      }
                    });
                    
                    // CORREÇÃO: Usar data LOCAL consistente com getTodayKey
                    const todayKey = getTodayKey();
                    orders = orders.filter(o => {
                      // Usar dateKey do pedido (já está em formato local)
                      return o.dateKey === todayKey;
                    });
                    orders.sort((a, b) => {
                      const dateA = new Date(a.timestamp || a.createdAt);
                      const dateB = new Date(b.timestamp || b.createdAt);
                      return dateB - dateA;
                    });
                    callback({ orders, docMap });
                  } catch (e) {
                    console.error('[ListenToActiveOrders] Fallback processing error:', e);
                    callback({ orders: [], docMap: {} });
                  }
                },
                {
                  context: 'ListenToActiveOrders-Fallback',
                  showAlert: false,
                  onError: () => callback({ orders: [], docMap: {} })
                }
              ),
              (fallbackError) => {
                console.error('[ListenToActiveOrders] Fallback listener also failed:', fallbackError);
                callback({ orders: [], docMap: {} });
              }
            );
          } catch (fallbackSetupError) {
            console.error('[ListenToActiveOrders] Failed to setup fallback listener:', fallbackSetupError);
            callback({ orders: [], docMap: {} });
          }
        }
        
        // For other errors, provide empty data and log
        const userMessage = createUserFriendlyErrorMessage(error, 'carregamento de pedidos');
        console.error(`[ListenToActiveOrders] ${userMessage}`, error);
        callback({ orders: [], docMap: {} });
      };

      try {
        const unsubscribe = onSnapshot(q, handleSnapshot, handleError);
        return unsubscribe;
      } catch (setupError) {
        console.error('[ListenToActiveOrders] Failed to setup listener:', setupError);
        callback({ orders: [], docMap: {} });
        return () => {};
      }
    };

    // Return a promise that resolves to the unsubscribe function
    return setupListener().catch((error) => {
      console.error('[ListenToActiveOrders] Setup failed:', error);
      callback({ orders: [], docMap: {} });
      return () => {};
    });
  }

  /**
   * Salva um order já criado no Firestore (NOVO - evita duplicação)
   * @param {Object} order - Order completo criado pelo OrderService
   * @returns {Promise<string>} ID do documento criado
   */
  async saveOrder(order) {
    try {
      const firestoreData = orderToFirestore(order);
      const docRef = await addDoc(collection(db, PEDIDOS_COLLECTION), firestoreData);
      
      // OTIMIZAÇÃO: Invalidar cache de estatísticas após criar pedido
      invalidateCache('stats_');
      
      return docRef.id;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Busca o ID do documento Firestore pelo orderId formatado (#XXX)
   * @param {string} orderId - ID formatado do pedido (ex: #001)
   * @returns {Promise<string|null>} ID do documento Firestore ou null se não encontrado
   */
  async findDocIdByOrderId(orderId) {
    try {
      const todayKey = getTodayKey();
      const q = query(
        collection(db, PEDIDOS_COLLECTION),
        where('dateKey', '==', todayKey),
        where('idFormatado', '==', orderId)
      );
      
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        return snapshot.docs[0].id;
      }
      
      // Fallback: buscar sem filtro de data (mais lento)
      const qFallback = query(
        collection(db, PEDIDOS_COLLECTION),
        where('idFormatado', '==', orderId)
      );
      
      const snapshotFallback = await getDocs(qFallback);
      if (!snapshotFallback.empty) {
        return snapshotFallback.docs[0].id;
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Busca documento Firestore que contém um item específico pelo itemId
   * O itemId tem formato: #XXX-comanda-YYY-item-N (ex: #001-comanda-3-item-0) ou #XXX-item-N (compatibilidade)
   * @param {string} itemId - ID do item (ex: #001-comanda-3-item-0)
   * @returns {Promise<{docId: string, orderId: string}|null>} DocId e orderId ou null
   */
  async findDocByItemId(itemId) {
    try {
      // Extrair orderId do itemId (formato: #XXX-comanda-YYY-item-N ou #XXX-item-N para compatibilidade)
      const match = itemId.match(/^(#\d+)(?:-comanda-[^-]+-item-\d+|-item-\d+)$/);
      if (!match) {
        return null;
      }
      const orderId = match[1];
      
      const todayKey = getTodayKey();
      
      // Buscar por idFormatado (mais eficiente se houver índice)
      const q = query(
        collection(db, PEDIDOS_COLLECTION),
        where('dateKey', '==', todayKey),
        where('idFormatado', '==', orderId)
      );
      
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        return { docId: snapshot.docs[0].id, orderId };
      }
      
      // Fallback: buscar sem filtro de data
      const qFallback = query(
        collection(db, PEDIDOS_COLLECTION),
        where('idFormatado', '==', orderId)
      );
      
      const snapshotFallback = await getDocs(qFallback);
      if (!snapshotFallback.empty) {
        return { docId: snapshotFallback.docs[0].id, orderId };
      }
      
      // Fallback final: buscar TODOS os pedidos do dia e verificar itemsWithStatus
      const qAll = query(
        collection(db, PEDIDOS_COLLECTION),
        where('dateKey', '==', todayKey)
      );
      
      const snapshotAll = await getDocs(qAll);
      for (const doc of snapshotAll.docs) {
        const data = doc.data();
        if (data.itemsWithStatus && Array.isArray(data.itemsWithStatus)) {
          const found = data.itemsWithStatus.some(item => item.id === itemId);
          if (found) {
            return { docId: doc.id, orderId: data.idFormatado };
          }
        }
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Cria novo pedido no Firestore (LEGADO - mantido para compatibilidade)
   * @param {string} orderId - ID formatado (#001)
   * @param {string} client - Nome do cliente
   * @param {string[]} items - Lista de itens
   * @param {string} observations - Observações
   * @returns {Promise<string>} ID do documento criado
   */
  async createOrder(orderId, client, items, observations, comandaNumber = '', createdBy = '', createdByName = '') {
    try {
      const order = OrderService.createOrder(orderId, client, items, observations, comandaNumber, createdBy, createdByName);
      const firestoreData = orderToFirestore(order);
      const docRef = await addDoc(collection(db, PEDIDOS_COLLECTION), firestoreData);
      
      // OTIMIZAÇÃO: Invalidar cache de estatísticas após criar pedido
      invalidateCache('stats_');
      
      return docRef.id;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Atualiza status do pedido
   * @param {string} firestoreDocId - ID do documento no Firestore
   * @param {string} newStatus - Novo status
   * @param {Object} timestamps - Timestamps a adicionar
   */
  async updateOrderStatus(firestoreDocId, newStatus, timestamps = {}) {
    try {
      const pedidoRef = doc(db, PEDIDOS_COLLECTION, firestoreDocId);
      
      // 🔒 SEGURANÇA: Remover isPago dos timestamps
      const { isPago, ...safeTimestamps } = timestamps;
      
      await updateDoc(pedidoRef, {
        status: newStatus,
        ...safeTimestamps,
        atualizado: serverTimestamp(),
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Edita pedido existente
   * @param {string} firestoreDocId - ID do documento
   * @param {Object} updatedData - Dados atualizados
   */
  async updateOrder(firestoreDocId, updatedData) {
    try {
      const pedidoRef = doc(db, PEDIDOS_COLLECTION, firestoreDocId);
      
      // 🔒 SEGURANÇA: Remover isPago se vier nos dados
      const { isPago, ...safeData } = updatedData;
      
      const updatePayload = {
        atualizado: serverTimestamp(),
        // ✅ CORREÇÃO: Adicionar timestamp local para comparação
        timestampLocal: new Date().toISOString(),
      };
      
      // ✅ CORREÇÃO: Mapear todos os campos corretamente
      if (safeData.client) updatePayload.cliente = safeData.client;
      if (safeData.items) updatePayload.itens = safeData.items;
      if (safeData.observations !== undefined) updatePayload.observacoes = safeData.observations;
      if (safeData.totalPrice) updatePayload.totalPrice = safeData.totalPrice;
      if (safeData.itemsWithStatus) updatePayload.itemsWithStatus = safeData.itemsWithStatus;
      if (safeData.status) updatePayload.status = safeData.status;
      if (safeData.timeInMontagem) updatePayload.timeInMontagem = safeData.timeInMontagem;
      if (safeData.timeInProntos) updatePayload.timeInProntos = safeData.timeInProntos;
      if (safeData.deliveredAt) updatePayload.deliveredAt = safeData.deliveredAt;
      if (safeData.movidoParaMontagemPor) updatePayload.movidoParaMontagemPor = safeData.movidoParaMontagemPor;
      if (safeData.movidoParaMontagemPorNome) updatePayload.movidoParaMontagemPorNome = safeData.movidoParaMontagemPorNome;
      if (safeData.entreguePor) updatePayload.entreguePor = safeData.entreguePor;
      if (safeData.entreguePorNome) updatePayload.entreguePorNome = safeData.entreguePorNome;
      
      await updateDoc(pedidoRef, updatePayload);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Deleta pedido do Firestore
   * @param {string} firestoreDocId - ID do documento
   */
  async deleteOrder(firestoreDocId) {
    try {
      await deleteDoc(doc(db, PEDIDOS_COLLECTION, firestoreDocId));
    } catch (error) {
      throw error;
    }
  }

  /**
   * Busca ID do documento Firestore pelo idFormatado (#001)
   * @param {string} formattedId - ID formatado (#001)
   * @param {Array} orders - Lista de orders do snapshot
   * @returns {string|null} ID do documento Firestore
   */
  findFirestoreDocId(formattedId) {
    // Implementação temporária: você precisará manter um mapa id -> docId
    // Ou armazenar o docId no objeto Order
    // Por enquanto, retorna null e você precisa adaptar
    return null;
  }

  /**
   * Corrige automaticamente pedidos com status churrasqueira para montagem
   */
  async fixChurrasqueiraStatus() {
    try {
      // CORREÇÃO: Usar data LOCAL consistente com getTodayKey
      const todayKey = getTodayKey();
      
      // OTIMIZADO: Filtrar por dateKey + status (evita ler histórico todo)
      const q = query(
        collection(db, PEDIDOS_COLLECTION),
        where('dateKey', '==', todayKey),
        where('status', '==', 'churrasqueira')
      );
      
      const snapshot = await getDocs(q);
      const batch = [];
      snapshot.forEach((docSnapshot) => {
        batch.push(this.updateOrderStatus(docSnapshot.id, 'montagem'));
      });
      
      if (batch.length > 0) {
        await Promise.all(batch);
      }
      
    } catch (error) {
      console.error('❌ Erro ao corrigir status churrasqueira:', error.message);
    }
  }

  /**
   * Busca estatísticas por garçom com filtros de período (OTIMIZADO COM CACHE)
   * @param {string} garcomId - ID do garçom (null para todos)
   * @param {string} periodo - 'hoje', 'semana', 'mes'
   * @returns {Promise<Object>} Estatísticas do garçom
   */
  async getEstatisticasGarcom(garcomId = null, periodo = 'hoje') {
    const cacheKey = `stats_${garcomId || 'all'}_${periodo}`;
    
    try {
      // OTIMIZAÇÃO: Usar cache com TTL de 30 segundos para estatísticas
      return await cachedQuery(cacheKey, async () => {
        const { startKey, endKey } = getDateKeyRange(periodo);
        
        console.log(`[OrderFirestoreService] getEstatisticasGarcom - garcomId: ${garcomId}, periodo: ${periodo}`);
        console.log(`[OrderFirestoreService] dateKey range: ${startKey} a ${endKey}`);
        
        // BUSCAR PEDIDOS
        let q;
        if (periodo === 'hoje') {
          q = query(
            collection(db, PEDIDOS_COLLECTION),
            where('dateKey', '==', startKey)
          );
        } else {
          q = query(collection(db, PEDIDOS_COLLECTION));
        }
        
        const snapshot = await getDocs(q);
        console.log(`[OrderFirestoreService] Total de pedidos: ${snapshot.size}`);
        
        const pedidos = [];
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          const dateKey = data.dateKey || '';
          const pedidoGarcomId = data.criadoPor || data.createdBy || '';
          
          // Filtrar por dateKey no cliente (para períodos > hoje)
          if (dateKey >= startKey && dateKey <= endKey) {
            // Filtrar por garcomId no cliente (se especificado)
            if (!garcomId || pedidoGarcomId === garcomId) {
              pedidos.push({
                id: doc.id,
                ...data,
                totalPrice: data.totalPrice || 0,
                isPago: Boolean(data.isPago),
                formaPagamento: data.formaPagamento || null,
                criadoPor: data.criadoPor || '',
                criadoPorNome: data.criadoPorNome || '',
                numeroComanda: data.numeroComanda || '',
              });
            }
          }
        });

        // BUSCAR PAGAMENTOS
        const pagamentosQuery = query(collection(db, 'pagamentos'));
        const pagamentosSnapshot = await getDocs(pagamentosQuery);
        
        const pagamentos = [];
        pagamentosSnapshot.forEach((doc) => {
          const data = doc.data();
          const dateKey = data.dateKey || '';
          const pagamentoGarcomId = data.garcom || '';
          
          // Filtrar por dateKey e garcomId
          if (dateKey >= startKey && dateKey <= endKey) {
            if (!garcomId || pagamentoGarcomId === garcomId) {
              pagamentos.push({
                id: doc.id,
                ...data,
                valor: data.valor || 0,
                forma: data.forma || '',
                garcom: data.garcom || '',
                garcomNome: data.garcomNome || '',
              });
            }
          }
        });

        console.log(`[OrderFirestoreService] Pedidos filtrados: ${pedidos.length}, Pagamentos filtrados: ${pagamentos.length}`);
        
        const stats = this._calcularEstatisticas(pedidos, pagamentos);
        console.log(`[OrderFirestoreService] Estatísticas calculadas:`, JSON.stringify(stats));
        return stats;
      }, 30000); // Cache de 30 segundos
    } catch (error) {
      console.error('❌ Erro ao buscar estatísticas garçom:', error.message, error);
      return this._getEmptyStats();
    }
  }

  /**
   * Busca estatísticas de todos os garçons agrupadas (OTIMIZADO COM CACHE)
   * @param {string} periodo - 'hoje', 'semana', 'mes'
   * @returns {Promise<Array>} Array de estatísticas por garçom
   */
  async getEstatisticasTodosGarcons(periodo = 'hoje') {
    const cacheKey = `stats_all_garcons_${periodo}`;
    
    try {
      return await cachedQuery(cacheKey, async () => {
        const { startKey, endKey } = getDateKeyRange(periodo);
        
        console.log(`[OrderFirestoreService] getEstatisticasTodosGarcons - periodo: ${periodo}`);
        console.log(`[OrderFirestoreService] dateKey range: ${startKey} a ${endKey}`);
        
        // OTIMIZAÇÃO: Para 'hoje', usar query com filtro server-side
        let q;
        if (periodo === 'hoje') {
          q = query(
            collection(db, PEDIDOS_COLLECTION),
            where('dateKey', '==', startKey)
          );
        } else {
          q = query(collection(db, PEDIDOS_COLLECTION));
        }
        
        const snapshot = await getDocs(q);
        console.log(`[OrderFirestoreService] Total de pedidos: ${snapshot.size}`);
        
        // Filtrar por dateKey no cliente (para períodos > hoje)
        const pedidosFiltrados = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          const dateKey = data.dateKey || '';
          if (dateKey >= startKey && dateKey <= endKey) {
            pedidosFiltrados.push({ id: doc.id, ...data });
          }
        });
        
        console.log(`[OrderFirestoreService] Pedidos após filtro de data: ${pedidosFiltrados.length}`);
        
        const pedidosPorGarcom = {};
        
        // Usar pedidosFiltrados (já filtrados por data)
        pedidosFiltrados.forEach((pedido) => {
          const garcomIdOriginal = pedido.criadoPor || pedido.createdBy || 'sem-garcom';
          const garcomNome = pedido.criadoPorNome || pedido.createdByName || 'Sem Garçom';
          
          // CORREÇÃO: Normalizar o nome para agrupar corretamente (evitar duplicatas)
          const normalizeString = (str) => {
            return str
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '') // Remove acentos
              .replace(/\s+/g, ' ')            // Normaliza espaços
              .trim();
          };
          
          const garcomKey = normalizeString(garcomNome);
          
          if (!pedidosPorGarcom[garcomKey]) {
            pedidosPorGarcom[garcomKey] = {
              garcomId: garcomIdOriginal,
              garcomNome: garcomNome,
              pedidos: [],
            };
          }
          
          pedidosPorGarcom[garcomKey].pedidos.push({
            id: pedido.id,
            ...pedido,
            totalPrice: pedido.totalPrice || 0,
            isPago: Boolean(pedido.isPago),
            formaPagamento: pedido.formaPagamento || null,
            numeroComanda: pedido.numeroComanda || '',
          });
        });
        
        // Calcular estatísticas para cada garçom
        const resultado = Object.values(pedidosPorGarcom).map(({ garcomId, garcomNome, pedidos }) => ({
          garcomId,
          garcomNome,
          ...this._calcularEstatisticas(pedidos, []),
        }));

        // Ordenar por total vendido (maior primeiro)
        resultado.sort((a, b) => b.totalVendido - a.totalVendido);

        console.log('[OrderFirestoreService] Resultado final de garçons:', resultado);
        return resultado;
      }, 30000); // Cache de 30 segundos
    } catch (error) {
      console.error('[OrderFirestoreService] Erro em getEstatisticasTodosGarcons:', error);
      return [];
    }
  }

  /**
   * Busca estatísticas de pagamentos por método de pagamento (OTIMIZADO)
   * @param {string} garcomId - ID do garçom (null para todos)
   * @param {string} periodo - 'hoje', 'semana', 'mes'
   * @returns {Promise<Object>} Estatísticas de pagamentos por método
   */
  async getEstatisticasPagamentos(garcomId = null, periodo = 'hoje') {
    try {
      const { startDate, endDate } = this._getDateRange(periodo);
      // CORREÇÃO: Usar formato de data LOCAL
      const formatLocalDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      const startDateKey = formatLocalDate(startDate);
      const endDateKey = formatLocalDate(endDate);
      
      // CORREÇÃO: Buscar collection PAGAMENTOS em vez de pedidos
      const q = query(collection(db, 'pagamentos'));
      const snapshot = await getDocs(q);
      
      const pagamentosPorMetodo = {
        dinheiro: { total: 0, quantidade: 0 },
        pix: { total: 0, quantidade: 0 },
        debito: { total: 0, quantidade: 0 },
        credito: { total: 0, quantidade: 0 },
      };
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        const dateKey = data.dateKey || '';
        
        // Filtrar por dateKey
        if (dateKey >= startDateKey && dateKey <= endDateKey) {
          // Filtrar por garcomId (se fornecido)
          if (!garcomId || data.garcom === garcomId) {
            const metodo = this._normalizarFormaPagamento(data.forma);
            const valor = data.valor || 0;
            
            if (pagamentosPorMetodo[metodo]) {
              pagamentosPorMetodo[metodo].total += valor;
              pagamentosPorMetodo[metodo].quantidade += 1;
            }
          }
        }
      });

      return pagamentosPorMetodo;
    } catch (error) {
      console.error('❌ Erro ao buscar estatísticas pagamentos:', error.message);
      return {
        dinheiro: { total: 0, quantidade: 0 },
        pix: { total: 0, quantidade: 0 },
        debito: { total: 0, quantidade: 0 },
        credito: { total: 0, quantidade: 0 },
      };
    }
  }

  /**
   * Busca comandas associadas a um garçom (OTIMIZADO)
   * @param {string} garcomId - ID do garçom
   * @param {string} periodo - 'hoje', 'semana', 'mes'
   * @returns {Promise<Object>} Estatísticas de comandas
   */
  async getEstatisticasComandas(garcomId = null, periodo = 'hoje') {
    try {
      const { startDate, endDate } = this._getDateRange(periodo);
      
      // OTIMIZADO: Comandas geralmente são poucas, filtrar no cliente é OK
      const q = query(
        collection(db, 'comandas'),
        limit(200) // Proteger contra crescimento infinito
      );
      
      const snapshot = await getDocs(q);
      const comandas = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        
        // Converter abertaAt para Date se for string
        const abertaAt = data.abertaAt?.toDate?.() || new Date(data.abertaAt);
        
        // Filtrar por período e garcomId (se fornecido)
        if (abertaAt >= startDate && abertaAt <= endDate) {
          if (!garcomId || data.abertaPor === garcomId || data.createdBy === garcomId) {
            comandas.push({
              id: doc.id,
              numero: data.comandaNumber || data.numero,
              status: data.status,
              totalConsumido: data.totalConsumido || 0,
              totalPago: data.totalPago || 0,
              saldoAberto: data.saldoAberto || 0,
            });
          }
        }
      });

      const abertas = comandas.filter(c => c.status === 'aberta');
      const fechadas = comandas.filter(c => c.status === 'fechada');

      return {
        total: comandas.length,
        abertas: abertas.length,
        fechadas: fechadas.length,
        totalConsumido: comandas.reduce((sum, c) => sum + c.totalConsumido, 0),
        totalPago: comandas.reduce((sum, c) => sum + c.totalPago, 0),
        saldoAberto: comandas.reduce((sum, c) => sum + c.saldoAberto, 0),
      };
    } catch (error) {
      return {
        total: 0,
        abertas: 0,
        fechadas: 0,
        totalConsumido: 0,
        totalPago: 0,
        saldoAberto: 0,
      };
    }
  }

  /**
   * Calcula o range de datas baseado no período
   * @private
   * @param {string} periodo - 'hoje', 'semana', 'mes', 'mesVigente' ou 'YYYY-MM' para mês específico
   */
  _getDateRange(periodo) {
    const now = new Date();
    let startDate, endDate;

    // Verificar se é um mês específico no formato YYYY-MM
    if (periodo && /^\d{4}-\d{2}$/.test(periodo)) {
      const [ano, mes] = periodo.split('-').map(Number);
      // Primeiro dia do mês
      startDate = new Date(ano, mes - 1, 1, 0, 0, 0);
      // Último dia do mês
      endDate = new Date(ano, mes, 0, 23, 59, 59);
      console.log(`[OrderFirestoreService] _getDateRange('${periodo}') - Mês específico: ${startDate.toISOString()} a ${endDate.toISOString()}`);
      return { startDate, endDate };
    }

    switch (periodo) {
      case 'hoje':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        break;
      
      case 'semana':
        // Últimos 7 dias (mais útil que semana calendário)
        startDate = new Date(now.getTime());
        startDate.setDate(now.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        break;
      
      case 'mes':
      case 'mesVigente':
        // Mês vigente (calendário) - do dia 1 até hoje
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        break;
      
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    }

    console.log(`[OrderFirestoreService] _getDateRange('${periodo}'): ${startDate.toISOString()} a ${endDate.toISOString()}`);
    return { startDate, endDate };
  }

  /**
   * Calcula estatísticas a partir de uma lista de pedidos
   * @private
   */
  _calcularEstatisticas(pedidos, pagamentos = []) {
    const totalPedidos = pedidos.length;
    const pedidosPagos = pedidos.filter(p => p.isPago);
    const pedidosAbertos = pedidos.filter(p => !p.isPago);
    
    const totalVendido = pedidos.reduce((sum, p) => sum + (p.totalPrice || 0), 0);
    const totalRecebido = pedidosPagos.reduce((sum, p) => sum + (p.totalPrice || 0), 0);
    const totalAberto = pedidosAbertos.reduce((sum, p) => sum + (p.totalPrice || 0), 0);
    
    // CORREÇÃO: Usar dados reais de pagamentos para formas de pagamento
    const porFormaPagamento = {
      dinheiro: 0,
      pix: 0,
      debito: 0,
      credito: 0
    };
    
    // Calcular por forma usando collection pagamentos (dados reais)
    pagamentos.forEach(p => {
      const forma = this._normalizarFormaPagamento(p.forma);
      porFormaPagamento[forma] += (p.valor || 0);
    });
    
    // Comandas únicas
    const comandasUnicas = new Set(pedidos.map(p => p.numeroComanda).filter(Boolean));
    const quantidadeComandas = comandasUnicas.size;
    
    // Ticket médio
    const ticketMedio = quantidadeComandas > 0 ? totalVendido / quantidadeComandas : 0;
    
    // Produto mais vendido
    const produtoCount = {};
    pedidos.forEach(p => {
      const itens = p.itens || [];
      itens.forEach(item => {
        produtoCount[item] = (produtoCount[item] || 0) + 1;
      });
    });
    
    const produtoMaisVendido = Object.entries(produtoCount)
      .sort((a, b) => b[1] - a[1])[0];

    return {
      totalPedidos,
      totalVendido,
      totalRecebido,
      totalAberto,
      quantidadeComandas,
      porFormaPagamento,
      comandasAbertas: pedidosAbertos.length,
      comandasFechadas: pedidosPagos.length,
      ticketMedio,
      produtoMaisVendido: produtoMaisVendido ? {
        nome: produtoMaisVendido[0],
        quantidade: produtoMaisVendido[1],
      } : null,
    };
  }

  /**
   * Normaliza forma de pagamento para formato padrão
   * @private
   */
  _normalizarFormaPagamento(forma) {
    if (!forma) return 'dinheiro';
    
    const normalized = forma.toLowerCase().trim();
    
    if (normalized.includes('pix')) return 'pix';
    if (normalized.includes('débito') || normalized.includes('debito')) return 'debito';
    if (normalized.includes('crédito') || normalized.includes('credito')) return 'credito';
    
    return 'dinheiro';
  }

  /**
   * Retorna estatísticas vazias
   * @private
   */
  _getEmptyStats() {
    return {
      totalPedidos: 0,
      totalVendido: 0,
      totalRecebido: 0,
      totalAberto: 0,
      quantidadeComandas: 0,
      comandasAbertas: 0,
      comandasFechadas: 0,
      ticketMedio: 0,
      produtoMaisVendido: null,
    };
  }
}

// Export helper functions for testing and external use
export { normalizeComandaNumber, findOrdersByComanda };

export default new OrderFirestoreService();
