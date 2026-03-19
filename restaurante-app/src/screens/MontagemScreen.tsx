import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Alert, Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useState, useEffect, useCallback, memo, useRef } from 'react';
import { useOrders } from '../context/OrderContext';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../config/SupabaseConfig';
import { getLocalDateKey } from '../utils/dateUtils';
import CaixaService from '../services/CaixaService';
import { colors } from '../theme/colors';
// Verificar se pedido é urgente (mais de 15 minutos)
const isUrgent = (timestamp: string) => {
  const orderTime = new Date(timestamp);
  const now = new Date();
  const diffMinutes = (now.getTime() - orderTime.getTime()) / 1000 / 60;
  return diffMinutes > 15;
};

// Componente OrderCard memoizado
interface OrderCardProps {
  order: any;
  onToggleItem: (orderId: string, itemIds: string | string[], status: string) => void;
  onMarkReady: (order: any) => void;
}

const OrderCard = memo(({ order, onToggleItem, onMarkReady }: OrderCardProps) => {
  const urgent = isUrgent(order.timestamp);
  const allItemsDone = order.itemsWithStatus && order.itemsWithStatus.length > 0
    ? order.itemsWithStatus.every((item: any) => item.checked === true)
    : true;

  const handleReadyPress = useCallback((e: any) => {
    e.stopPropagation();
    onMarkReady(order);
  }, [order, onMarkReady]);

  return (
    <View
      style={[styles.orderCard, urgent && styles.orderCardUrgent]}
    >
      <View style={styles.orderHeader}>
        <Text style={styles.orderNumber}>
          {order.orderType === 'delivery'
            ? `Delivery ${order.comandaNumber || '?'}`
            : order.isMesaGroup 
              ? `Mesa ${order.mesa}` 
              : `Comanda ${order.comandaNumber || '?'}`
          }
          {order.isMesaGroup && order.allComandas && order.allComandas.length > 0 && (
            <Text style={{ fontSize: 12, fontWeight: 'normal', opacity: 0.8 }}>
              {` (C: ${order.allComandas.join(', ')})`}
            </Text>
          )}
        </Text>
        <Text style={styles.orderTime}>
          {order.horarioCriacao || (order.timestamp ? new Date(order.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--')}
        </Text>
      </View>
      <Text style={styles.orderClient}>{order.client}</Text>
      {(order.criadoPorNome || order.createdByName) && (
        <Text style={styles.garcomText}>👤 Garçom: {order.criadoPorNome || order.createdByName}</Text>
      )}
      {order.movidoParaMontagemPorNome && (
        <Text style={styles.movimentadoPorText}>🔧 Recebido de: {order.movidoParaMontagemPorNome}</Text>
      )}
      {order.observations && (
        <Text style={styles.orderObs}>📝 Obs: {order.observations}</Text>
      )}
      <View style={styles.orderItems}>
        {order.itemsWithStatus && order.itemsWithStatus.length > 0 ? (
          order.itemsWithStatus.map((item: any) => {
            const parts = item.name.split(' + ');
            const mainName = parts[0];
            const extras = parts.length > 1 ? parts.slice(1).join(' + ') : null;
            return (
              <TouchableOpacity
                key={item.id}
                style={styles.orderItem}
                onPress={() => onToggleItem(item.originalOrderId || order.id, [item.id], item.status)}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.checkbox,
                  item.checked && styles.checkboxChecked
                ]}>
                  {item.checked && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[
                    styles.itemText,
                    item.checked && styles.itemTextDone
                  ]}>
                    {mainName}
                  </Text>
                  {extras && (
                    <Text style={[
                      styles.itemExtras,
                      item.checked && styles.itemTextDone
                    ]}>
                      + {extras}
                    </Text>
                  )}
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

  // ✅ Guarda IDs marcados como prontos nesta sessão para proteger contra race condition do Realtime
  const locallyMarkedReady = useRef<Set<string>>(new Set());

  // Initial fetch — busca APENAS pedidos em 'preparing' para evitar race conditions
  const fetchOrders = useCallback(async () => {
    // @ts-ignore
    if (!user?.companyId) return;
    const today = getLocalDateKey();

    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('company_id', user.companyId)
      .eq('date_key', today)
      .eq('status', 'preparing'); // ✅ CRITICAL FIX: filtrar no banco, não só no cliente

    if (!error && data) {
      const mappedOrders = data
        .filter(order => !locallyMarkedReady.current.has(order.id))
        .map(order => ({
          ...order,
          // ✅ ID COMPOSTO: garante unicidade por pedido, evitando colisão em delivery
          itemsWithStatus: (order.items_with_status || []).map((item: any) => ({
            ...item,
            id: `${order.id}::${item.id}`,
            _originalItemId: item.id,
            originalOrderId: order.id
          })),
          comandaNumber: order.comanda_number,
          mesa: (order.table_number && order.table_number !== 0) ? order.table_number.toString() : '',
          comandaStatus: order.comanda_status,
          orderType: order.order_type || order.orderType || 'local',
          client: order.client_name || order.client || 'Cliente'
        }));
      
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
  const ordersRaw = allOrders.filter(order => {
    // Filtrar apenas pedidos em preparing
    if (order.status !== 'preparing') return false;
    
    // ✅ PROTEÇÃO: Se o pedido tem comandaStatus='cancelada', não mostrar
    if (order.comandaStatus === 'cancelada') {
      console.log('[Montagem] 🚫 Pedido filtrado (comanda cancelada):', order.id);
      return false;
    }
    
    return true;
  });

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
        allComandas: (order.comandaNumber && order.comandaNumber !== 0) ? [order.comandaNumber] : []
      });
    }
  });

  const orders = Array.from(comandasMap.values())
    .sort((a: any, b: any) => {
      const numA = parseInt(a.comandaNumber) || 0;
      const numB = parseInt(b.comandaNumber) || 0;
      return numA - numB;
    });

  const handleToggleItem = async (_orderId: string, itemIds: string | string[], _currentStatus: string) => {
    const idsToUpdate = Array.isArray(itemIds) ? itemIds : [itemIds];
    
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
      const updatesByRealOrder: Record<string, { realItemIds: string[], compoundIds: string[] }> = {};
      
      idsToUpdate.forEach(compoundId => {
        const sepIdx = compoundId.indexOf('::');
        if (sepIdx > 0) {
          const rOrderId = compoundId.substring(0, sepIdx);
          const rItemId = compoundId.substring(sepIdx + 2);
          if (!updatesByRealOrder[rOrderId]) updatesByRealOrder[rOrderId] = { realItemIds: [], compoundIds: [] };
          updatesByRealOrder[rOrderId].realItemIds.push(rItemId);
          updatesByRealOrder[rOrderId].compoundIds.push(compoundId);
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

      setAllOrders(prevOrders => {
        // 2. Descobrir qual o NOVO ESTADO baseado no estado atual do primeiro item em prevOrders
        const firstRealOrderId = Object.keys(updatesByRealOrder)[0];
        const firstCompoundId = updatesByRealOrder[firstRealOrderId].compoundIds[0];
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
        const updatedOrders = prevOrders.map(o => {
          const entry = updatesByRealOrder[o.id];
          if (!entry) return o;
          
          const updatedOrder = {
            ...o,
            itemsWithStatus: o.itemsWithStatus.map((i: any) => 
              entry.compoundIds.includes(i.id) ? { ...i, checked: newChecked, timestamp: now } : i
            )
          };

          // Preparar dados para persistência no Supabase
          itemsToSaveByOrder[o.id] = updatedOrder.itemsWithStatus.map((i: any) => {
            const isTarget = entry.realItemIds.includes(i._originalItemId || i.id.split('::').pop() || i.id);
            return {
              // Salvar com o ID ORIGINAL do banco (sem o prefixo UUID::)
              ...i,
              id: i._originalItemId || i.id.split('::').pop() || i.id,
              _originalItemId: undefined, // Limpar campo auxiliar
              originalOrderId: undefined, // Limpar campo auxiliar
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
        
        const { error } = await supabase
          .from('orders')
          .update({ items_with_status: itemsToSave, updated_at: now })
          .eq('id', realOrderId)
          .eq('company_id', user?.companyId);

        if (error) throw new Error(`Supabase erro: ${error.message}`);
      });

      await Promise.all(persistPromises);
      console.log('[Montagem] ✅ Persistência concluída com sucesso');

    } catch (error: any) {
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
    />
  ), [handleToggleItem, handleMarkReady]);

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
    marginBottom: 12,
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
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
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
