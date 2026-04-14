import { StatusBar } from 'expo-status-bar';
import LicenseGate from '../components/LicenseGate';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect, useCallback, memo, useRef, useMemo } from 'react';
import { useOrders } from '../context/OrderContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/SupabaseConfig';
import { getBusinessDateKey } from '../services/BusinessDateService';
import CaixaService from '../services/CaixaService';
import offlineQueueService from '../services/OfflineQueueService';
import { persistMontagemToggleItems } from '../services/MontagemSyncService';
import OrderService from '../services/OrderService';
import { colors } from '../theme/colors';
import { StateView } from '../ui';
import logger from '../utils/logger';

const formatClockLabel = (value?: string | null) => {
  if (!value) return '--:--';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--:--';

  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

const getOrderTimeReference = (order: any) => (
  order.displayTimeReference
  || order.timeInMontagem
  || order.time_in_montagem
  || order.timestamp
  || order.createdAt
  || order.created_at
  || null
);

const getElapsedTimeLabel = (reference: string | null | undefined, nowMs: number) => {
  if (!reference) return '--:--';

  const date = new Date(reference);
  if (Number.isNaN(date.getTime())) return '--:--';

  const diffMinutes = Math.max(0, Math.floor((nowMs - date.getTime()) / 60000));
  if (diffMinutes < 60) return `${diffMinutes}m`;

  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  return `${hours}h${String(minutes).padStart(2, '0')}`;
};

const isUrgent = (reference: string | null | undefined, nowMs: number) => {
  if (!reference) return false;

  const date = new Date(reference);
  if (Number.isNaN(date.getTime())) return false;

  const diffMinutes = (nowMs - date.getTime()) / 1000 / 60;
  return diffMinutes > 15;
};

const appendUniqueText = (items: string[] | undefined, value?: string | null) => {
  if (!value) return items || [];

  const normalizedValue = String(value).trim();
  if (!normalizedValue) return items || [];

  const nextItems = items ? [...items] : [];
  if (!nextItems.includes(normalizedValue)) {
    nextItems.push(normalizedValue);
  }

  return nextItems;
};

const getEarlierTime = (left?: string | null, right?: string | null) => {
  if (!left) return right || null;
  if (!right) return left;

  const leftDate = new Date(left);
  const rightDate = new Date(right);

  if (Number.isNaN(leftDate.getTime())) return right;
  if (Number.isNaN(rightDate.getTime())) return left;

  return leftDate.getTime() <= rightDate.getTime() ? left : right;
};

const getItemUiKey = (orderId: string, itemId: string, itemIndex: number) => (
  `${orderId}::${itemId}::${itemIndex}`
);

const createItemMutationId = (orderId: string, itemId: string) => (
  `${orderId}:${itemId}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`
);

const isActiveMontagemItem = (item: any) => {
  const status = String(item?.status || '').trim().toLowerCase();
  return status !== 'cancelled' && status !== 'cancelada' && status !== 'cancelado';
};

// Componente OrderCard memoizado
interface OrderCardProps {
  order: any;
  onToggleItem: (orderId: string, itemIds: string | string[], status: string) => void;
  onMarkReady: (order: any) => void;
  nowMs: number;
}

const OrderCard = memo(({ order, onToggleItem, onMarkReady, nowMs }: OrderCardProps) => {
  const timeReference = getOrderTimeReference(order);
  const urgent = isUrgent(timeReference, nowMs);
  const activeItems = order.itemsWithStatus?.filter((item: any) => isActiveMontagemItem(item)) || [];
  const allItemsDone = activeItems.length > 0
    ? activeItems.every((item: any) => item.checked === true)
    : true;
  const orderTitle = order.orderType === 'delivery'
    ? `Delivery ${order.comandaNumber || '?'}`
    : order.isMesaGroup
      ? `Mesa ${order.mesa}`
      : `Comanda ${order.comandaNumber || '?'}`;
  const orderComandasLabel = order.isMesaGroup && order.allComandas && order.allComandas.length > 0
    ? `Comandas: ${order.allComandas.join(', ')}`
    : null;
  const orderTimeLabel = getElapsedTimeLabel(timeReference, nowMs);
  const createdByLabel = order.allCreatorNames?.length
    ? order.allCreatorNames.join(', ')
    : (order.criadoPorNome || order.createdByName || '');
  const receivedFromLabel = order.allMovedByNames?.length
    ? order.allMovedByNames.join(', ')
    : (order.movidoParaMontagemPorNome || '');

  const handleReadyPress = useCallback((e: any) => {
    e.stopPropagation();
    onMarkReady(order);
  }, [order, onMarkReady]);

  return (
    <View
      style={[styles.orderCard, urgent && styles.orderCardUrgent]}
    >
      <View style={styles.orderHeader}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={styles.orderNumber}>{orderTitle}</Text>
          {orderComandasLabel ? (
            <Text style={styles.orderComandas}>{orderComandasLabel}</Text>
          ) : null}
        </View>
        <Text style={styles.orderTime}>{orderTimeLabel}</Text>
      </View>
      <Text style={styles.orderClient}>{order.client}</Text>
      {!!createdByLabel && (
        <Text style={styles.garcomText}>👤 Pedido por: {createdByLabel}</Text>
      )}
      {!!receivedFromLabel && (
        <Text style={styles.movimentadoPorText}>🔧 Recebido de: {receivedFromLabel}</Text>
      )}
      <Text style={styles.orderTimeHint}>Entrada: {formatClockLabel(timeReference)}</Text>
      {!!order.observations && (
        <Text style={styles.orderObs}>📝 Obs: {order.observations}</Text>
      )}
      <View style={styles.orderItems}>
        {activeItems.length > 0 ? (
          activeItems.map((item: any) => {
            const parts = item.name.split(' + ');
            const mainName = parts[0];
            const extras = parts.length > 1 ? parts.slice(1).join(' + ') : null;
            const isPendingSync = !!item._isPendingSync;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.orderItem, isPendingSync && styles.orderItemPending]}
                onPress={() => onToggleItem(item.originalOrderId || order.id, [item.id], item.status)}
                activeOpacity={0.7}
                disabled={isPendingSync}
              >
                <View style={[
                  styles.checkbox,
                  isPendingSync && styles.checkboxPending,
                  !!item.checked && styles.checkboxChecked
                ]}>
                  {isPendingSync ? <Text style={styles.pendingMark}>...</Text> : (!!item.checked && <Text style={styles.checkmark}>✓</Text>)}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[
                    styles.itemText,
                    isPendingSync && styles.itemTextPending,
                    item.checked && styles.itemTextDone
                  ]}>
                    {mainName}
                  </Text>
                  {extras && (
                    <Text style={[
                      styles.itemExtras,
                      isPendingSync && styles.itemTextPending,
                      item.checked && styles.itemTextDone
                    ]}>
                      + {extras}
                    </Text>
                  )}
                  {isPendingSync ? (
                    <Text style={styles.itemPendingText}>Sincronizando...</Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })
        ) : (
          order.items?.map((item: string, idx: number) => (
            <View key={idx} style={styles.orderItem}>
              <View style={[styles.itemDot, idx % 2 === 1 && styles.itemDotSecondary]} />
              <Text style={styles.itemText}>{item}</Text>
            </View>
          ))
        )}
      </View>
      <TouchableOpacity
        style={[
          styles.readyBtn,
          !allItemsDone && styles.readyBtnDisabled
        ]}
        disabled={!allItemsDone}
        onPress={handleReadyPress}
      >
        <Text style={styles.readyBtnText}>
          {allItemsDone ? 'PEDIDO MONTADO' : 'MARQUE TODOS OS ITENS'}
        </Text>
      </TouchableOpacity>
    </View>
  );
});
OrderCard.displayName = 'OrderCard';

