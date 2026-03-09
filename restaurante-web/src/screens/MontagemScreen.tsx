import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Alert, Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useState, useEffect, useCallback, memo, useRef } from 'react';
import { useOrders } from '../context/OrderContext';
import { useAuth } from '../context/AuthContext';
import PedidoDetalhesModal from './PedidoDetalhesModal';
import { supabase } from '../config/SupabaseConfig';
import { exitApp } from '../utils/appUtils';

import { getLocalDateKey } from '../utils/dateUtils';
import OrderService from '../services/OrderService';
import CaixaService from '../services/CaixaService';

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
  onOpenDetails: (orderId: string) => void;
  onToggleItem: (orderId: string, itemIds: string | string[], status: string) => void;
  onMarkReady: (order: any) => void;
}

const OrderCard = memo(({ order, onOpenDetails, onToggleItem, onMarkReady }: OrderCardProps) => {
  const urgent = isUrgent(order.timestamp);
  const allItemsDone = order.itemsWithStatus && order.itemsWithStatus.length > 0
    ? order.itemsWithStatus.every((item: any) => item.checked === true)
    : true;

  const handleCardPress = useCallback(() => {
    onOpenDetails(order.id);
  }, [order.id, onOpenDetails]);

  const handleReadyPress = useCallback((e: any) => {
    e.stopPropagation();
    onMarkReady(order);
  }, [order, onMarkReady]);

  return (
    <TouchableOpacity
      style={[styles.orderCard, urgent && styles.orderCardUrgent]}
      onPress={handleCardPress}
      activeOpacity={0.7}
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
        {order.itemsWithStatus && order.itemsWithStatus.length > 0 ? (() => {
          // ✅ FIX: Agrupar itens com mesmo nome e status APENAS dentro do mesmo pedido
          // Não agrupar itens de pedidos diferentes mesmo que tenham o mesmo nome
          const groupedItems: any[] = [];
          order.itemsWithStatus.forEach((item: any) => {
             // ✅ CRÍTICO: Incluir originalOrderId na chave de agrupamento
             // Isso garante que itens de pedidos diferentes não sejam agrupados
             const existing = groupedItems.find(g => 
               g.name === item.name && 
               g.checked === item.checked &&
               g.originalOrderId === item.originalOrderId
             );
             if (existing) {
                existing.groupedCount = (existing.groupedCount || 1) + 1;
                existing.groupedIds = [...(existing.groupedIds || [existing.id]), item.id];
             } else {
                groupedItems.push({ ...item, groupedCount: 1, groupedIds: [item.id] });
             }
          });

          return groupedItems.map((item: any) => {
            // Parse Extras
            const parts = item.name.split(' + ');
            const mainName = parts[0];
            const extras = parts.length > 1 ? parts.slice(1).join(' + ') : null;
            const qtdStr = item.groupedCount > 1 ? `${item.groupedCount}x ` : '';

            return (
              <TouchableOpacity
                key={item.id}
                style={styles.orderItem}
                onPress={() => onToggleItem(item.originalOrderId || order.id, item.groupedIds || [item.id], item.status)}
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
                    {qtdStr}{mainName}
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
          });
        })() : (
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
    </TouchableOpacity>
  );
});
OrderCard.displayName = 'OrderCard';

export default function MontagemScreen() {
  useOrders(); // mantido para não quebrar contexto
  const { user, hasPermission, Permissions } = useAuth();
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

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
      // Map snake_case to camelCase, ignorando IDs já marcados localmente como prontos
      const mappedOrders = data
        .filter(order => !locallyMarkedReady.current.has(order.id)) // ✅ proteção anti-race
        .map(order => ({
          ...order,
          // ✅ GERAR IDs ÚNICOS POR PEDIDO: combina o UUID do pedido com o ID do item
          // Isso evita que itens com o mesmo ID de produto (ex: 'item_coca_cola') em pedidos
          // de delivery diferentes colidam no estado local e causem marcação cruzada.
          itemsWithStatus: (order.items_with_status || []).map((item: any) => ({
            ...item,
            id: `${order.id}::${item.id}`, // ID composto: orderId::itemId
            _originalItemId: item.id,       // preservar ID original para persistência no DB
            originalOrderId: order.id       // Guardar UUID REAL para envio seguro no clique
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
      let itemsToSaveByOrder: Record<string, any[]> = {};

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

  const handleOpenDetails = useCallback((orderId: string) => {
    setSelectedOrderId(orderId);
    setModalVisible(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalVisible(false);
    setSelectedOrderId(null);
  }, []);

  // Componente de lista vazia memoizado
  const ListEmptyComponent = useCallback(() => (
    <View style={styles.emptyState}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
        <MaterialCommunityIcons name="silverware-fork-knife" size={40} color="#8B2F2F" style={{ marginRight: -10, transform: [{ rotate: '-15deg' }] }} />
        <View style={{ alignItems: 'center', zIndex: 1 }}>
          <MaterialCommunityIcons name="chef-hat" size={80} color="#E5B84A" />
          <MaterialCommunityIcons name="food-variant" size={50} color="#2C2C2C" style={{ marginTop: -15 }} />
        </View>
        <MaterialCommunityIcons name="food-turkey" size={45} color="#D84315" style={{ marginLeft: -15, marginTop: 20 }} />
      </View>
      <Text style={styles.emptyText}>Nenhum pedido para montar</Text>
      <Text style={styles.emptySubtext}>Os pedidos da cozinha aparecerão aqui</Text>
    </View>
  ), []);

  // RenderItem memoizado
  const renderItem = useCallback(({ item }: { item: any }) => (
    <OrderCard
      order={item}
      onOpenDetails={handleOpenDetails}
      onToggleItem={handleToggleItem}
      onMarkReady={handleMarkReady}
    />
  ), [handleOpenDetails, handleToggleItem, handleMarkReady]);

  // KeyExtractor memoizado
  const keyExtractor = useCallback((item: any) => item.id, []);

  return (
    <View style={styles.container}>


      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {user && (
            <View>
              <Text style={styles.userInfoLabel}>Olá,</Text>
              <Text style={styles.userInfo}>{user.nome || user.email}</Text>
            </View>
          )}
        </View>
        <View style={styles.headerCenter}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="layers-outline" size={24} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.headerTitle}>Montagem</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={exitApp}>
          <Ionicons name="log-out-outline" size={24} color="#FFF" />
        </TouchableOpacity>
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

      {selectedOrderId && (
        <PedidoDetalhesModal
          visible={modalVisible}
          orderId={selectedOrderId}
          onClose={handleCloseModal}
        />
      )}

      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5DC',
  },
  header: {
    backgroundColor: '#8B2F2F',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
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
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 15 }
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
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  userInfoLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
  },
  userInfo: {
    color: '#E5B84A',
    fontSize: 12,
    fontWeight: '600',
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
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 18,
    marginBottom: 15,
    ...Platform.select({
      web: { boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.06)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
      }
    }),
    borderWidth: 1,
    borderColor: '#F0EBE0',
  },
  orderCardUrgent: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5B84A',
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
    color: '#8B2F2F',
  },
  orderTime: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
    backgroundColor: '#FF8C42',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  orderClient: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C2C2C',
    marginBottom: 12,
  },
  garcomText: {
    fontSize: 13,
    color: '#2196F3',
    fontWeight: '600',
    marginBottom: 6,
  },
  movimentadoPorText: {
    fontSize: 13,
    color: '#FF9800',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  orderObs: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#E65100', // Orange highlighting
    fontWeight: 'bold',
    marginBottom: 10,
    paddingLeft: 10,
    backgroundColor: '#FFF3E0',
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
    borderColor: '#8B2F2F',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    backgroundColor: '#8B2F2F',
    borderColor: '#8B2F2F',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  itemDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#8B2F2F',
    marginRight: 10,
  },
  itemDotSecondary: {
    backgroundColor: '#E5B84A',
  },
  itemText: {
    fontSize: 16, // Increased size
    color: '#2C2C2C', // Darker for readability
    fontWeight: '600',
  },
  itemExtras: {
    fontSize: 14,
    color: '#D32F2F',
    fontWeight: 'bold',
    marginTop: 2,
    fontStyle: 'italic',
  },
  itemTextReady: {
    fontSize: 14,
    color: '#2C2C2C',
    flex: 1,
    fontWeight: '600',
  },
  itemTextDone: {
    color: '#999',
    textDecorationLine: 'line-through',
  },
  readyBtn: {
    backgroundColor: '#8B2F2F',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    ...Platform.select({
      web: { boxShadow: '0px 3px 10px rgba(139, 47, 47, 0.2)' },
      default: {
        shadowColor: '#8B2F2F',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 3,
      }
    }),
  },
  readyBtnDisabled: {
    backgroundColor: '#CCC',
    shadowOpacity: 0,
    elevation: 0,
  },
  readyBtnText: {
    color: '#FFFFFF',
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
    color: '#8B2F2F',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
