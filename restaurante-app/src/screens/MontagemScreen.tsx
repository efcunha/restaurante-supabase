import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Alert, Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useState, useEffect, useCallback, memo, useRef, useMemo } from 'react';
import { useOrders } from '../context/OrderContext';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../config/SupabaseConfig';
import { getLocalDateKey } from '../utils/dateUtils';
import CaixaService from '../services/CaixaService';
import offlineQueueService from '../services/OfflineQueueService';
import { persistMontagemToggleItems } from '../services/MontagemSyncService';
import { colors } from '../theme/colors';

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
  const allItemsDone = order.itemsWithStatus && order.itemsWithStatus.length > 0
    ? order.itemsWithStatus.every((item: any) => item.checked === true)
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
        {order.itemsWithStatus && order.itemsWithStatus.length > 0 ? (
          order.itemsWithStatus.filter((item: any) => item.status !== 'cancelled').map((item: any) => {
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
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [nowMs, setNowMs] = useState(() => Date.now());

  // ✅ Guarda IDs marcados como prontos nesta sessão para proteger contra race condition do Realtime
  const locallyMarkedReady = useRef<Set<string>>(new Set());
  // ✅ Contador de sequência para descartar resultados de fetchOrders obsoletos (race condition)
  const fetchSeq = useRef(0);
  // ✅ Preserva toggle otimista por item durante a janela inicial de realtime/fetch concorrente
  const pendingItemOverrides = useRef<Map<string, { checked: boolean; timestamp: string; mutationId: string; queueOperationId?: string }>>(new Map());

  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 30000);

    return () => clearInterval(timer);
  }, []);

  // Initial fetch — busca APENAS pedidos em 'preparing' para evitar race conditions
  const fetchOrders = useCallback(async () => {
    // @ts-ignore
    if (!user?.companyId) return;
    const seq = ++fetchSeq.current;
    const queuedOperationIds = new Set(offlineQueueService.getOperations().map(op => op.id));
    const today = getLocalDateKey();

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
      .eq('status', 'preparing'); // ✅ CRITICAL FIX: filtrar no banco, não só no cliente

    // ✅ RACE GUARD: se um fetchOrders mais recente foi disparado, descartar este resultado
    if (seq !== fetchSeq.current) return;

    if (!error && data) {
      const comandaNumbers = Array.from(new Set(
        data
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

      const mappedOrders = data
        .filter(order => !locallyMarkedReady.current.has(order.id))
        .map(order => {
          const timeReference = order.time_in_montagem || order.created_at || null;
          const fallbackCreatorName = comandaCreatorsMap.get(`${order.date_key || today}:${order.comanda_number}`) || '';
          const createdByName = order.profiles?.full_name || fallbackCreatorName || '';

          return {
          ...order,
          // ✅ ID COMPOSTO: garante unicidade por pedido, evitando colisão em delivery
          itemsWithStatus: (order.items_with_status || []).map((item: any, itemIndex: number) => {
            const uiKey = getItemUiKey(order.id, item.id, itemIndex);
            const pendingOverride = pendingItemOverrides.current.get(uiKey);

            if (pendingOverride) {
              const isConfirmedRemotely =
                item.checked === pendingOverride.checked &&
                item.clientMutationId === pendingOverride.mutationId;
              const wasQueuedButRemoved = !!pendingOverride.queueOperationId
                && !queuedOperationIds.has(pendingOverride.queueOperationId);

              if (isConfirmedRemotely) {
                pendingItemOverrides.current.delete(uiKey);
              } else if (wasQueuedButRemoved) {
                pendingItemOverrides.current.delete(uiKey);
              }
            }

            const activeOverride = pendingItemOverrides.current.get(uiKey);

            return {
              ...item,
              checked: activeOverride ? activeOverride.checked : item.checked,
              timestamp: activeOverride ? activeOverride.timestamp : item.timestamp,
              _isPendingSync: !!activeOverride,
              // ID composto de UI: orderId::itemId::index (garante unicidade mesmo com item.id repetido)
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
      
      // DEBUG: Log delivery orders to check comanda_number
      const deliveryOrders = mappedOrders.filter(o => o.orderType === 'delivery');
      if (deliveryOrders.length > 0) {
        console.log('[Montagem] 🚚 Pedidos delivery:', deliveryOrders.map(o => ({
          id: o.id.substring(0, 8),
          client: o.client,
          comandaNumber: o.comandaNumber,
          orderType: o.orderType
        })));
      }
      
      setAllOrders(mappedOrders);
    }
  }, [user]);

  // ✅ TEMPO REAL: Listener para multi-usuários
  useEffect(() => {
    fetchOrders();

    // @ts-ignore
    if (!user?.companyId) return;

    // Subscribe to real-time changes
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
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user]);

  // ✅ FILTRO SEGURO: Excluir pedidos de comandas canceladas usando comandaStatus do pedido
  const ordersRaw = useMemo(() => allOrders.filter(order => {
    // Filtrar apenas pedidos em preparing
    if (order.status !== 'preparing') return false;

    // ✅ PROTEÇÃO: Se o pedido tem comandaStatus='cancelada', não mostrar
    if (order.comandaStatus === 'cancelada') {
      console.log('[Montagem] 🚫 Pedido filtrado (comanda cancelada):', order.id);
      return false;
    }

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
      const itemsParaMontar = order.itemsWithStatus.map((item: any) => ({
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
      console.error('[Montagem] Erro ao verificar caixa:', e);
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
        console.warn('[Montagem] Nenhum ID composto válido (orderId::itemId) encontrado:', idsToUpdate);
        return;
      }

      // ✅ FIX: Validate that all compound IDs belong to the same order
      // This prevents cross-marking if groupedIds somehow got mixed
      const orderIds = Object.keys(updatesByRealOrder);
      if (orderIds.length > 1) {
        console.error('[Montagem] ❌ ERRO: Tentativa de marcar itens de múltiplos pedidos simultaneamente:', orderIds);
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
          console.error('[Montagem] ❌ ERRO: Pedido não encontrado no estado:', firstRealOrderId);
          return prevOrders; // Abort update
        }
        
        const sourceItem = sourceOrder.itemsWithStatus.find((i: any) => i.id === firstCompoundId);
        if (!sourceItem) {
          console.error('[Montagem] ❌ ERRO: Item não encontrado no pedido:', firstCompoundId);
          return prevOrders; // Abort update
        }
        
        newChecked = !sourceItem?.checked;

        console.log('[Montagem] ✅ Toggle direto ->', newChecked, 'pedido:', firstRealOrderId, 'item:', firstCompoundId);

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
        console.error('[Montagem] ❌ ERRO: Nenhum item preparado para salvar. Abortando persistência.');
        return;
      }

      // 4. PERSISTIR NO SUPABASE DIRETAMENTE — sem passar pelo OrderContext
      //    Usa os dados preparados durante a atualização do estado
      const now = new Date().toISOString();
      const persistPromises = Object.entries(itemsToSaveByOrder).map(async ([realOrderId, itemsToSave]) => {
        console.log('[Montagem] 💾 Salvando pedido:', realOrderId, 'itens:', itemsToSave.length);

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
          console.error('[Montagem] ❌ Falha ao buscar items_with_status para merge. Abortando persistência.', fetchError?.message);
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
            } else {
              console.warn('[Montagem] ⚠️ Item não encontrado no DB para merge:', originalItemId, 'índice:', itemIndex);
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
      console.log('[Montagem] ✅ Persistência concluída com sucesso');

    } catch (error: any) {
      idsToUpdate.forEach((uiKey: string) => pendingItemOverrides.current.delete(String(uiKey)));
      console.error('[Montagem] Erro inesperado no toggle:', error);
      if (Platform.OS === 'web') window.alert('Erro: ' + error.message);
      else Alert.alert('Erro', 'Não foi possível atualizar o item: ' + error.message);
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
      console.log('[Montagem] Marcando como pronto (Direto no DB):', orderIds);

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

      console.log('[Montagem] Status gravado no banco com sucesso!');
    } catch (error: any) {
      console.error('Erro ao mover para prontos:', error);
      Alert.alert('Erro', 'Não foi possível salvar no banco: ' + error.message);
      // Reverter estado local em caso de erro real
      fetchOrders();
    }
  }, [hasPermission, Permissions, user, supabase, fetchOrders]);

  // Componente de lista vazia memoizado
  const ListEmptyComponent = useCallback(() => (
    <View style={styles.emptyState}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
        <MaterialCommunityIcons name="silverware-fork-knife" size={40} color={colors.primary} style={{ marginRight: -10, transform: [{ rotate: '-15deg' }] }} />
        <View style={{ alignItems: 'center', zIndex: 1 }}>
          <MaterialCommunityIcons name="chef-hat" size={80} color={colors.secondary} />
          <MaterialCommunityIcons name="food-variant" size={50} color={colors.text} style={{ marginTop: -15 }} />
        </View>
        <MaterialCommunityIcons name="food-turkey" size={45} color={colors.danger} style={{ marginLeft: -15, marginTop: 20 }} />
      </View>
      <Text style={styles.emptyText}>Nenhum pedido para montar</Text>
      <Text style={styles.emptySubtext}>Os pedidos da cozinha aparecerão aqui</Text>
    </View>
  ), []);

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
    <View style={styles.container}>


      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <View style={styles.headerLeft} />
        <View style={styles.headerCenter}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="layers-outline" size={24} color={colors.white} style={{ marginRight: 6 }} />
            <Text style={styles.headerTitle}>Montagem</Text>
          </View>
          {user && <Text style={styles.userInfo}>Operador: {user.nome || user.email}</Text>}
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.logoutBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back-outline" size={24} color={colors.white} />
          </TouchableOpacity>
        </View>
      </View>

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

      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primary,
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
    color: colors.primaryContrastMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  userInfo: {
    color: colors.userInfo,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  headerRight: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  logoutBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.logoutBg,
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
