import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Alert, Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useState, useEffect, useCallback, memo } from 'react';
import { useOrders } from '../context/OrderContext';
import { useAuth } from '../context/AuthContext';
// @ts-ignore
import BackgroundPattern from '../components/BackgroundPattern';
// @ts-ignore
import PedidoDetalhesModal from './PedidoDetalhesModal';
import { supabase } from '../config/SupabaseConfig';
import { exitApp } from '../utils/appUtils';

// @ts-ignore
import { getLocalDateKey } from '../utils/dateUtils';
// @ts-ignore
import OrderService from '../services/OrderService';

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
  onToggleItem: (orderId: string, itemId: string, status: string) => void;
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
          Comanda {order.comandaNumber || order.numeroComanda || '?'}
          {order.mesa ? ` - Mesa ${order.mesa}` : ''}
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
        <Text style={styles.orderObs}>Obs: {order.observations}</Text>
      )}
      <View style={styles.orderItems}>
        {order.itemsWithStatus && order.itemsWithStatus.length > 0 ? (
          order.itemsWithStatus.map((item: any) => (
            <TouchableOpacity
              key={item.id}
              style={styles.orderItem}
              onPress={() => onToggleItem(item.originalOrderId || order.id, item.id, item.status)}
              activeOpacity={0.7}
            >
              <View style={[
                styles.checkbox,
                item.checked && styles.checkboxChecked
              ]}>
                {item.checked && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={[
                styles.itemText,
                item.checked && styles.itemTextDone
              ]}>
                {item.name}
              </Text>
            </TouchableOpacity>
          ))
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
    </TouchableOpacity>
  );
});
OrderCard.displayName = 'OrderCard';

