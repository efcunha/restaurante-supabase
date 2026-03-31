import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, Alert, Platform, Linking, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/SupabaseConfig';
import { getBusinessDateKey } from '../services/BusinessDateService';
import { exitApp } from '../utils/appUtils';
import { EvolutionApiService } from '../services/EvolutionApiService';
import OptimizedFlatList from '../components/OptimizedFlatList';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';

type DeliveryStatus = 'dispatched' | 'delivered' | 'failed_delivery' | 'returned' | 'refused';

const DELIVERY_NOTIFICATION_STATUSES: DeliveryStatus[] = ['dispatched', 'delivered'];

export default function RotasDeliveryScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  
  const [loading, setLoading] = useState(true);
  const [deliveryOrders, setDeliveryOrders] = useState<any[]>([]);
  const [processingItems, setProcessingItems] = useState(new Set());

  const ensureWhatsAppConnectionForDelivery = useCallback(async (status: DeliveryStatus) => {
    if (!user?.companyId || !DELIVERY_NOTIFICATION_STATUSES.includes(status)) {
      return true;
    }

    try {
      const stateData = await EvolutionApiService.getConnectionState(user.companyId);
      const instanceState = String((stateData as any)?.instance?.state || stateData?.state || '').toLowerCase();

      if (!instanceState || instanceState === 'open' || instanceState === 'connected') {
        return true;
      }

      Alert.alert(
        'Aviso de notificação',
        `A instância do WhatsApp não está conectada${instanceState ? ` (${instanceState})` : ''}. O pedido será atualizado normalmente, mas a notificação automática pode falhar.`
      );
      return true;
    } catch (error) {
      console.warn('[RotasDelivery] Falha ao verificar conexão WhatsApp:', error);
      return true;
    }
  }, [user?.companyId]);

  // Detecta se o App Header padrão de Stack está presente (caso o Admin navegue para cá a partir do botão)
  // Em Tab views, o header do SafeArea próprio assumirá o visual.
  const isFromAdmin = user?.funcao === 'admin' || user?.funcao === 'gerente';

  const fetchDeliveryOrders = useCallback(async () => {
    try {
      if (!user?.companyId) return;
      const today = await getBusinessDateKey(user.companyId);

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

  const closeDeliveryComandaIfSettled = async (order: any) => {
    if (!user?.companyId || !order?.comandaNumber) return;

    const dateKey = await getBusinessDateKey(user.companyId);
    const comandaNumber = String(order.comandaNumber);

    try {
      const { data: comandaOrders, error: ordersError } = await supabase
        .from('orders')
        .select('id, is_paid, status')
        .eq('company_id', user.companyId)
        .eq('date_key', dateKey)
        .eq('comanda_number', comandaNumber);

      if (ordersError) throw ordersError;

      const activeOrders = (comandaOrders || []).filter((o: any) => {
        const st = String(o.status || '').toLowerCase();
        return st !== 'cancelled' && st !== 'cancelada';
      });

      const allPaid = activeOrders.length > 0 && activeOrders.every((o: any) => (
        o.is_paid === true || o.is_paid === 'true' || o.is_paid === 1
      ));

      if (!allPaid) return;

      const operatorName = user?.nome || user?.email || 'Motoboy';
      const { error: comandaError } = await supabase
        .from('comandas')
        .update({
          status: 'fechada',
          open_balance: 0,
          closed_at: new Date().toISOString(),
          closed_by: user?.id || null,
          closed_by_name: operatorName
        })
        .eq('company_id', user.companyId)
        .eq('date_key', dateKey)
        .eq('comanda_number', comandaNumber)
        .neq('status', 'cancelada');

      if (comandaError) throw comandaError;

      await supabase
        .from('orders')
        .update({ comanda_status: 'fechada' })
        .eq('company_id', user.companyId)
        .eq('date_key', dateKey)
        .eq('comanda_number', comandaNumber)
        .neq('status', 'cancelada');
    } catch (error) {
      console.error('[RotasDelivery] Falha ao fechar comanda de delivery:', error);
    }
  };

  const updateOrderStatus = async (
    orderId: string,
    novoStatus: DeliveryStatus,
    reasonText?: string
    ) => {
      try {
        const shouldProceed = await ensureWhatsAppConnectionForDelivery(novoStatus);
        if (!shouldProceed) return;

        setProcessingItems(prev => new Set([...prev, orderId]));
        
        const nowIso = new Date().toISOString();
        const updatePayload: any = {
            status: novoStatus,
            updated_at: nowIso
        };

        const order = deliveryOrders.find(o => o.id === orderId);

      // Ao confirmar entrega, baixa financeira e comanda para não manter Delivery em aberto no gerenciamento.
        if (order && novoStatus === 'delivered') {
            updatePayload.is_paid = true;
            updatePayload.delivered_at = nowIso;
            updatePayload.comanda_status = 'fechada';

            if (order.itemsWithStatus) {
              updatePayload.items_with_status = order.itemsWithStatus.map((item: any) => ({
                  ...item,
                  delivered: true,
                  deliveredAt: nowIso,
                  paid: true,
                  paid_quantity: Number(item.quantity || 1)
              }));
            }
        }

      // Para falha/devolucao, registra motivo no campo de observacoes para auditoria operacional.
      if (order && reasonText && ['failed_delivery', 'returned', 'refused'].includes(novoStatus)) {
        const previousObs = String(order.observations || '').trim();
        const operatorName = user?.nome || user?.name || user?.email || 'Operador nao identificado';
        const reasonLine = `[${new Date().toLocaleString('pt-BR')}] Entrega nao concluida por ${operatorName}: ${reasonText}`;
        updatePayload.observations = previousObs ? `${previousObs}\n${reasonLine}` : reasonLine;
      }

        const { error } = await supabase
            .from('orders')
            .update(updatePayload)
            .eq('id', orderId)
            // @ts-ignore
            .eq('company_id', user.companyId);

        if (error) throw error;

        // Envia notificacao WhatsApp quando entregador sai com a entrega
        if (novoStatus === 'dispatched' && order?.customer_phone && user?.companyId) {
          try {
            const comandaNumber = order.comanda_number || order.numeroComanda || '#';
            const customerName = order.customerName || 'Cliente';
            const message = `Olá ${customerName}! O motoboy saiu com sua entrega da comanda ${comandaNumber}. Acompanhe o status em tempo real!`;
            
            await EvolutionApiService.sendTextMessage(user.companyId, order.customer_phone, message);
            console.log('[RotasDelivery] WhatsApp enviado com sucesso para status dispatched');
          } catch (notificationError) {
            console.warn('[RotasDelivery] Erro ao enviar WhatsApp para status dispatched:', notificationError);
            // Não quebra o fluxo se o envio de WhatsApp falhar
          }
        }

        if (novoStatus === 'delivered' && order) {
          await closeDeliveryComandaIfSettled(order);
        }

           // Estados finais nao ficam na lista de rotas pendentes.
           if (['delivered', 'failed_delivery', 'returned', 'refused'].includes(novoStatus)) {
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

  const handleUndeliveredAction = (order: any) => {
      Alert.alert(
          'Entrega nao concluida',
          'Selecione o motivo principal.',
          [
              {
                  text: 'Cliente/local nao encontrado',
                  onPress: () => updateOrderStatus(order.id, 'failed_delivery', 'Cliente/local nao encontrado')
              },
              {
                  text: 'Recusa ou devolucao',
                  onPress: () => {
                    Alert.alert(
                      'Recusa ou devolucao',
                      'Escolha o desfecho:',
                      [
                        {
                          text: 'Cliente recusou',
                          onPress: () => updateOrderStatus(order.id, 'refused', 'Cliente recusou o pedido na entrega')
                        },
                        {
                          text: 'Produto devolvido',
                          onPress: () => updateOrderStatus(order.id, 'returned', 'Pedido devolvido para a loja')
                        },
                        { text: 'Cancelar', style: 'cancel' }
                      ]
                    );
                  }
              },
              { text: 'Cancelar', style: 'cancel' }
          ]
      );
  };

  const handleAction = (order: any) => {
      // Regra de Negócio Delivery:
      // Se status for 'pronto' (Cozinha e Montagem OK), ele muda para 'dispatched' (Saiu p/ entrega).
      // Se status for 'dispatched', ele muda para 'delivered' (Acabou).
      
      const currentStatus = order.status;

      if (currentStatus === 'pronto' || currentStatus === 'ready') {
          updateOrderStatus(order.id, 'dispatched');
      } else if (currentStatus === 'dispatched') {
          if (Platform.OS === 'web') {
            const confirmed = window.confirm('Confirmar entrega com sucesso?');
            if (confirmed) {
              updateOrderStatus(order.id, 'delivered');
            }
            return;
          }

          Alert.alert(
            'Confirmar Entrega',
            'Confirme o desfecho desta rota.',
            [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Nao entregue', style: 'destructive', onPress: () => handleUndeliveredAction(order) },
              { text: 'Sim, entregue com sucesso', style: 'default', onPress: () => updateOrderStatus(order.id, 'delivered') }
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
               <Ionicons name="location" size={20} color={colors.primary} />
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
               <Ionicons name="wallet" size={20} color={colors.secondary} />
               <Text style={styles.infoTextBold}>{item.paymentMethod || 'A Confirmar na Entrega'}</Text>
            </View>
            
            {!!item.customerPhone && (
                <TouchableOpacity style={styles.whatsappButtonSmall} onPress={() => openWhatsApp(item.customerPhone, item.customerName)}>
                   <Ionicons name="logo-whatsapp" size={16} color={colors.white} />
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
              <ActivityIndicator color={colors.white} />
          ) : (
              <Text style={styles.actionBtnText}>
                {isDispatched ? '✅ ENTREGUE COM SUCESSO' : '🚚 SAIU PARA ENTREGA'}
              </Text>
          )}
        </TouchableOpacity>

        {isDispatched && (
          <TouchableOpacity
            style={styles.secondaryActionBtn}
            onPress={() => handleUndeliveredAction(item)}
            // @ts-ignore
            disabled={processingItems.has(item.id)}
          >
            <Text style={styles.secondaryActionBtnText}>NAO FOI POSSIVEL ENTREGAR</Text>
          </TouchableOpacity>
        )}
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
        <View style={styles.headerLeft} />
        <View style={styles.headerCenter}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="map-outline" size={24} color={colors.white} style={{ marginRight: 6 }} />
            <Text style={styles.headerTitle}>Rotas Delivery</Text>
          </View>
          {!!user && <Text style={styles.userInfo}>Operador: {user?.nome || user?.email}</Text>}
        </View>

        {/* Somente exibe logout se for o Entregador nativo na tab (Admin usa botão voltar) */}
        <View style={styles.headerRight}>
          {isFromAdmin ? (
            <TouchableOpacity style={styles.logoutBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back-outline" size={24} color={colors.white} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.logoutBtn} onPress={exitApp}>
              <Ionicons name="log-out-outline" size={24} color={colors.white} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
          <View style={[styles.emptyState, { flex: 1 }]}>
             <ActivityIndicator size="large" color={colors.primary} />
             <Text style={styles.emptyText}>Buscando entregas...</Text>
          </View>
      ) : (
        <OptimizedFlatList
            data={deliveryOrders}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            ListEmptyComponent={ListEmptyComponent}
            contentContainerStyle={styles.content}
          itemHeight={420}
            initialNumToRender={5}
            maxToRenderPerBatch={5}
            windowSize={5}
        />
      )}

      <StatusBar style="light" backgroundColor={colors.primary} />
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
    ...Platform.select({
      web: { boxShadow: '0px 4px 15px rgba(0, 0, 0, 0.2)' },
      // @ts-ignore
      default: { elevation: 8, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 15 }
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
  logoutSpacer: {
    width: 44,
    height: 40,
  },
  content: {
    padding: 15,
  },
  orderCard: {
    backgroundColor: colors.white,
    borderRadius: 15,
    padding: 18,
    marginBottom: 20,
    borderLeftWidth: 6,
    borderLeftColor: colors.secondary, // Padrão: Preparando (Amarelo/Warning)
    ...Platform.select({
       // @ts-ignore
       default: { elevation: 4, shadowColor: colors.shadow, shadowOpacity: 0.1, shadowRadius: 8, shadowOffset:{width:0, height:2} }
    })
  },
  dispatchedCard: {
    borderLeftColor: colors.secondary, // Na rua (Azul)
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
    color: colors.primary,
  },
  clientName: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.text,
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
    color: colors.text,
    flexShrink: 1,
  },
  infoTextBold: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
  },
  actionLinkText: {
    color: colors.secondary,
    fontWeight: '600',
    fontSize: 13,
  },
  whatsappButtonSmall: {
    backgroundColor: colors.success,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  whatsappTextSmall: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
  },
  itemsBlock: {
    marginBottom: 15,
    backgroundColor: colors.surfaceMuted,
    padding: 10,
    borderRadius: 8,
  },
  itemsBlockTitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
    fontWeight: '600',
  },
  itemsBlockText: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  orderObs: {
    marginTop: 8,
    fontSize: 13,
    fontStyle: 'italic',
    color: colors.danger,
    fontWeight: '600',
  },
  actionBtn: {
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 5,
  },
  btnWarning: {
    backgroundColor: colors.secondary,
  },
  btnSuccess: {
    backgroundColor: colors.success,
  },
  actionBtnText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  secondaryActionBtn: {
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: colors.white,
    alignItems: 'center',
  },
  secondaryActionBtnText: {
    color: colors.danger,
    fontWeight: '700',
    fontSize: 13,
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
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
