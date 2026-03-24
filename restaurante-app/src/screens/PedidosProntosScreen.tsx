import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
// @ts-ignore

import PedidoDetalhesModal from './PedidoDetalhesModal';
import { supabase } from '../config/SupabaseConfig';
import { getLocalDateKey } from '../utils/dateUtils';
import OptimizedFlatList from '../components/OptimizedFlatList';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';

const formatClockLabel = (value?: string | null) => {
  if (!value) return '--:--';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--:--';

  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

const getElapsedTimeLabel = (reference?: string | null, nowMs: number = Date.now()) => {
  if (!reference) return '--:--';

  const date = new Date(reference);
  if (Number.isNaN(date.getTime())) return '--:--';

  const diffMinutes = Math.max(0, Math.floor((nowMs - date.getTime()) / 60000));
  if (diffMinutes < 60) return `${diffMinutes}m`;

  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  return `${hours}h${String(minutes).padStart(2, '0')}`;
};
export default function PedidosProntosScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [processingItems, setProcessingItems] = useState(new Set()); // Loading state
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const insets = useSafeAreaInsets();
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 30000);

    return () => clearInterval(timer);
  }, []);

  // ✅ TEMPO REAL: Listener para multi-usuários
  useEffect(() => {
    // @ts-ignore
    if (!user?.companyId) return;
    const today = getLocalDateKey();

    // Initial fetch
    const fetchOrders = async () => {
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
        .in('status', ['preparing', 'ready'])
        .neq('order_type', 'delivery');

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

          if (!comandasError && comandasData) {
            comandasData.forEach(comanda => {
              comandaCreatorsMap.set(`${comanda.date_key}:${comanda.comanda_number}`, comanda.opened_by_name || '');
            });
          }
        }

        // Map snake_case to camelCase
        const mappedOrders = data.map(order => ({
          ...order,
          itemsWithStatus: order.items_with_status || [],
          comandaNumber: order.comanda_number,
          mesa: order.table_number?.toString() || '',
          comandaStatus: order.comanda_status,
          client: order.client_name || order.client || 'Cliente',
          createdAt: order.created_at,
          timestamp: order.created_at,
          timeInProntos: order.time_in_prontos || null,
          timeInMontagem: order.time_in_montagem || null,
          createdByName: order.profiles?.full_name || comandaCreatorsMap.get(`${order.date_key || today}:${order.comanda_number}`) || '',
          criadoPorNome: order.profiles?.full_name || comandaCreatorsMap.get(`${order.date_key || today}:${order.comanda_number}`) || ''
        }));
        setAllOrders(mappedOrders);
      }
    };

    fetchOrders();

    // Subscribe to real-time changes
    const channel = supabase
      .channel(`orders-prontos-${user.companyId}`)
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

  // Buscar pedidos com status preparing ou ready
  const churrasqueiraOrders = allOrders.filter(o => o.status === 'preparing' || o.status === 'ready');

  // Extrair itens prontos individuais (que ainda NÃO foram entregues)
  const readyItems: any[] = [];
  const seenItems = new Set(); // Para evitar duplicatas

  churrasqueiraOrders.forEach(order => {
    if (order.itemsWithStatus && order.itemsWithStatus.length > 0) {
      order.itemsWithStatus.forEach((item: any) => {
        // Item é considerado pronto se: Status 'pronto' OU item checado OU pedido todo pronto
        const isItemReady = item.status === 'pronto' || item.checked === true || order.status === 'ready';

        if (isItemReady && !item.delivered) {
          // Criar chave única para evitar duplicatas
          const itemKey = `${order.id}-${item.id}`;

          if (!seenItems.has(itemKey)) {
            seenItems.add(itemKey);
            readyItems.push({
              ...item,
              orderId: order.id,
              comandaNumber: order.comandaNumber || order.numeroComanda,
              client: order.client,
              mesa: order.mesa, // ✅ Propagar mesa
              observations: order.observations, // ✅ Propagar observações
              criadoPorNome: order.criadoPorNome || order.createdByName,
              prontoDesde: order.timeInProntos || order.time_in_prontos || order.timestamp || order.createdAt,
              orderTimestamp: order.timestamp || order.createdAt
            });
          }
        }
      });
    }
  });

  // ORDENAR: Primeiro por número de comanda (menor primeiro), depois por timestamp do pedido
  readyItems.sort((a, b) => {
    // Extrair número da comanda (ex: "002" de "002")
    const numA = parseInt(a.comandaNumber) || 0;
    const numB = parseInt(b.comandaNumber) || 0;

    if (numA !== numB) {
      return numA - numB; // Comanda menor primeiro
    }

    // Se mesma comanda, ordenar por timestamp do pedido (mais antigo primeiro)
    const timeA = new Date(a.orderTimestamp).getTime();
    const timeB = new Date(b.orderTimestamp).getTime();
    return timeA - timeB;
  });

  const handleDeliver = useCallback(async (orderId: string, itemId: string) => {
    console.log('[Prontos] Delivering item:', orderId, itemId);

    // Validar se caixa está aberto
    try {
      // @ts-ignore
      const { default: CaixaService } = await import('../services/CaixaService');
      // @ts-ignore
      const caixaAberto = await CaixaService.getCaixaAberto(user.companyId); // UPDATE: Pass companyId
      if (!caixaAberto) {
        if (Platform.OS === 'web') window.alert('Caixa Fechado: É necessário abrir o caixa antes de entregar pedidos.');
        else Alert.alert('Caixa Fechado', 'É necessário abrir o caixa antes de entregar pedidos.');
        return;
      }
    } catch (e) {
      console.error('[Prontos] Erro ao verificar caixa:', e);
    }

    try {
      const itemKey = `${orderId}-${itemId}`;
      // @ts-ignore
      setProcessingItems(prev => new Set([...prev, itemKey]));

      // Buscar pedido atual do estado local (vem do onSnapshot)
      const order = allOrders.find(o => o.id === orderId);
      if (!order || !order.itemsWithStatus) {
        throw new Error('Pedido não encontrado');
      }

      const now = new Date().toISOString();

      // Atualizar item como entregue
      const updatedItems = order.itemsWithStatus.map((item: any) =>
        item.id === itemId
          ? { ...item, delivered: true, deliveredAt: now }
          : item
      );

      // Verificar se todos os itens foram entregues
      const allDelivered = updatedItems.every((item: any) => item.delivered === true);

      const updatePayload: any = {
        items_with_status: updatedItems,
        updated_at: now
      };

      // Se todos os itens foram entregues, atualizar status do pedido
      if (allDelivered) {
        updatePayload.status = 'delivered';
      }

      // @ts-ignore
      console.log('[Prontos] Updating doc:', user.companyId, orderId);
      // Atualizar no Supabase
      const { error: updateError } = await supabase
        .from('orders')
        .update(updatePayload)
        .eq('company_id', user?.companyId)
        .eq('id', orderId);

      if (updateError) throw updateError;
      console.log('[Prontos] Update success!');

      setProcessingItems(prev => {
        // @ts-ignore
        const newSet = new Set(prev);
        newSet.delete(itemKey);
        return newSet;
      });

    } catch (error: any) {
      console.error('❌ Erro ao entregar item:', error);
      if (Platform.OS === 'web') window.alert('Erro: ' + error.message);
      else Alert.alert('Erro', 'Não foi possível marcar como entregue: ' + error.message);

      const itemKey = `${orderId}-${itemId}`;
      setProcessingItems(prev => {
        // @ts-ignore
        const newSet = new Set(prev);
        newSet.delete(itemKey);
        return newSet;
      });
    }
  }, [allOrders, user]);

  const renderItem = useCallback(({ item }: { item: any }) => {
    // Parse Extras
    const parts = item.name.split(' + ');
    const mainName = parts[0];
    const extras = parts.length > 1 ? parts.slice(1).join(' + ') : null;

    return (
      <View style={styles.itemCard}>
        <View style={styles.itemHeader}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={styles.comandaNumber}>
              Comanda {item.comandaNumber || '?'}
              {item.mesa ? ` - Mesa ${item.mesa}` : ''}
            </Text>
            <Text style={styles.clientName}>{item.client}</Text>
          </View>
          <Text style={styles.readyTime}>{getElapsedTimeLabel(item.prontoDesde, nowMs)}</Text>
        </View>

        {!!item.observations && (
            <Text style={styles.orderObs}>📝 Obs: {String(item.observations)}</Text>
        )}

        <View style={styles.itemBody}>
          <View style={styles.checkIcon}>
            <Text style={styles.checkIconText}>✓</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.itemName}>{mainName}</Text>
            {!!extras && (
              <Text style={styles.itemExtras}>
                + {extras}
              </Text>
            )}
          </View>
        </View>

        {!!item.criadoPorNome && (
          <Text style={styles.garcomText}>👤 Pedido por: {item.criadoPorNome}</Text>
        )}
        <Text style={styles.timeHint}>Pronto desde: {formatClockLabel(item.prontoDesde)}</Text>

        <TouchableOpacity
          style={styles.deliverBtn}
          onPress={() => handleDeliver(item.orderId, item.id)}
        >
          <Text style={styles.deliverBtnText}>
            {
              // @ts-ignore
              processingItems.has(`${item.orderId}-${item.id}`) ? 'AGUARDE...' : 'ENTREGUE'
            }
          </Text>
        </TouchableOpacity>
      </View>
    );
  }, [handleDeliver, nowMs, processingItems]);

  const keyExtractor = useCallback((item: any) => `${item.orderId}-${item.id}`, []);

  const ListEmptyComponent = useCallback(() => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>🛎️</Text>
      <Text style={styles.emptyText}>Nenhum item pronto</Text>
      <Text style={styles.emptySubtext}>Marque itens na montagem e eles aparecerão aqui</Text>
    </View>
  ), []);

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedOrderId(null);
  };

  return (
    <View style={styles.container}>


      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <View style={styles.headerLeft} />
        <View style={styles.headerCenter}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="checkmark-done-circle-outline" size={24} color={colors.white} style={{ marginRight: 6 }} />
            <Text style={styles.headerTitle}>Prontos para entrega</Text>
          </View>
          {user && <Text style={styles.userInfo}>Operador: {user.nome || user.email}</Text>}
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.logoutBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back-outline" size={24} color={colors.white} />
          </TouchableOpacity>
        </View>
      </View>

      <OptimizedFlatList
        data={readyItems}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListEmptyComponent={ListEmptyComponent}
        contentContainerStyle={styles.content}
        itemHeight={180}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
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
  content: {
    padding: 20,
  },
  orderCard: {
    backgroundColor: colors.white,
    borderRadius: 15,
    padding: 18,
    marginBottom: 15,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  itemCard: {
    backgroundColor: colors.white,
    borderRadius: 15,
    padding: 18,
    marginBottom: 15,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    borderLeftWidth: 5,
    borderLeftColor: colors.success,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  comandaNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  clientName: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: 2,
  },
  readyTime: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
    backgroundColor: colors.success,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  itemBody: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  checkIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkIconText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '700',
  },
  itemName: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    fontWeight: '600',
  },
  orderNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 5,
  },
  orderClient: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 10,
  },
  orderObs: {
    fontSize: 14,
    fontStyle: 'italic',
    color: colors.warning,
    fontWeight: 'bold',
    marginBottom: 10,
    backgroundColor: colors.warningSurface,
    padding: 8,
    borderRadius: 8,
  },
  itemExtras: {
    fontSize: 14,
    color: colors.danger,
    fontWeight: 'bold',
    marginTop: 2,
    fontStyle: 'italic',
  },
  garcomText: {
    fontSize: 13,
    color: colors.secondary,
    fontWeight: '600',
    marginBottom: 6,
  },
  timeHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  finalizadoPorText: {
    fontSize: 13,
    color: colors.success,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  orderItems: {
    marginBottom: 15,
  },
  itemText: {
    fontSize: 14,
    color: colors.textSecondary,
    paddingVertical: 3,
  },
  deliverBtn: {
    backgroundColor: colors.secondary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 5,
  },
  deliverBtnText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 20,
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
  },
});