export default function MontagemScreen() {
  const { moveToProntos, updateItemStatus } = useOrders();
  const { user, logout, hasPermission, Permissions } = useAuth();
  const [processingItems, setProcessingItems] = useState(new Set()); // Loading state
  const [allOrders, setAllOrders] = useState<any[]>([]);

  // ✅ TEMPO REAL: Listener para multi-usuários
  useEffect(() => {
    // @ts-ignore
    if (!user?.companyId) return;
    const today = getLocalDateKey();

    // Initial fetch
    const fetchOrders = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('company_id', user.companyId)
        .eq('date_key', today);

      if (!error && data) {
        // Map snake_case to camelCase
        const mappedOrders = data.map(order => ({
          ...order,
          itemsWithStatus: order.items_with_status || [],
          comandaNumber: order.comanda_number,
          mesa: order.table_number?.toString() || '',
          comandaStatus: order.comanda_status // ✅ Mapear comanda_status
        }));
        setAllOrders(mappedOrders);
      }
    };

    fetchOrders();

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
  const seenItemIds = new Set();


  ordersRaw.forEach(order => {
    if (!order.itemsWithStatus || order.itemsWithStatus.length === 0) {
      return;
    }

    // Filtrar itens não marcados como prontos, únicos e que não sejam bebidas
    // Na tela de Montagem, mostrar itens que ainda não estão prontos (independente do status do item)
    const itemsParaMontar = order.itemsWithStatus
      .filter((item: any) => {
        // Mostrar itens que não estão prontos (independente se é cozinha ou bebida)
        // User solicitou que bebidas apareçam na Montagem
        return item.status !== 'pronto' && !item.checked && !seenItemIds.has(item.id);
      })
      // ✅ CORREÇÃO: Guardar o orderId original em cada item para atualização correta
      .map((item: any) => ({
        ...item,
        originalOrderId: order.id // Guardar referência ao pedido original
      }));

    if (itemsParaMontar.length === 0) return;

    // Marcar itens como processados
    itemsParaMontar.forEach((item: any) => seenItemIds.add(item.id));

    const comandaNum = order.comandaNumber || order.numeroComanda || `temp-${order.id.slice(-4)}`;

    // Se já existe essa comanda, adicionar itens e registrar orderIds únicos
    if (comandasMap.has(comandaNum)) {
      const existing = comandasMap.get(comandaNum);
      existing.itemsWithStatus.push(...itemsParaMontar);
      existing.items.push(...itemsParaMontar.map((i: any) => i.name));
      // ✅ CORREÇÃO: Guardar todos os orderIds únicos da comanda
      if (!existing.allOrderIds.includes(order.id)) {
        existing.allOrderIds.push(order.id);
      }
    } else {
      // Primeira vez vendo essa comanda
      comandasMap.set(comandaNum, {
        ...order,
        itemsWithStatus: [...itemsParaMontar],
        items: itemsParaMontar.map((i: any) => i.name),
        allOrderIds: [order.id] // ✅ Array com todos os orderIds desta comanda
      });
    }
  });

  const orders = Array.from(comandasMap.values())
    .sort((a: any, b: any) => {
      const numA = parseInt(a.comandaNumber) || 0;
      const numB = parseInt(b.comandaNumber) || 0;
      return numA - numB;
    });

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0);

  const handleToggleItem = async (orderId: string, itemId: string, currentStatus: string) => {
    console.log('[Montagem] Toggling item:', orderId, itemId, currentStatus);

    /* 
    // PERMISSION CHECK DISABLED FOR DEBUGGING
    if (!hasPermission || !hasPermission(Permissions.UPDATE_STATUS)) {
      if (Platform.OS === 'web') window.alert('Sem permissão: Seu usuário não pode atualizar status.');
      else Alert.alert('Sem permissão', 'Seu usuário não pode atualizar status dos pedidos.');
      return;
    }
    */

    // Validar se caixa está aberto
    try {
      // @ts-ignore
      const { default: CaixaService } = await import('../services/CaixaService');
      // @ts-ignore
      const caixaAberto = await CaixaService.getCaixaAberto(user.companyId); // UPDATE: Pass companyId
      if (!caixaAberto) {
        if (Platform.OS === 'web') window.alert('Caixa Fechado: É necessário abrir o caixa.');
        else Alert.alert('Caixa Fechado', 'É necessário abrir o caixa antes de mover itens.');
        return;
      }
    } catch (e) {
      console.error('[Montagem] Erro ao verificar caixa:', e);
    }

    try {
      const newStatus = currentStatus === 'pronto' ? 'cozinha' : 'pronto';
      const itemKey = `${orderId}-${itemId}`;
      // @ts-ignore
      setProcessingItems(prev => new Set([...prev, itemKey]));

      // Buscar pedido atual do estado local
      const order = allOrders.find(o => o.id === orderId);
      if (!order || !order.itemsWithStatus) {
        throw new Error('Pedido não encontrado na lista local');
      }

      // Atualizar item
      const updatedItems = order.itemsWithStatus.map((item: any) =>
        item.id === itemId
          ? { ...item, status: newStatus, checked: newStatus === 'pronto' }
          : item
      );

      // Atualizar no Supabase
      // @ts-ignore
      console.log('[Montagem] Updating doc:', user.companyId, orderId);
      const { error: updateError } = await supabase
        .from('orders')
        .update({ items_with_status: updatedItems })
        .eq('company_id', user.companyId)
        .eq('id', orderId);

      if (updateError) throw updateError;
      console.log('[Montagem] Update success!');

      // Atualizar estado local imediatamente
      setAllOrders(prevOrders => 
        prevOrders.map(o => 
          o.id === orderId 
            ? { ...o, itemsWithStatus: updatedItems }
            : o
        )
      );

      setProcessingItems(prev => {
        // @ts-ignore
        const newSet = new Set(prev);
        newSet.delete(itemKey);
        return newSet;
      });

    } catch (error: any) {
      console.error('[Montagem] Erro update:', error);
      if (Platform.OS === 'web') window.alert('Erro: ' + error.message);
      else Alert.alert('Erro', 'Não foi possível atualizar o item: ' + error.message);

      const itemKey = `${orderId}-${itemId}`;
      setProcessingItems(prev => {
        // @ts-ignore
        const newSet = new Set(prev);
        newSet.delete(itemKey);
        return newSet;
      });
    }
  };

  const handleMarkReady = useCallback(async (order: any) => {
    // @ts-ignore
    if (!hasPermission || !hasPermission(Permissions.UPDATE_STATUS)) {
      Alert.alert('Sem permissão', 'Seu usuário não pode atualizar status dos pedidos.');
      return;
    }

    try {
      const now = new Date().toISOString();
      const orderIds = order.allOrderIds || [order.id];

      for (const orderId of orderIds) {
        const { error: updateError } = await supabase
          .from('orders')
          .update({
            status: 'pronto',
            time_in_prontos: now,
            // @ts-ignore
            movido_para_prontos_por: user?.id || null,
            // @ts-ignore
            movido_para_prontos_por_nome: user?.nome || null,
          })
          .eq('company_id', user.companyId)
          .eq('id', orderId);

        if (updateError) throw updateError;
      }
    } catch (error) {
      console.error('Erro ao mover para prontos:', error);
      Alert.alert('Erro', 'Não foi possível mover para prontos');
    }
  }, [hasPermission, Permissions, user]);

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
      <BackgroundPattern />

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
    backgroundColor: '#F5F1E8',
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

  content: {
    flex: 1,
    padding: 20,
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
    fontSize: 13,
    fontStyle: 'italic',
    color: '#8B2F2F',
    marginBottom: 10,
    paddingLeft: 10,
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
    fontSize: 14,
    color: '#5C5C5C',
    flex: 1,
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