export default function MontagemScreen() {
  useOrders(); // mantido para não quebrar contexto
  const { user, hasPermission, Permissions } = useAuth();
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState<boolean>(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  // ✅ Guarda IDs marcados como prontos nesta sessão para proteger contra race condition do Realtime
  const locallyMarkedReady = useRef<Set<string>>(new Set());
  // ✅ Contador de sequência para descartar resultados de fetchOrders obsoletos (race condition)
  const fetchSeq = useRef(0);
  // ✅ Preserva toggle otimista por item durante a janela inicial de realtime/fetch concorrente
  const pendingItemOverrides = useRef<Map<string, { checked: boolean; timestamp: string; mutationId: string; queueOperationId?: string }>>(new Map());
  const realtimeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 30000);

    return () => clearInterval(timer);
  }, []);

  // Initial fetch — busca APENAS pedidos em 'preparing' para evitar race conditions
  const fetchOrders = useCallback(async (silent = false) => {
    if (!user?.companyId) {
      setAllOrders([]);
      setOrdersError(null);
      return;
    }

    if (!silent) {
      setIsLoadingOrders(true);
    }
    setOrdersError(null);

    try {
      const seq = ++fetchSeq.current;
      const queuedOperationIds = new Set(offlineQueueService.getOperations().map(op => op.id));
      const today = await getBusinessDateKey(user.companyId);

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          profiles:created_by (
            full_name
          )
        `)
        .eq('company_id', user.companyId)
        .eq('date_key', today)
        .eq('status', 'preparing');

      if (seq !== fetchSeq.current) return;
      if (error) throw error;

      const comandaNumbers = Array.from(new Set(
        (data || [])
          .map(order => Number(order.comanda_number))
          .filter(value => Number.isFinite(value) && value > 0)
      ));

      const comandaCreatorsMap = new Map<string, string>();
      if (comandaNumbers.length > 0) {
        const { data: comandasData, error: comandasError } = await supabase
          .from('comandas')
          .select('date_key, comanda_number, opened_by_name')
          .eq('company_id', user.companyId)
          .eq('date_key', today)
          .in('comanda_number', comandaNumbers);

        if (seq !== fetchSeq.current) return;
        if (!comandasError && comandasData) {
          comandasData.forEach(comanda => {
            comandaCreatorsMap.set(`${comanda.date_key}:${comanda.comanda_number}`, comanda.opened_by_name || '');
          });
        }
      }

      const mappedOrders = (data || [])
        .filter(order => !locallyMarkedReady.current.has(order.id))
        .map(order => {
          const timeReference = order.time_in_montagem || order.created_at || null;
          const fallbackCreatorName = comandaCreatorsMap.get(`${order.date_key || today}:${order.comanda_number}`) || '';
          const createdByName = order.profiles?.full_name || fallbackCreatorName || '';

          return {
            ...order,
            itemsWithStatus: (order.items_with_status || []).map((item: any, itemIndex: number) => {
              const uiKey = getItemUiKey(order.id, item.id, itemIndex);
              const pendingOverride = pendingItemOverrides.current.get(uiKey);

              if (pendingOverride) {
                const isConfirmedRemotely =
                  item.checked === pendingOverride.checked &&
                  item.clientMutationId === pendingOverride.mutationId;
                const wasQueuedButRemoved = !!pendingOverride.queueOperationId
                  && !queuedOperationIds.has(pendingOverride.queueOperationId);

                if (isConfirmedRemotely || wasQueuedButRemoved) {
                  pendingItemOverrides.current.delete(uiKey);
                }
              }

              const activeOverride = pendingItemOverrides.current.get(uiKey);

              return {
                ...item,
                checked: activeOverride ? activeOverride.checked : item.checked,
                timestamp: activeOverride ? activeOverride.timestamp : item.timestamp,
                _isPendingSync: !!activeOverride,
                id: uiKey,
                _originalItemId: item.id,
                _itemIndex: itemIndex,
                originalOrderId: order.id
              };
            }),
            comandaNumber: order.comanda_number,
            mesa: (order.table_number && order.table_number !== 0) ? order.table_number.toString() : '',
            comandaStatus: order.comanda_status,
            orderType: order.order_type || order.orderType || 'local',
            client: order.client_name || order.client || 'Cliente',
            timestamp: timeReference,
            createdAt: order.created_at,
            horarioCriacao: formatClockLabel(timeReference),
            timeInMontagem: order.time_in_montagem || null,
            createdByName,
            criadoPorNome: createdByName,
            movidoParaMontagemPorNome: order.movido_para_montagem_por_nome || order.movidoParaMontagemPorNome || null,
            displayTimeReference: timeReference,
            allCreatorNames: createdByName ? [createdByName] : [],
            allMovedByNames: order.movido_para_montagem_por_nome ? [order.movido_para_montagem_por_nome] : []
          };
        });

      setAllOrders(mappedOrders);
    } catch (error: any) {
      logger.error('[MontagemScreen] failed to load orders for assembly queue', error);
      setOrdersError(error?.message || 'Falha ao carregar pedidos da montagem.');
      setAllOrders([]);
    } finally {
      if (!silent) {
        setIsLoadingOrders(false);
      }
    }
  }, [user?.companyId]);

  const scheduleRealtimeRefresh = useCallback(() => {
    if (realtimeDebounceRef.current) {
      clearTimeout(realtimeDebounceRef.current);
    }

    realtimeDebounceRef.current = setTimeout(() => {
      fetchOrders(true);
    }, 300);
  }, [fetchOrders]);


  // ✅ TEMPO REAL: Listener para multi-usuários
  useEffect(() => {
    fetchOrders();

    if (!user?.companyId) return;

    const channel = supabase
      .channel(`orders-montagem-${user.companyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `company_id=eq.${user.companyId}`
        },
        () => {
          scheduleRealtimeRefresh();
        }
      )
      .subscribe();

    return () => {
      if (realtimeDebounceRef.current) {
        clearTimeout(realtimeDebounceRef.current);
      }
      channel.unsubscribe();
    };
  }, [user?.companyId, fetchOrders, scheduleRealtimeRefresh]);

  // ✅ FILTRO SEGURO: Excluir pedidos de comandas canceladas usando comandaStatus do pedido
  const ordersRaw = useMemo(() => allOrders.filter(order => {
    // Filtrar apenas pedidos em preparing
    if (order.status !== 'preparing') return false;

    if (OrderService.shouldBypassOperationalQueues(order)) {
      return false;
    }

    // ✅ PROTEÇÃO: Se o pedido tem comandaStatus='cancelada', não mostrar
    if (order.comandaStatus === 'cancelada') return false;

    return true;
  }), [allOrders]);

  const orders = useMemo(() => {
    // Agrupar por comandaNumber para unificar pedidos da mesma comanda
    const comandasMap = new Map();

    ordersRaw.forEach(order => {
      if (!order.itemsWithStatus || order.itemsWithStatus.length === 0) {
        return;
      }

      // ✅ FIX: Não filtrar itens duplicados entre pedidos diferentes
      // Cada pedido delivery deve ter seus próprios itens, mesmo que sejam iguais
      const itemsParaMontar = order.itemsWithStatus
        .filter((item: any) => isActiveMontagemItem(item))
        .map((item: any) => ({
          ...item,
          originalOrderId: order.id
        }));

      if (itemsParaMontar.length === 0) return;

      // ✅ LÓGICA DE AGRUPAMENTO:
      // 1. MESA: Agrupar todos os pedidos da mesma mesa (vários pedidos → 1 card)
      // 2. BALCÃO COM COMANDA: Agrupar pedidos da mesma comanda (vários pedidos → 1 card)
      // 3. DELIVERY: Cada pedido é um card separado (1 pedido → 1 card) - NUNCA agrupar
      const hasMesa = !!order.mesa && order.mesa.trim() !== '';
      const hasComanda = order.comandaNumber && String(order.comandaNumber) !== '0';
      const isDelivery = order.orderType === 'delivery';

      let groupKey;
      if (isDelivery) {
        // DELIVERY: Sempre separado, um card por pedido
        groupKey = `order-${order.id}`;
      } else if (hasMesa) {
        // MESA: Agrupar por número da mesa
        groupKey = `mesa-${order.mesa}`;
      } else if (hasComanda) {
        // BALCÃO COM COMANDA: Agrupar por número da comanda
        groupKey = `comanda-${order.comandaNumber}`;
      } else {
        // BALCÃO SEM COMANDA: Cada pedido é separado
        groupKey = `order-${order.id}`;
      }

      if (comandasMap.has(groupKey)) {
        const existing = comandasMap.get(groupKey);
        existing.itemsWithStatus.push(...itemsParaMontar);
        existing.items.push(...itemsParaMontar.map((i: any) => i.name));
        existing.allCreatorNames = appendUniqueText(existing.allCreatorNames, order.criadoPorNome || order.createdByName);
        existing.allMovedByNames = appendUniqueText(existing.allMovedByNames, order.movidoParaMontagemPorNome);
        existing.displayTimeReference = getEarlierTime(existing.displayTimeReference, getOrderTimeReference(order));
        existing.timestamp = existing.displayTimeReference;
        existing.horarioCriacao = formatClockLabel(existing.displayTimeReference);
        if (!existing.allOrderIds.includes(order.id)) {
          existing.allOrderIds.push(order.id);
        }
        // Se tiver mesa, garantir que o número da comanda seja concatenado se for diferente
        if (order.comandaNumber && order.comandaNumber !== 0 && !existing.allComandas.includes(order.comandaNumber)) {
          existing.allComandas.push(order.comandaNumber);
        }
      } else {
        comandasMap.set(groupKey, {
          ...order,
          isMesaGroup: hasMesa,
          itemsWithStatus: [...itemsParaMontar],
          items: itemsParaMontar.map((i: any) => i.name),
          allOrderIds: [order.id],
          allComandas: (order.comandaNumber && order.comandaNumber !== 0) ? [order.comandaNumber] : [],
          allCreatorNames: appendUniqueText([], order.criadoPorNome || order.createdByName),
          allMovedByNames: appendUniqueText([], order.movidoParaMontagemPorNome),
          displayTimeReference: getOrderTimeReference(order)
        });
      }
    });

    return Array.from(comandasMap.values())
      .sort((a: any, b: any) => {
        const numA = parseInt(a.comandaNumber) || 0;
        const numB = parseInt(b.comandaNumber) || 0;
        return numA - numB;
      });
  }, [ordersRaw]);

  const handleToggleItem = async (_orderId: string, itemIds: string | string[], _currentStatus: string) => {
    const idsToUpdate = Array.isArray(itemIds) ? itemIds : [itemIds];

    if (idsToUpdate.some((uiKey: string) => pendingItemOverrides.current.has(String(uiKey)))) {
      return;
    }
    
    // Validar se caixa está aberto
    try {
      const caixaAberto = await CaixaService.getCaixaAberto(user?.companyId);
      if (!caixaAberto) {
        if (Platform.OS === 'web') window.alert('Caixa Fechado: É necessário abrir o caixa.');
        else Alert.alert('Caixa Fechado', 'É necessário abrir o caixa antes de marcar itens.');
        return;
      }
    } catch (e) {
      logger.error('[MontagemScreen] failed to verify open caixa before toggle', e);
    }

    try {
      // 1. Extrair Pedido Real + Item Real de dentro do "Composto" (orderId::itemId)
      //    Os idsToUpdate são SEMPRE compostos: "<UUID_pedido>::<id_item_banco>"
      const updatesByRealOrder: Record<string, { realItemIds: string[], uiKeys: string[] }> = {};
      
      idsToUpdate.forEach(compoundId => {
        const parts = String(compoundId).split('::');
        if (parts.length >= 2) {
          const rOrderId = parts[0];
          const rItemId = parts[1];
          if (!updatesByRealOrder[rOrderId]) updatesByRealOrder[rOrderId] = { realItemIds: [], uiKeys: [] };
          updatesByRealOrder[rOrderId].realItemIds.push(rItemId);
          updatesByRealOrder[rOrderId].uiKeys.push(compoundId);
        }
      });

      if (Object.keys(updatesByRealOrder).length === 0) {
        logger.warn('[MontagemScreen] no valid compound item ids received for toggle');
        return;
      }

      // ✅ FIX: Validate that all compound IDs belong to the same order
      // This prevents cross-marking if groupedIds somehow got mixed
      const orderIds = Object.keys(updatesByRealOrder);
      if (orderIds.length > 1) {
        logger.error('[MontagemScreen] attempted toggle across multiple orders', new Error('multiple_order_toggle'));
        return;
      }

      // ✅ FIX: Use functional setState to access current state instead of stale closure
      // This ensures we always work with the most up-to-date order data
      let newChecked = false;
      const itemsToSaveByOrder: Record<string, any[]> = {};
      const mutationIdByUiKey: Record<string, string> = {};

      setAllOrders(prevOrders => {
        // 2. Descobrir qual o NOVO ESTADO baseado no estado atual do primeiro item em prevOrders
        const firstRealOrderId = Object.keys(updatesByRealOrder)[0];
        const firstCompoundId = updatesByRealOrder[firstRealOrderId].uiKeys[0];
        const sourceOrder = prevOrders.find(o => o.id === firstRealOrderId);
        
        if (!sourceOrder) {
          logger.error('[MontagemScreen] source order not found for toggle', new Error('source_order_not_found'));
          return prevOrders; // Abort update
        }
        
        const sourceItem = sourceOrder.itemsWithStatus.find((i: any) => i.id === firstCompoundId);
        if (!sourceItem) {
          logger.error('[MontagemScreen] source item not found for toggle', new Error('source_item_not_found'));
          return prevOrders; // Abort update
        }
        
        newChecked = !sourceItem?.checked;

        // 3. ATUALIZAÇÃO OTIMISTA LOCAL — usa os IDs COMPOSTOS para identificar os itens no estado
        const now = new Date().toISOString();
        Object.values(updatesByRealOrder).forEach(({ uiKeys }) => {
          uiKeys.forEach((uiKey: string) => {
            const parts = String(uiKey).split('::');
            const mutationId = createItemMutationId(parts[0] || 'order', parts[1] || 'item');
            mutationIdByUiKey[uiKey] = mutationId;
            pendingItemOverrides.current.set(uiKey, {
              checked: newChecked,
              timestamp: now,
              mutationId
            });
          });
        });

        const updatedOrders = prevOrders.map(o => {
          const entry = updatesByRealOrder[o.id];
          if (!entry) return o;
          
          const updatedOrder = {
            ...o,
            itemsWithStatus: o.itemsWithStatus.map((i: any) => 
              entry.uiKeys.includes(i.id) ? { ...i, checked: newChecked, timestamp: now, _isPendingSync: true } : i
            )
          };

          // Preparar dados para persistência no Supabase
          itemsToSaveByOrder[o.id] = updatedOrder.itemsWithStatus.map((i: any) => {
            const fallbackOriginalItemId = String(i.id).split('::')[1] || i.id;
            const isTarget = entry.uiKeys.includes(i.id);
            return {
              // Salvar com o ID ORIGINAL do banco (sem o prefixo UUID::)
              ...i,
              id: i._originalItemId || fallbackOriginalItemId,
              _originalItemId: undefined, // Limpar campo auxiliar
              _itemIndex: undefined,
              _isPendingSync: undefined,
              originalOrderId: undefined, // Limpar campo auxiliar
              clientMutationId: isTarget ? mutationIdByUiKey[i.id] : i.clientMutationId,
              checked: isTarget ? newChecked : i.checked,
              timestamp: isTarget ? now : i.timestamp
            };
          });

          return updatedOrder;
        });

        return updatedOrders;
      });

      // ✅ FIX: Validate that itemsToSaveByOrder was populated before persisting
      if (Object.keys(itemsToSaveByOrder).length === 0) {
        logger.error('[MontagemScreen] no items prepared for persistence in toggle', new Error('empty_persist_payload'));
        return;
      }

      // 4. PERSISTIR NO SUPABASE DIRETAMENTE — sem passar pelo OrderContext
      //    Usa os dados preparados durante a atualização do estado
      const now = new Date().toISOString();
      const persistPromises = Object.entries(itemsToSaveByOrder).map(async ([realOrderId, itemsToSave]) => {
        // Merge defensivo com estado mais recente do banco para evitar sobrescrita concorrente
        const entry = updatesByRealOrder[realOrderId];
        const targetMeta = (entry?.uiKeys || []).map((uiKey: string) => {
          const parts = String(uiKey).split('::');
          return {
            originalItemId: parts[1],
            itemIndex: Number(parts[2])
          };
        });

        const { data: latestOrder, error: fetchError } = await supabase
          .from('orders')
          .select('items_with_status')
          .eq('id', realOrderId)
          .eq('company_id', user?.companyId)
          .single();

        if (fetchError || !latestOrder?.items_with_status || !Array.isArray(latestOrder.items_with_status)) {
          logger.error('[MontagemScreen] failed to fetch latest items_with_status before merge', fetchError || new Error('missing_items_with_status'));
          throw new Error('Falha ao buscar estado atual do pedido para merge seguro.');
        }

        let payloadItems: any[] = latestOrder.items_with_status;

        if (targetMeta.length > 0) {
          const mergedItems = [...latestOrder.items_with_status];
          const usedIndexes = new Set<number>();

          targetMeta.forEach(({ originalItemId, itemIndex }: { originalItemId: string; itemIndex: number }) => {
            if (!originalItemId) return;

            let targetIdx = -1;

            if (Number.isInteger(itemIndex) && itemIndex >= 0 && mergedItems[itemIndex]?.id === originalItemId) {
              targetIdx = itemIndex;
            } else {
              targetIdx = mergedItems.findIndex((ri: any, idx: number) => ri?.id === originalItemId && !usedIndexes.has(idx));
            }

            if (targetIdx >= 0) {
              usedIndexes.add(targetIdx);
              mergedItems[targetIdx] = {
                ...mergedItems[targetIdx],
                clientMutationId: mutationIdByUiKey[entry.uiKeys.find((uiKey: string) => {
                  const parts = String(uiKey).split('::');
                  return parts[1] === originalItemId && Number(parts[2]) === itemIndex;
                }) || ''] || mergedItems[targetIdx].clientMutationId,
                checked: newChecked,
                timestamp: now
              };
            }
          });

          payloadItems = mergedItems;
        }
        
        const persistResult = await persistMontagemToggleItems({
          orderId: realOrderId,
          companyId: user?.companyId,
          payloadItems,
          updatedAt: now,
          checked: newChecked,
          targetUiKeys: entry?.uiKeys || [],
          mutationIds: (entry?.uiKeys || []).map((uiKey: string) => mutationIdByUiKey[uiKey]).filter(Boolean)
        });

        if (persistResult.queueOperationId) {
          (entry?.uiKeys || []).forEach((uiKey: string) => {
            const pending = pendingItemOverrides.current.get(uiKey);
            if (pending) {
              pendingItemOverrides.current.set(uiKey, { ...pending, queueOperationId: persistResult.queueOperationId });
            }
          });
        }
      });

      await Promise.all(persistPromises);
      logger.info('[MontagemScreen] toggle persistence completed successfully');

    } catch (error: any) {
      idsToUpdate.forEach((uiKey: string) => pendingItemOverrides.current.delete(String(uiKey)));
      logger.error('[MontagemScreen] unexpected error while toggling montagem item', error);
      if (Platform.OS === 'web') window.alert('Erro: ' + error.message);
      else Alert.alert('Erro', 'Não foi possível atualizar o item: ' + error.message);
      // Reverter em caso de erro real
      fetchOrders();
    }
  };

  const handleMarkReady = useCallback(async (order: any) => {
    // @ts-ignore
    if (!hasPermission || !hasPermission(Permissions.UPDATE_STATUS)) {
      Alert.alert('Sem permissão', 'Seu usuário não pode atualizar status dos pedidos.');
      return;
    }

    try {
      const orderIds = order.allOrderIds || [order.id];

      // Bloqueio otimista
      orderIds.forEach((id: string) => locallyMarkedReady.current.add(id));
      setAllOrders(prev => prev.filter(o => !orderIds.includes(o.id)));

      // Gravação direta no Supabase
      const { error } = await supabase
        .from('orders')
        .update({ status: 'ready', updated_at: new Date().toISOString() })
        .in('id', orderIds)
        .eq('company_id', user?.companyId);

      if (error) throw error;

      logger.info('[MontagemScreen] order marked as ready successfully');
    } catch (error: any) {
      logger.error('[MontagemScreen] failed to mark order as ready', error);
      Alert.alert('Erro', 'Não foi possível salvar no banco: ' + error.message);
      // Reverter estado local em caso de erro real
      fetchOrders();
    }
  }, [hasPermission, Permissions, user, fetchOrders]);

  // Componente de lista vazia memoizado
  const ListEmptyComponent = useCallback(() => (
    <StateView
      state="empty"
      message="Nenhum pedido para montar"
      details="Os pedidos da cozinha aparecerão aqui"
      onRetry={() => fetchOrders()}
    />
  ), [fetchOrders]);

  // RenderItem memoizado
  const renderItem = useCallback(({ item }: { item: any }) => (
    <OrderCard
      order={item}
      onToggleItem={handleToggleItem}
      onMarkReady={handleMarkReady}
      nowMs={nowMs}
    />
  ), [handleToggleItem, handleMarkReady, nowMs]);

  // KeyExtractor memoizado
  const keyExtractor = useCallback((item: any) => item.id, []);

  return (
    <LicenseGate>
    <View style={styles.container}>


      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft} />
        <View style={styles.headerCenter}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="layers-outline" size={24} color={colors.white} style={{ marginRight: 8 }} />
            <Text style={styles.headerTitle}>Montagem</Text>
          </View>
          {!!user && <Text style={styles.userInfo}>Operador: {user.nome || user.email}</Text>}
        </View>
        <View style={styles.logoutBtn} />
      </View>

      <View
        {...(Platform.OS === 'web' ? ({ 'aria-live': 'polite' } as any) : {})}
        style={styles.liveRegionContainer}
      >
        <Text style={styles.liveRegionText}>
          {orders.length > 0
            ? `${orders.length} pedidos em montagem atualizados em tempo real.`
            : 'Nenhum pedido em montagem no momento.'}
        </Text>
      </View>

      {isLoadingOrders ? (
        <View style={styles.stateContainer}>
          <StateView state="loading" message="Carregando pedidos da montagem..." skeletonRows={4} />
        </View>
      ) : ordersError ? (
        <View style={styles.stateContainer}>
          <StateView state="error" message={ordersError} onRetry={() => fetchOrders()} />
        </View>
      ) : (
        <FlatList
          data={orders}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          ListEmptyComponent={ListEmptyComponent}
          style={styles.list}
          contentContainerStyle={styles.content}
          initialNumToRender={8}
          windowSize={3}
          maxToRenderPerBatch={5}
          updateCellsBatchingPeriod={100}
          removeClippedSubviews={true}
        />
      )}

      <StatusBar style="light" />
    </View>
    </LicenseGate>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primary,
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    zIndex: 10,
    elevation: 8,
    ...Platform.select({
      web: { boxShadow: '0px 4px 15px rgba(0, 0, 0, 0.2)' },
      // @ts-ignore
      default: { shadowColor: colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 15 }
    }),
  },
  headerLeft: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  userInfoLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
  },
  userInfo: {
    color: colors.userInfo,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  logoutBtn: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
    padding: 5,
  },

  list: {
    flex: 1,
    width: '100%',
  },
  content: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 100,
  },
  stateContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  liveRegionContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  liveRegionText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  orderCard: {
    backgroundColor: colors.white,
    borderRadius: 15,
    padding: 18,
    marginBottom: 15,
    ...Platform.select({
      web: { boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.06)' },
      default: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
      }
    }),
    borderWidth: 1,
    borderColor: colors.surfaceMuted,
    width: '100%',
  },
  orderCardUrgent: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.secondary,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
  },
  orderComandas: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
    marginTop: 2,
  },
  orderTime: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
    backgroundColor: colors.warning,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  orderClient: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  garcomText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: 6,
  },
  movimentadoPorText: {
    fontSize: 13,
    color: colors.warning,
    fontStyle: 'italic',
    marginBottom: 6,
  },
  orderTimeHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  orderObs: {
    fontSize: 14,
    fontStyle: 'italic',
    color: colors.warning,
    fontWeight: 'bold',
    marginBottom: 10,
    paddingLeft: 10,
    backgroundColor: colors.warningSurface,
    padding: 8,
    borderRadius: 8,
  },
  orderItems: {
    marginBottom: 15,
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  orderItemPending: {
    opacity: 0.72,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.primary,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  checkboxPending: {
    borderColor: colors.warning,
    backgroundColor: colors.warningSurface,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pendingMark: {
    color: colors.warning,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  checkmark: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  itemDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginRight: 10,
  },
  itemDotSecondary: {
    backgroundColor: colors.secondary,
  },
  itemText: {
    fontSize: 16, // Increased size
    color: colors.text,
    fontWeight: '600',
  },
  itemTextPending: {
    color: colors.warning,
  },
  itemExtras: {
    fontSize: 14,
    color: colors.danger,
    fontWeight: 'bold',
    marginTop: 2,
    fontStyle: 'italic',
  },
  itemTextReady: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
    fontWeight: '600',
  },
  itemTextDone: {
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  itemPendingText: {
    fontSize: 12,
    color: colors.warning,
    fontWeight: '600',
    marginTop: 4,
  },
  readyBtn: {
    backgroundColor: colors.primary,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    ...Platform.select({
      web: { boxShadow: '0px 3px 10px rgba(139, 47, 47, 0.2)' },
      default: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 3,
      }
    }),
  },
  readyBtnDisabled: {
    backgroundColor: colors.textSecondary,
    shadowOpacity: 0,
    elevation: 0,
  },
  readyBtnText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },

  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
