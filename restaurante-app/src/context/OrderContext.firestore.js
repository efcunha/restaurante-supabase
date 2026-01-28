import React, { createContext, useState, useContext, useCallback, useEffect, useMemo, useRef } from 'react';
import { Platform } from 'react-native';
import { writeBatch, doc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { getCompanyCollection } from '../utils/firestoreUtils';
import OrderService from '../services/OrderService.js';
import OrderFirestoreService from '../services/OrderFirestoreService';
import { useAuth } from './AuthContext';

// Função auxiliar para calcular total buscando preços do Firestore
// Função auxiliar para calcular total buscando preços do Firestore ou usando cache
const calculateTotalFromFirestore = async (companyId, items, priceMap = null) => {
  try {
    if (!companyId) return 0;

    let cardapioMap = {};

    // OTIMIZAÇÃO: Se priceMap foi fornecido, usar ele diretamente e evitar fetch no Firestore
    if (priceMap && Object.keys(priceMap).length > 0) {
      console.log('⚡ [OrderContext] Usando priceMap fornecido (Cache)');
      cardapioMap = priceMap;
    } else {
      console.log('⚠️ [OrderContext] priceMap não fornecido, buscando cardápio no Firestore...');
      // Buscar todos os itens do cardápio
      const cardapioSnap = await getDocs(getCompanyCollection(companyId, 'cardapio'));

      cardapioSnap.forEach(doc => {
        const data = doc.data();
        if (data.name && data.price) {
          cardapioMap[data.name.toLowerCase()] = data.price;
        }
      });
    }

    let total = 0;

    items.forEach(item => {
      // Extrair quantidade
      const qtyMatch = item.match(/^(\d+)x?\s*/);
      const quantity = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;

      // Remover quantidade e tempero
      let itemName = item.replace(/^\d+x?\s*/, '').replace(/\s*\(.*\)$/, '').trim();

      // Verificar tamanho (300ml ou 180ml)
      let price = 0;
      if (itemName.includes('300ml')) {
        price = 15.00;
      } else if (itemName.includes('180ml')) {
        price = 10.00;
      } else {
        // Buscar preço no mapa
        const itemLower = itemName.toLowerCase();
        // Tentar match exato ou parcial se necessário (mas o mapa geralmente tem chaves exatas se vindo do Firestore)
        price = cardapioMap[itemLower] || 0;

        // Fallback para pesquisa caso não ache exato (para lidar com variações se o map for simples)
        if (price === 0 && !priceMap) {
          // Se veio do Firestore, já construímos lowercase.
          // Se veio do priceMap externo, ele deve estar preparado.
        }
      }

      total += quantity * price;
    });

    return total;
  } catch (error) {
    console.error('❌ Erro ao calcular total do Firestore:', error);
    return 0;
  }
};

const OrderContext = createContext();

export const useOrders = () => {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrders must be used within OrderProvider');
  }
  return context;
};

