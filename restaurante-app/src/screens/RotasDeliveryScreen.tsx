import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, Alert, Platform, Linking, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/SupabaseConfig';
import { getLocalDateKey } from '../utils/dateUtils';
import { exitApp } from '../utils/appUtils';
import OptimizedFlatList from '../components/OptimizedFlatList';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

export default function RotasDeliveryScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  
  const [loading, setLoading] = useState(true);
  const [deliveryOrders, setDeliveryOrders] = useState<any[]>([]);
  const [processingItems, setProcessingItems] = useState(new Set());

  // Detecta se o App Header padrão de Stack está presente (caso o Admin navegue para cá a partir do botão)
  // Em Tab views, o header do SafeArea próprio assumirá o visual.
  const isFromAdmin = user?.funcao === 'admin' || user?.funcao === 'gerente';

  const fetchDeliveryOrders = useCallback(async () => {
    try {
      if (!user?.companyId) return;
      const today = getLocalDateKey();

      // Busca pedidos do tipo Delivery que ainda não foram marcados como entregues e não estão cancelados.
      // E preferencialmente os que já passaram da cozinha (status 'preparing' mas com os itens marcados como pronto para o montador fechar,
      // ou se você criar outro status macro para isso).
      // Por enquanto buscaremos preparando (para motoboy pegar) e dispatched (na rua).
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('company_id', user.companyId)
        .eq('date_key', today)
        .eq('order_type', 'delivery')
        .in('status', ['pronto', 'ready', 'dispatched']);

      if (error) throw error;

      if (data) {
        // Ordenar: primeiro os dispatched (já estão com o motoboy), depois os mais antigos (preparing).
        const sortedData = data.sort((a, b) => {
          if (a.status === 'dispatched' && b.status !== 'dispatched') return -1;
          if (b.status === 'dispatched' && a.status !== 'dispatched') return 1;
          
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        });
        
        // Mapear snake_case
        const mappedOrders = sortedData.map(order => ({
            ...order,
            customerName: order.customer_name || order.client,
            customerPhone: order.customer_phone,
            deliveryAddress: order.delivery_address,
            paymentMethod: order.payment_method,
            itemsWithStatus: order.items_with_status || [],
            comandaNumber: order.comanda_number || order.numeroComanda
        }));

        setDeliveryOrders(mappedOrders);
      }
    } catch (e: any) {
      console.error('[RotasDelivery] Error fetching orders:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDeliveryOrders();

    // @ts-ignore
    if (!user?.companyId) return;

    // Real-time listener para pedidos Delivery
    const channel = supabase
      .channel(`delivery-orders-${user.companyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `company_id=eq.${user.companyId}`
        },
        (payload) => {
           // Verifica payload.new E payload.old — mudanças de status não trocam order_type
           const isDelivery =
             (payload.new && (payload.new as any).order_type === 'delivery') ||
             (payload.old && (payload.old as any).order_type === 'delivery');
           if (isDelivery || !payload.old) {
              fetchDeliveryOrders();
           }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [fetchDeliveryOrders, user]);

  const openWhatsApp = (phone: string, customerName: string) => {
    if (!phone) {
        Alert.alert('Ops', 'Telefone do cliente não informado.');
        return;
    }
    const cleanPhone = phone.replace(/\D/g, '');
    const message = `Olá ${customerName}! Aqui é o entregador do restaurante, estou a caminho!`;
    Linking.openURL(`whatsapp://send?phone=55${cleanPhone}&text=${encodeURIComponent(message)}`)
      .catch(() => {
         Alert.alert('Erro', 'Certifique-se de que o WhatsApp está instalado.');
      });
  };

  const openAddressInMaps = (address: string) => {
    if (!address) {
        Alert.alert('Ops', 'Endereço não informado.');
        return;
    }
    const url = Platform.select({
      ios: `maps:0,0?q=${encodeURIComponent(address)}`,
      android: `geo:0,0?q=${encodeURIComponent(address)}`,
      web: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    });

    // @ts-ignore
    Linking.openURL(url).catch(() => Alert.alert('Erro', 'Não foi possível abrir o mapa.'));
  };

  const updateOrderStatus = async (orderId: string, novoStatus: 'dispatched' | 'delivered') => {
      try {
        setProcessingItems(prev => new Set([...prev, orderId]));
        
        const updatePayload: any = {
            status: novoStatus,
            updated_at: new Date().toISOString()
        };

        // Se for entregue (delivered), marcamos também os sub-itens caso estejam no json items_with_status
        const order = deliveryOrders.find(o => o.id === orderId);
        if (order && order.itemsWithStatus && novoStatus === 'delivered') {
            updatePayload.items_with_status = order.itemsWithStatus.map((item: any) => ({
                ...item,
                delivered: true,
                deliveredAt: new Date().toISOString()
            }));
        }

        const { error } = await supabase
            .from('orders')
            .update(updatePayload)
            .eq('id', orderId)
            // @ts-ignore
            .eq('company_id', user.companyId);

        if (error) throw error;
        
        // Remove from list if delivered (as the view filters by delivered later if needed, but the main query EXCLUDES delivered)
        if (novoStatus === 'delivered') {
             setDeliveryOrders(prev => prev.filter(o => o.id !== orderId));
        } else {
             fetchDeliveryOrders();
        }

      } catch (e: any) {
        console.error('❌ Erro atualizar entrega:', e);
        Alert.alert('Erro', 'Falha ao atualizar status: ' + e.message);
      } finally {
        setProcessingItems(prev => {
            const newSet = new Set(prev);
            newSet.delete(orderId);
            return newSet;
        });
      }
  };

  const handleAction = (order: any) => {
      // Regra de Negócio Delivery:
      // Se status for 'pronto' (Cozinha e Montagem OK), ele muda para 'dispatched' (Saiu p/ entrega).
      // Se status for 'dispatched', ele muda para 'delivered' (Acabou).
      
      const currentStatus = order.status;

      if (currentStatus === 'pronto' || currentStatus === 'ready') {
          updateOrderStatus(order.id, 'dispatched');
      } else if (currentStatus === 'dispatched') {
          Alert.alert(
              'Confirmar Entrega',
              'O pedido foi entregue ao cliente e o pagamento (se pendente) foi recolhido?',
              [
                  { text: 'Não', style: 'cancel' },
                  { text: 'Sim, Entregue!', style: 'default', onPress: () => updateOrderStatus(order.id, 'delivered') }
              ]
          );
      }
  };

  const renderItem = useCallback(({ item }: { item: any }) => {
    const isDispatched = item.status === 'dispatched';
    
    // Resumo rápido dos itens (qtd x nome)
    const itemsSummary = item.itemsWithStatus 
      ? item.itemsWithStatus.map((i: any) => i.name).join(', ')
      : 'Sem itens detalhados';

    return (
      <View style={[styles.orderCard, isDispatched && styles.dispatchedCard]}>
        
        {/* CABEÇALHO DO CARD */}
        <View style={styles.cardHeader}>
            <View>
                <Text style={styles.comandaTag}>Pedido #{item.comandaNumber || '?'}</Text>
                <Text style={styles.clientName}>{item.customerName || 'Cliente sem nome'}</Text>
            </View>
            <View style={styles.statusBadge}>
                <Text style={styles.statusText}>
                    {isDispatched ? 'Saiu pra Entrega' : 'Pronto p/ Rota'}
                </Text>
            </View>
        </View>

        {/* INFORMAÇÕES DO CLIENTE */}
        <View style={styles.infoBlock}>
            <View style={styles.infoRow}>
               <Ionicons name="location" size={20} color="#8B2F2F" />
               <Text style={styles.infoText} numberOfLines={2}>{item.deliveryAddress || 'Retirada/Endereço não informado'}</Text>
            </View>
            
            {!!item.deliveryAddress && (
                <TouchableOpacity onPress={() => openAddressInMaps(item.deliveryAddress)}>
                   <Text style={styles.actionLinkText}>📍 Abrir no GPS</Text>
                </TouchableOpacity>
            )}
        </View>

        <View style={styles.divider} />

        <View style={styles.infoBlock}>
            <View style={styles.infoRow}>
               <Ionicons name="wallet" size={20} color="#E5B84A" />
               <Text style={styles.infoTextBold}>{item.paymentMethod || 'A Confirmar na Entrega'}</Text>
            </View>
            
            {!!item.customerPhone && (
                <TouchableOpacity style={styles.whatsappButtonSmall} onPress={() => openWhatsApp(item.customerPhone, item.customerName)}>
                   <Ionicons name="logo-whatsapp" size={16} color="#FFF" />
                   <Text style={styles.whatsappTextSmall}>Message</Text>
                </TouchableOpacity>
            )}
        </View>

        <View style={styles.divider} />
        
        {/* RESUMO DE ITENS */}
        <View style={styles.itemsBlock}>
            <Text style={styles.itemsBlockTitle}>O que acompanha:</Text>
            <Text style={styles.itemsBlockText}>{itemsSummary}</Text>
            {!!item.observations && (
              <Text style={styles.orderObs}>📝 Obs: {String(item.observations)}</Text>
            )}
        </View>

        {/* BOTÃO DE AÇÃO */}
        <TouchableOpacity
          style={[styles.actionBtn, isDispatched ? styles.btnSuccess : styles.btnWarning]}
          // @ts-ignore
          onPress={() => handleAction(item)}
          // @ts-ignore
          disabled={processingItems.has(item.id)}
        >
          {/* @ts-ignore */}
          {processingItems.has(item.id) ? (
              <ActivityIndicator color="#FFF" />
          ) : (
              <Text style={styles.actionBtnText}>
                {isDispatched ? '✅ ENTREGUE COM SUCESSO' : '🚚 SAIU PARA ENTREGA'}
              </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  }, [processingItems]);

  const keyExtractor = useCallback((item: any) => item.id.toString(), []);

  const ListEmptyComponent = useCallback(() => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>🛵</Text>
      <Text style={styles.emptyText}>Zero rotas pendentes no momento!</Text>
      <Text style={styles.emptySubtext}>Aguarde a cozinha/montagem finalizar pedidos de Delivery.</Text>
    </View>
  ), []);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <View style={styles.headerLeft}>
           {isFromAdmin ? (
               <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 5 }}>
                   <Ionicons name="arrow-back" size={28} color="#FFF" />
               </TouchableOpacity>
           ) : (
             <View>
              <Text style={styles.userInfoLabel}>Motorista(a),</Text>
              <Text style={styles.userInfo}>{user?.nome || user?.email}</Text>
             </View>
           )}
        </View>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Rotas Delivery</Text>
        </View>
        
        {/* Somente exibe logout se for o Entregador nativo na tab (Admin desloga na sua própria tela) */}
        {!isFromAdmin ? (
            <TouchableOpacity style={styles.logoutBtn} onPress={exitApp}>
            <Ionicons name="log-out-outline" size={24} color="#FFF" />
            </TouchableOpacity>
        ) : (
            <View style={styles.logoutBtn} /> /* Spacer */
        )}
      </View>

      {loading ? (
          <View style={[styles.emptyState, { flex: 1 }]}>
             <ActivityIndicator size="large" color="#8B2F2F" />
             <Text style={styles.emptyText}>Buscando entregas...</Text>
          </View>
      ) : (
        <OptimizedFlatList
            data={deliveryOrders}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            ListEmptyComponent={ListEmptyComponent}
            contentContainerStyle={styles.content}
            itemHeight={350}
            initialNumToRender={5}
            maxToRenderPerBatch={5}
            windowSize={5}
        />
      )}

      <StatusBar style="light" backgroundColor="#8B2F2F" />
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
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    zIndex: 10,
    ...Platform.select({
      web: { boxShadow: '0px 4px 15px rgba(0, 0, 0, 0.2)' },
      // @ts-ignore
      default: { elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 15 }
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
    color: '#FFF',
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
  },
  content: {
    padding: 15,
  },
  orderCard: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 18,
    marginBottom: 20,
    borderLeftWidth: 6,
    borderLeftColor: '#E5B84A', // Padrão: Preparando (Amarelo/Warning)
    ...Platform.select({
       // @ts-ignore
       default: { elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset:{width:0, height:2} }
    })
  },
  dispatchedCard: {
    borderLeftColor: '#2196F3', // Na rua (Azul)
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  comandaTag: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8B2F2F',
  },
  clientName: {
    fontSize: 15,
    color: '#555',
    fontWeight: '600',
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },
  infoBlock: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 10,
  },
  infoText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#444',
    flexShrink: 1,
  },
  infoTextBold: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2C2C2C',
  },
  actionLinkText: {
    color: '#2196F3',
    fontWeight: '600',
    fontSize: 13,
  },
  whatsappButtonSmall: {
    backgroundColor: '#25D366',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  whatsappTextSmall: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#EEE',
    marginVertical: 12,
  },
  itemsBlock: {
    marginBottom: 15,
    backgroundColor: '#F9F9F9',
    padding: 10,
    borderRadius: 8,
  },
  itemsBlockTitle: {
    fontSize: 12,
    color: '#777',
    marginBottom: 4,
    fontWeight: '600',
  },
  itemsBlockText: {
    fontSize: 13,
    color: '#333',
    lineHeight: 18,
  },
  orderObs: {
    marginTop: 8,
    fontSize: 13,
    fontStyle: 'italic',
    color: '#D32F2F',
    fontWeight: '600',
  },
  actionBtn: {
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 5,
  },
  btnWarning: {
    backgroundColor: '#E5B84A',
  },
  btnSuccess: {
    backgroundColor: '#4CAF50',
  },
  actionBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8B2F2F',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#777',
    textAlign: 'center',
  },
});