export const OrderProvider = ({ children }) => {
  // Obter usuário do AuthContext
  const { user } = useAuth();

  const [orders, setOrders] = useState([]);
  const [orderCounter, setOrderCounter] = useState(1);
  const [isOnline, setIsOnline] = useState(true);
  const [firestoreDocMap, setFirestoreDocMap] = useState({}); // Mapeia orderId -> firestoreDocId

  // Listener do Firestore para sincronização em tempo real
  // ✅ FIX: Só inicializa quando houver usuário logado (evita crash no Android)
  useEffect(() => {
    // Se não há usuário, limpar dados e não inicializar listener
    if (!user) {
      setOrders([]);
      setFirestoreDocMap({});
      setOrderCounter(1);
      return;
    }

    let unsubscribe = null;
    let mounted = true;

    try {
      unsubscribe = OrderFirestoreService.listenToActiveOrders(user.companyId, ({ orders: firestoreOrders, docMap }) => {
        // CRÍTICO: Verificar se ainda está montado E se ainda há usuário
        if (!mounted || !user) return;

        // ✅ CORREÇÃO: Atualizar o mapeamento orderId -> firestoreDocId
        // Isso é CRÍTICO para operações de update/delete funcionarem após reiniciar o app
        setFirestoreDocMap(prevMap => {
          // Verificar novamente antes de atualizar
          if (!mounted || !user) return prevMap;
          // Mesclar com mapa existente para preservar mapeamentos locais
          return { ...prevMap, ...docMap };
        });

        // Atualizar orders com dados do Firestore
        // IMPORTANTE: Mesclar com estado local para preservar atualizações otimistas
        setOrders(prevOrders => {
          // CRÍTICO: Verificar novamente antes de qualquer atualização
          if (!mounted || !user) return prevOrders;

          // Se não há pedidos locais, usar dados do Firestore diretamente
          if (prevOrders.length === 0) {
            return firestoreOrders;
          }

          // ✅ CORREÇÃO: Merge inteligente baseado em timestamps
          return firestoreOrders.map(firestoreOrder => {
            const localOrder = prevOrders.find(o => o.id === firestoreOrder.id);

            if (!localOrder) {
              // Pedido novo do Firestore
              return firestoreOrder;
            }

            // ✅ CORREÇÃO: Comparar timestamps de atualização
            const firestoreTime = new Date(firestoreOrder.atualizado || firestoreOrder.timestamp || '1970-01-01');
            const localTime = new Date(localOrder.atualizado || localOrder.timestamp || '1970-01-01');

            // Se dados do Firestore são mais recentes (diferença > 1 segundo), usar eles
            if (firestoreTime.getTime() - localTime.getTime() > 1000) {
              return firestoreOrder;
            }

            // ✅ CORREÇÃO: Merge de itemsWithStatus item por item
            if (localOrder.itemsWithStatus && firestoreOrder.itemsWithStatus) {
              const mergedItems = firestoreOrder.itemsWithStatus.map(firestoreItem => {
                const localItem = localOrder.itemsWithStatus.find(li => li.id === firestoreItem.id);

                if (!localItem) {
                  return firestoreItem;
                }

                // Comparar timestamps dos itens individuais
                const firestoreItemTime = new Date(firestoreItem.timestamp || '1970-01-01');
                const localItemTime = new Date(localItem.timestamp || '1970-01-01');

                // Se item do Firestore é mais recente (diferença > 1 segundo), usar ele
                if (firestoreItemTime.getTime() - localItemTime.getTime() > 1000) {
                  return firestoreItem;
                }

                // Manter item local se for mais recente ou igual
                return localItem;
              });

              return {
                ...firestoreOrder,
                itemsWithStatus: mergedItems,
                // ✅ CORREÇÃO: Preservar campos de status mais recentes
                timeInMontagem: localOrder.timeInMontagem || firestoreOrder.timeInMontagem,
                timeInProntos: localOrder.timeInProntos || firestoreOrder.timeInProntos,
                deliveredAt: localOrder.deliveredAt || firestoreOrder.deliveredAt,
                status: localOrder.status || firestoreOrder.status
              };
            }

            // Fallback: manter dados locais se não há itemsWithStatus
            return localOrder;
          });
        });

        setIsOnline(true);
      });
    } catch (error) {
      console.error('OrderProvider: Erro ao iniciar listener Firestore:', error);
      if (mounted) setIsOnline(false);
    }

    // Detectar quando estiver offline
    const handleOffline = () => {
      if (mounted) setIsOnline(false);
    };

    const handleOnline = () => {
      if (mounted) setIsOnline(true);
    };

    // Em React Native (Android/iOS) não existe window.addEventListener
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('offline', handleOffline);
      window.addEventListener('online', handleOnline);
    }

    return () => {
      mounted = false;
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe();
      }
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.removeEventListener) {
        window.removeEventListener('offline', handleOffline);
        window.removeEventListener('online', handleOnline);
      }
    };
  }, [user]); // ✅ FIX: Reagir a mudanças no user

  // Adicionar novo pedido - salva no Firestore
  // OTIMIZADO: Operações em paralelo onde possível
  const addOrder = useCallback(async (clientName, items, observations, comandaNumber = '', createdBy = '', createdByName = '', totalPrice = 0, isPago = false, mesa = '', priceMap = null, categoryMap = null) => {
    const orderId = OrderService.generateOrderId(orderCounter);

    console.log('🔵 [OrderContext] addOrder chamado, isOnline:', isOnline);

    try {
      if (isOnline) {
        // OTIMIZAÇÃO: Import dinâmico em paralelo
        const [{ default: CaixaService }, { default: ComandasService }] = await Promise.all([
          import('../services/CaixaService'),
          import('../services/ComandasService')
        ]);

        const caixa = await CaixaService.getCaixaAberto(user.companyId);
        if (!caixa) {
          throw new Error('Caixa não está aberto. Abra o caixa antes de criar pedidos.');
        }

        // 🔒 VALIDAÇÃO: Verificar se a comanda já tem pagamentos
        if (comandaNumber && comandaNumber.trim() !== '') {
          const { db } = await import('../config/firebaseConfig');
          const { collection, query, where, getDocs } = await import('firebase/firestore');

          const dateKey = new Date().toISOString().split('T')[0];
          const pagamentosQuery = query(
            collection(db, 'pagamentos'),
            where('comandaNumber', '==', String(comandaNumber)),
            where('dateKey', '==', dateKey)
          );

          const pagamentosSnap = await getDocs(pagamentosQuery);
          if (!pagamentosSnap.empty) {
            throw new Error(`Não é possível adicionar itens à comanda ${comandaNumber} pois já possui pagamentos registrados.`);
          }
        }

        // Garantir comanda aberta ANTES de criar pedido
        console.log(`🔵 [OrderContext] Garantindo comanda aberta. Num: ${comandaNumber}, Mesa: ${mesa}, Cliente: "${clientName}"`);

        await ComandasService.ensureComandaAberta(user.companyId, comandaNumber, createdBy, createdByName, mesa, clientName);

        // Calcular total buscando preços do Firestore (ou cache)
        console.log('🔵 [OrderContext] Calculando total do pedido...');
        const calculatedTotal = await calculateTotalFromFirestore(user.companyId, items, priceMap);
        console.log('🔵 [OrderContext] Total calculado:', calculatedTotal);

        console.log('🔵 [OrderContext] Criando order object...');
        // ✅ Passar MESA e CATEGORYMAP para createOrder
        const order = OrderService.createOrder(orderId, clientName, items, observations, comandaNumber, createdBy, createdByName, calculatedTotal, false, mesa, categoryMap);
        const valorPedido = order.totalPrice || 0;
        console.log('🔵 [OrderContext] Order criado:', { orderId, comandaNumber, valorPedido, itemsCount: items.length });

        // Salvar pedido e adicionar consumo em paralelo (seguro pois comanda já existe)
        console.log('🔵 [OrderContext] Salvando no Firestore...');
        const [firestoreDocId] = await Promise.all([
          OrderFirestoreService.saveOrder(user.companyId, order),
          ComandasService.adicionarConsumo(user.companyId, comandaNumber, valorPedido)
        ]);
        console.log('✅ [OrderContext] Salvo com sucesso! DocId:', firestoreDocId);

        // Mapear orderId -> firestoreDocId
        setFirestoreDocMap(prev => ({ ...prev, [orderId]: firestoreDocId }));
        setOrderCounter(prev => prev + 1);

        return orderId;
      } else {
        // Fallback: modo local se offline
        // 🔒 SEGURANÇA: Forçar isPago = false
        const newOrder = OrderService.createOrder(orderId, clientName, items, observations, comandaNumber, createdBy, createdByName, totalPrice, false, mesa);
        setOrders(prevOrders => [newOrder, ...prevOrders]);
        setOrderCounter(prev => prev + 1);
        return orderId;
      }
    } catch (error) {
      console.error('❌ [OrderContext] Erro ao salvar pedido:', error);
      console.error('❌ [OrderContext] Stack:', error.stack);

      // Lançar erro para o componente tratar
      throw error;
      // 🔒 SEGURANÇA: Forçar isPago = false
      const newOrder = OrderService.createOrder(orderId, clientName, items, observations, comandaNumber, createdBy, createdByName, totalPrice, false, mesa);
      setOrders(prevOrders => [newOrder, ...prevOrders]);
      setOrderCounter(prev => prev + 1);

      return orderId;
    }
  }, [orderCounter, isOnline]);

  // Editar pedido - atualiza no Firestore
  const editOrder = useCallback(async (orderId, updatedData) => {
    try {
      // 🔒 SEGURANÇA: Bloquear alterações de isPago
      if ('isPago' in updatedData) {
        throw new Error('isPago só pode ser alterado pelo PagamentosService.');
      }

      const firestoreDocId = firestoreDocMap[orderId];

      if (isOnline && firestoreDocId) {
        // Validar antes de enviar
        const order = OrderService.findOrderById(orders, orderId);

        if (order) {
          OrderService.updateOrder(order, updatedData);
        }

        // Atualizar no Firestore
        await OrderFirestoreService.updateOrder(user.companyId, firestoreDocId, updatedData);
      } else {
        // Fallback local
        setOrders(prevOrders =>
          prevOrders.map(order => {
            if (order.id === orderId) {
              return OrderService.updateOrder(order, updatedData);
            }
            return order;
          })
        );
      }
    } catch (error) {
      throw error;
    }
  }, [orders, firestoreDocMap, isOnline]);

  // Cancelar/Excluir pedido - remove do Firestore
  const deleteOrder = useCallback(async (orderId) => {
    try {
      const order = OrderService.findOrderById(orders, orderId);
      if (order) {
        OrderService.validateDelete(order);
      }

      const firestoreDocId = firestoreDocMap[orderId];

      if (isOnline && firestoreDocId) {
        await OrderFirestoreService.deleteOrder(user.companyId, firestoreDocId);
        // Remover do mapa
        setFirestoreDocMap(prev => {
          const newMap = { ...prev };
          delete newMap[orderId];
          return newMap;
        });
      } else {
        // Fallback local
        setOrders(prevOrders => prevOrders.filter(o => o.id !== orderId));
      }
    } catch (error) {
      throw error;
    }
  }, [orders, firestoreDocMap, isOnline]);

  // Mover pedido para montagem - atualiza no Firestore
  const moveToMontagem = useCallback(async (orderId) => {
    try {
      const order = OrderService.findOrderById(orders, orderId);
      if (!order) throw new Error('Pedido não encontrado');

      const firestoreDocId = firestoreDocMap[orderId];
      const now = new Date().toISOString();

      // 🟡 REGRA 1: Adicionar timeInMontagem apenas se ainda for null
      const updatePayload = {};
      if (!order.timeInMontagem) {
        updatePayload.timeInMontagem = now;
      }

      updatePayload.movidoParaMontagemPor = user?.id || null;
      updatePayload.movidoParaMontagemPorNome = user?.nome || null;

      // Atualizar estado local primeiro (otimista)
      setOrders(prevOrders =>
        prevOrders.map(o =>
          o.id === orderId
            ? { ...o, status: 'montagem', ...updatePayload }
            : o
        )
      );

      if (isOnline && firestoreDocId) {
        await OrderFirestoreService.updateOrderStatus(user.companyId, firestoreDocId, 'montagem', updatePayload);
      }
    } catch (error) {
      // Error silently handled
    }
  }, [orders, firestoreDocMap, isOnline, user]);

  // Mover pedido para prontos - atualiza no Firestore
  const moveToProntos = useCallback(async (orderId) => {
    try {
      const firestoreDocId = firestoreDocMap[orderId];
      const now = new Date().toISOString();

      if (isOnline && firestoreDocId) {
        await OrderFirestoreService.updateOrderStatus(user.companyId, firestoreDocId, 'pronto', {
          timeInProntos: now,
          movidoParaProntoPor: user?.id || null,
          movidoParaProntoPorNome: user?.nome || null,
        });
      } else {
        // Fallback local
        setOrders(prevOrders =>
          prevOrders.map(order =>
            order.id === orderId
              ? OrderService.updateOrderStatus(order, 'pronto', user?.id, user?.nome)
              : order
          )
        );
      }
    } catch (error) {
      // Error silently handled
    }
  }, [firestoreDocMap, isOnline, user]);

  // Marcar pedido como entregue - atualiza no Firestore
  const markAsDelivered = useCallback(async (orderId) => {
    try {
      const firestoreDocId = firestoreDocMap[orderId];
      const now = new Date().toISOString();

      if (isOnline && firestoreDocId) {
        // ✅ Atualizar status para 'delivered' e adicionar deliveredAt
        await OrderFirestoreService.updateOrder(user.companyId, firestoreDocId, {
          status: 'delivered',
          deliveredAt: now,
          entreguePor: user?.id || null,
          entreguePorNome: user?.nome || null,
        });
        // MANTER no mapa para continuar rastreando e incluir nas estatísticas
      } else {
        // Fallback local - MANTER O PEDIDO, mudar status e adicionar deliveredAt
        setOrders(prevOrders =>
          prevOrders.map(order =>
            order.id === orderId
              ? {
                ...order,
                status: 'delivered',
                deliveredAt: now,
                entreguePor: user?.id || null,
                entreguePorNome: user?.nome || null
              }
              : order
          )
        );
      }
    } catch (error) {
      // Error silently handled
    }
  }, [firestoreDocMap, isOnline, user]);

  // Obter pedidos por status - usa OrderService
  const getOrdersByStatus = useCallback((status) => {
    // FILTRO DIRETO - cozinha visualiza montagem
    let filtered;
    if (status === 'cozinha') {
      // Cozinha visualiza pedidos em montagem (só visualização)
      filtered = orders.filter(order => order.status === 'montagem');
    } else {
      filtered = orders.filter(order => order.status === status);
    }

    return filtered;
  }, [orders]);

  // Obter pedido por ID - usa OrderService
  const getOrderById = useCallback((orderId) => {
    return OrderService.findOrderById(orders, orderId);
  }, [orders]);

  // Atualizar status de item individual
  // VERSÃO ROBUSTA: Busca por itemId que contém o orderId embutido
  const updateItemStatus = useCallback(async (orderId, itemId, newStatus) => {
    try {
      let order = null;
      let actualOrderId = orderId;
      let firestoreDocId = null;
      let updatePayload = null;

      // PASSO 1: Encontrar o pedido localmente pelo itemId (mais confiável)
      // O itemId tem formato #XXX-item-N, onde #XXX é o orderId original
      for (const o of orders) {
        if (o.itemsWithStatus && o.itemsWithStatus.some(item => item.id === itemId)) {
          order = o;
          actualOrderId = o.id;
          firestoreDocId = firestoreDocMap[o.id];
          break;
        }
      }

      // Se não encontrou localmente, tentar pelo orderId passado
      if (!order) {
        order = orders.find(o => o.id === orderId);
        if (order) {
          actualOrderId = order.id;
          firestoreDocId = firestoreDocMap[order.id];
        }
      }

      // PASSO 2: Se não encontrou firestoreDocId no mapa, buscar no Firestore pelo itemId
      if (!firestoreDocId && isOnline) {
        const result = await OrderFirestoreService.findDocByItemId(user.companyId, itemId);
        if (result) {
          firestoreDocId = result.docId;
          actualOrderId = result.orderId;
          // Atualizar mapa para futuras operações
          setFirestoreDocMap(prev => ({ ...prev, [result.orderId]: result.docId }));

          // Se não tinha encontrado o pedido localmente, buscar agora
          if (!order) {
            order = orders.find(o => o.id === result.orderId);
          }
        }
      }

      // PASSO 3: Se ainda não temos o pedido, é erro fatal
      if (!order) {
        throw new Error(`Pedido não encontrado para itemId=${itemId}`);
      }

      if (!order.itemsWithStatus) {
        throw new Error('Pedido não possui itemsWithStatus');
      }

      // Verificar se o item existe
      const itemFound = order.itemsWithStatus.some(item => item.id === itemId);
      if (!itemFound) {
        throw new Error(`Item ${itemId} não encontrado no pedido ${actualOrderId}`);
      }

      // PASSO 4: Preparar payload de atualização
      const now = new Date().toISOString();

      const updatedItems = order.itemsWithStatus.map(item => {
        if (item.id === itemId) {
          return {
            ...item,
            status: newStatus,
            checked: newStatus === 'pronto',
            timestamp: now
          };
        }
        return item;
      });

      // Detectar se TODOS os itens estão prontos
      const allItemsChecked = updatedItems.every(item => item.checked === true);

      updatePayload = {
        itemsWithStatus: updatedItems
      };

      // Se todos os itens estão prontos E timeInProntos ainda é null, adicionar
      if (allItemsChecked && !order.timeInProntos) {
        updatePayload.timeInProntos = now;
      }

      // PASSO 5: Atualizar estado local (otimista) com timestamp de atualização
      setOrders(prevOrders =>
        prevOrders.map(o =>
          o.id === actualOrderId
            ? {
              ...o,
              ...updatePayload,
              // ✅ CORREÇÃO: Adicionar timestamp de atualização local
              atualizado: now
            }
            : o
        )
      );

      // PASSO 6: Atualizar no Firestore
      if (isOnline && updatePayload) {
        if (firestoreDocId) {
          await OrderFirestoreService.updateOrder(user.companyId, firestoreDocId, updatePayload);
        } else {
          // Última tentativa: buscar por orderId
          const docId = await OrderFirestoreService.findDocIdByOrderId(user.companyId, actualOrderId);
          if (docId) {
            await OrderFirestoreService.updateOrder(user.companyId, docId, updatePayload);
            setFirestoreDocMap(prev => ({ ...prev, [actualOrderId]: docId }));
          } else {
            // Fallback final: buscar por itemId
            const result = await OrderFirestoreService.findDocByItemId(user.companyId, itemId);
            if (result) {
              await OrderFirestoreService.updateOrder(user.companyId, result.docId, updatePayload);
              setFirestoreDocMap(prev => ({ ...prev, [result.orderId]: result.docId }));
            } else {
              throw new Error(`Documento Firestore não encontrado para itemId=${itemId}`);
            }
          }
        }
      }
    } catch (error) {
      throw error;
    }
  }, [orders, firestoreDocMap, isOnline]);

  // Marcar item individual como entregue
  const markItemAsDelivered = useCallback(async (orderId, itemId) => {
    try {
      const order = OrderService.findOrderById(orders, orderId);
      if (!order || !order.itemsWithStatus) {
        throw new Error('Pedido ou itemsWithStatus não encontrado');
      }

      const now = new Date().toISOString();

      // Atualizar item - adicionar campo delivered
      const updatedItems = order.itemsWithStatus.map(item =>
        item.id === itemId
          ? { ...item, delivered: true, deliveredAt: now, timestamp: now }
          : item
      );

      // Verificar se todos os itens foram entregues
      const allDelivered = updatedItems.every(item => item.delivered === true);

      // ✅ CORREÇÃO: Sempre garantir que timeInProntos existe
      const updatePayload = {
        itemsWithStatus: updatedItems,
        timeInProntos: order.timeInProntos || now, // Garantir que sempre tenha
      };

      // Se todos os itens foram entregues, mudar status do pedido para 'delivered'
      if (allDelivered) {
        updatePayload.status = 'delivered';
        updatePayload.deliveredAt = now;
        updatePayload.entreguePor = user?.id || null;
        updatePayload.entreguePorNome = user?.nome || null;
      }

      // Atualizar estado local primeiro (otimista)
      setOrders(prevOrders =>
        prevOrders.map(o =>
          o.id === orderId
            ? {
              ...o,
              ...updatePayload,
              // ✅ CORREÇÃO: Adicionar timestamp de atualização local
              atualizado: now
            }
            : o
        )
      );

      const firestoreDocId = firestoreDocMap[orderId];
      if (isOnline && firestoreDocId) {
        await OrderFirestoreService.updateOrder(user.companyId, firestoreDocId, updatePayload);
      }
    } catch (error) {
      throw error;
    }
  }, [orders, firestoreDocMap, isOnline, user]);

  // MÉTODO DE TESTE - Adicionar pedido local para debug
  const addTestOrder = useCallback(() => {
    const testOrder = {
      id: '#TEST',
      client: 'Cliente Teste',
      comandaNumber: '999',
      items: ['Cupim Completo', 'Refri Lata'],
      observations: 'Pedido de teste',
      status: 'montagem',
      createdAt: new Date().toISOString(),
      timestamp: new Date().toISOString(),
      timeInCozinha: new Date().toISOString(),
      timeInMontagem: new Date().toISOString(),
      timeInProntos: null,
      deliveredAt: null,
      totalPrice: 17.99,
      createdBy: 'test',
      createdByName: 'Teste',
    };
    setOrders(prev => [testOrder, ...prev]);
  }, []);

  // ==================== HOOKS DE ESTATÍSTICAS ====================

  /**
   * Hook para buscar estatísticas de um garçom específico ou todos
   * @param {string} garcomId - ID do garçom (null para todos)
   * @param {string} periodo - 'hoje', 'semana', 'mes'
   */
  const getEstatisticasGarcom = useCallback(async (garcomId = null, periodo = 'hoje') => {
    try {
      return await OrderFirestoreService.getEstatisticasGarcom(garcomId, periodo);
    } catch (error) {
      return OrderFirestoreService._getEmptyStats();
    }
  }, []);

  /**
   * Hook para buscar estatísticas de todos os garçons
   * @param {string} periodo - 'hoje', 'semana', 'mes'
   */
  const getEstatisticasTodosGarcons = useCallback(async (periodo = 'hoje') => {
    try {
      return await OrderFirestoreService.getEstatisticasTodosGarcons(periodo);
    } catch (error) {
      return [];
    }
  }, []);

  /**
   * Hook para buscar estatísticas de pagamentos por método
   * @param {string} garcomId - ID do garçom (null para todos)
   * @param {string} periodo - 'hoje', 'semana', 'mes'
   */
  const getEstatisticasPagamentos = useCallback(async (garcomId = null, periodo = 'hoje') => {
    try {
      return await OrderFirestoreService.getEstatisticasPagamentos(garcomId, periodo);
    } catch (error) {
      return {
        dinheiro: { total: 0, quantidade: 0 },
        pix: { total: 0, quantidade: 0 },
        debito: { total: 0, quantidade: 0 },
        credito: { total: 0, quantidade: 0 },
      };
    }
  }, []);

  /**
   * Hook para buscar estatísticas de comandas
   * @param {string} garcomId - ID do garçom (null para todos)
   * @param {string} periodo - 'hoje', 'semana', 'mes'
   */
  const getEstatisticasComandas = useCallback(async (garcomId = null, periodo = 'hoje') => {
    try {
      return await OrderFirestoreService.getEstatisticasComandas(garcomId, periodo);
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
  }, []);

  /**
   * Hook completo para buscar todas as estatísticas de um garçom
   * Retorna vendas + pagamentos + comandas para todos os períodos
   * @param {string} garcomId - ID do garçom (null para todos)
   * @param {string} mesAno - Mês específico no formato 'YYYY-MM' (null para mês vigente)
   */
  const getEstatisticasCompletas = useCallback(async (garcomId = null, mesAno = null) => {
    try {
      console.log('[OrderContext] getEstatisticasCompletas - garcomId:', garcomId, 'mesAno:', mesAno);

      // Se não especificou mês, usa o mês vigente
      const periodoMes = mesAno || 'mesVigente';

      const [
        hoje,
        semana,
        mes,
        pagamentosHoje,
        pagamentosSemana,
        pagamentosMes,
        comandasHoje,
        comandasSemana,
        comandasMes,
      ] = await Promise.all([
        OrderFirestoreService.getEstatisticasGarcom(user.companyId, garcomId, 'hoje'),
        OrderFirestoreService.getEstatisticasGarcom(user.companyId, garcomId, 'semana'),
        OrderFirestoreService.getEstatisticasGarcom(user.companyId, garcomId, periodoMes),
        OrderFirestoreService.getEstatisticasPagamentos(user.companyId, garcomId, 'hoje'),
        OrderFirestoreService.getEstatisticasPagamentos(user.companyId, garcomId, 'semana'),
        OrderFirestoreService.getEstatisticasPagamentos(user.companyId, garcomId, periodoMes),
        OrderFirestoreService.getEstatisticasComandas(user.companyId, garcomId, 'hoje'),
        OrderFirestoreService.getEstatisticasComandas(user.companyId, garcomId, 'semana'),
        OrderFirestoreService.getEstatisticasComandas(user.companyId, garcomId, periodoMes),
      ]);

      console.log('[OrderContext] Estatísticas vendas hoje:', hoje);
      console.log('[OrderContext] Estatísticas vendas semana:', semana);
      console.log('[OrderContext] Estatísticas vendas mes:', mes);

      return {
        vendas: { hoje, semana, mes },
        pagamentos: {
          hoje: pagamentosHoje,
          semana: pagamentosSemana,
          mes: pagamentosMes,
        },
        comandas: {
          hoje: comandasHoje,
          semana: comandasSemana,
          mes: comandasMes,
        },
      };
    } catch (error) {
      console.error('[OrderContext] Erro em getEstatisticasCompletas:', error);
      return {
        vendas: {
          hoje: OrderFirestoreService._getEmptyStats(),
          semana: OrderFirestoreService._getEmptyStats(),
          mes: OrderFirestoreService._getEmptyStats(),
        },
        pagamentos: {
          hoje: { dinheiro: { total: 0, quantidade: 0 }, pix: { total: 0, quantidade: 0 }, debito: { total: 0, quantidade: 0 }, credito: { total: 0, quantidade: 0 } },
          semana: { dinheiro: { total: 0, quantidade: 0 }, pix: { total: 0, quantidade: 0 }, debito: { total: 0, quantidade: 0 }, credito: { total: 0, quantidade: 0 } },
          mes: { dinheiro: { total: 0, quantidade: 0 }, pix: { total: 0, quantidade: 0 }, debito: { total: 0, quantidade: 0 }, credito: { total: 0, quantidade: 0 } },
        },
        comandas: {
          hoje: { total: 0, abertas: 0, fechadas: 0, totalConsumido: 0, totalPago: 0, saldoAberto: 0 },
          semana: { total: 0, abertas: 0, fechadas: 0, totalConsumido: 0, totalPago: 0, saldoAberto: 0 },
          mes: { total: 0, abertas: 0, fechadas: 0, totalConsumido: 0, totalPago: 0, saldoAberto: 0 },
        },
      };
    }
  }, []);

  // Memoizar o valor do contexto para evitar re-renders
  const contextValue = useMemo(() => ({
    orders,
    addOrder,
    editOrder,
    deleteOrder,
    moveToMontagem,
    moveToProntos,
    markAsDelivered,
    updateItemStatus,
    markItemAsDelivered,
    getOrdersByStatus,
    getOrderById,
    isOnline,
    addTestOrder,
    getEstatisticasGarcom,
    getEstatisticasTodosGarcons,
    getEstatisticasPagamentos,
    getEstatisticasComandas,
    getEstatisticasCompletas,
  }), [
    orders,
    addOrder,
    editOrder,
    deleteOrder,
    moveToMontagem,
    moveToProntos,
    markAsDelivered,
    updateItemStatus,
    markItemAsDelivered,
    getOrdersByStatus,
    getOrderById,
    isOnline,
    addTestOrder,
    getEstatisticasGarcom,
    getEstatisticasTodosGarcons,
    getEstatisticasPagamentos,
    getEstatisticasComandas,
    getEstatisticasCompletas,
  ]);

  return (
    <OrderContext.Provider value={contextValue}>
      {children}
    </OrderContext.Provider>
  );
};
