import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Alert, Text, View } from 'react-native';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
// @ts-ignore
import PagamentosService from '../services/PagamentosService';
// @ts-ignore
import OrderService from '../services/OrderService';
import { getTodayKey } from '../utils/dateUtils';
import { supabase } from '../config/SupabaseConfig';
import SplitPaymentModal from '../components/SplitPaymentModal';
import { calcularPrecoItem, MenuItem } from '../utils/orderCalculator';
import { ScreenScaffold } from '../layouts/ScreenScaffold';
import { PaymentActionPanel, PaymentComandaSummary, PaymentOrderSummary, PaymentStepIndicator } from '../features/payments';
import type { ExternalPosPaymentData, PaymentMode } from '../features/payments/types';
import { isFeatureEnabled } from '../config/featureFlags';
import { auditService } from '../services/AuditService';
import { useDevicePayment } from '../features/pdv';

// Usar função centralizada para consistência de data local
const todayKey = getTodayKey;

export default function PagamentoScreen({ route, navigation }: any) {
  const { user } = useAuth();
  const initialPaymentMode = (route.params?.paymentMode as PaymentMode | undefined) ?? 'normal';
  const useUiNextPagamento = isFeatureEnabled('pagamento_uiNext');
  const pdvDevicePaymentEnabled = isFeatureEnabled('pdv_enabled') && isFeatureEnabled('pdv_devicePayment_enabled');
  const pdvExternalPosEnabled = isFeatureEnabled('pdv_enabled') && isFeatureEnabled('pdv_externalPos_enabled');
  const { isProcessing: isDevicePaymentProcessing, startPayment: startDevicePayment } = useDevicePayment();
  
  // Helper para formatar valores em Real brasileiro
  const formatarMoeda = (valor: any) => {
    if (valor === null || valor === undefined || isNaN(valor)) return 'R$ 0,00';
    const numero = parseFloat(valor);
    const partes = numero.toFixed(2).split('.');
    partes[0] = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return 'R$ ' + partes.join(',');
  };
  
  // --- STATE ---
  const [splitInitialMode, setSplitInitialMode] = useState<'pessoas' | 'itens'>('pessoas');

  const [comanda, setComanda] = useState('');
  const [forma, setForma] = useState('dinheiro');
  const [valor, setValor] = useState('');
  const [saldo, setSaldo] = useState<any>(null);

  const [isSplitModalVisible, setIsSplitModalVisible] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [paidItemsIds, setPaidItemsIds] = useState<string[]>([]);
  const [cardapioDin, setCardapioDin] = useState<MenuItem[]>([]);

  const openSplitModal = (mode: 'pessoas' | 'itens') => {
    setSplitInitialMode(mode);
    setIsSplitModalVisible(true);
  };

  // DEBUG: Log feature flags on mount
  useEffect(() => {
    console.log('[PagamentoScreen] Feature Flags:', {
      pdvDevicePaymentEnabled,
      pdvExternalPosEnabled,
    });
  }, [pdvDevicePaymentEnabled, pdvExternalPosEnabled]);

  // Carregar comanda se vier por navegação
  useEffect(() => {
    if (route.params?.comandaNumber) {
      setComanda(String(route.params.comandaNumber));
    }
  }, [route.params?.comandaNumber]);

  // Effect para buscar quando comanda muda e foi setada via params
  useEffect(() => {
    if (route.params?.comandaNumber && comanda === String(route.params.comandaNumber)) {
      carregarDadosComanda();
    }
    
    // 🔒 REALTIME: Subscribe to changes in Orders to reflect payment status instantly
    // The user complained that items don't update as paid.
    // This is because we were only fetching once.
    if (user?.companyId && comanda) {
        // Subscribe to Orders
        const channelByComanda = supabase.channel(`orders-comanda-${comanda}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'orders',
              filter: `company_id=eq.${user.companyId}` 
              // Note: We can't easily filter by comanda_number in realtime filter string if it's not a direct column or if types mismatch.
              // But 'company_id' is safe. We will filter in callback.
            },
            (payload) => {
              // Refresh if the order belongs to this comanda
              // @ts-ignore
              if (payload.new && String(payload.new.comanda_number) === String(comanda)) {
                  console.log('[PagamentoScreen] Realtime update for Order in this Comanda');
                  carregarDadosComanda();
              } else if (payload.old && payload.eventType === 'DELETE') {
                  carregarDadosComanda();
              }
            }
          )
          .subscribe();

        return () => {
            supabase.removeChannel(channelByComanda);
        };
    }
  }, [comanda, user?.companyId]);

  const carregarSaldo = async () => {
    try {
      if (!user?.companyId || !comanda) return;
      const dateKey = todayKey();

      // 1. Fetch Comanda (Financial Data)
      const { data: comandaData, error: comandaError } = await supabase
        .from('comandas')
        .select('*')
        .eq('company_id', user.companyId)
        .eq('date_key', dateKey)
        .eq('comanda_number', comanda)
        .single();

      if (comandaError || !comandaData) throw new Error('Comanda não encontrada');

      // 2. Fetch Orders (Operational Data - Items)
      const { data: ordersData } = await supabase
        .from('orders')
        .select('*')
        .eq('company_id', user.companyId)
        .eq('date_key', dateKey)
        .eq('comanda_number', comanda)
        .not('status', 'eq', 'cancelled');

      // 2.5 Fetch Products for accurate pricing
      const { data: produtos } = await supabase
        .from('products')
        .select('name, price')
        .eq('company_id', user.companyId)
        .eq('available', true);
      
      const currentCardapio = (produtos || []).map(p => ({
        name: p.name,
        price: Number(p.price)
      }));
      setCardapioDin(currentCardapio);

      // 3. Calculate "Operational Paid" (Sum of Paid Items)
      let totalItemsAllocated = 0; 
      let totalConsumedReal = 0;   
      
      if (ordersData) {
          ordersData.forEach((o: any) => {
              totalConsumedReal += (Number(o.total_amount) || 0);
              
              const items = o.items_with_status || [];
              
              if (items.length > 0) {
                  items.forEach((item: any) => {
                     // @ts-ignore
                     const qty = item.quantity || 1;
                     // @ts-ignore
                     const paidQty = item.paid_quantity || (item.paid ? qty : 0);
                     
                     // Get Price
                     // @ts-ignore
                     let price = item.unitPrice || item.price || 0;
                     if (!price && item.name) {
                         const calc = calcularPrecoItem(item.name, currentCardapio);
                         price = calc.precoUnitario;
                     }
                     
                     // Fallback check
                     if (price <= 0 && o.total_amount > 0 && o.items && o.items.length > 0) {
                        price = o.total_amount / o.items.length;
                     }
                     
                     if (price > 0) {
                         totalItemsAllocated += (paidQty * price);
                     }
                  });
              } else if (o.is_paid) {
                  totalItemsAllocated += (Number(o.total_amount) || 0);
              }
          });
      }

      // 4. Reconciliation Logic
      const financialTotal = Number(comandaData.total_consumed) || 0;
      const financialPaid = Number(comandaData.total_paid) || 0;
      
      const realTotal = totalConsumedReal > 0 ? totalConsumedReal : financialTotal;
      
      const displayPaid = Math.max(totalItemsAllocated, financialPaid);
      const displayOpen = Math.max(0, realTotal - displayPaid);

      setSaldo({
        total: realTotal,
        pago: displayPaid,
        aberto: displayOpen,
      });

      if (displayOpen > 0) {
        setValor(displayOpen.toFixed(2));
      }
    } catch (e: any) { 
        console.error('Erro ao carregar saldo:', e);
        Alert.alert('Erro', e.message); 
    }
  };

  const carregarDadosComanda = async () => {
    if (!user?.companyId || !comanda) return;
    await Promise.all([carregarSaldo(), carregarPedidos()]);
  };
  const carregarPedidos = async () => {
    try {
      const dateKey = todayKey();
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('company_id', user?.companyId)
        .eq('date_key', dateKey)
        .eq('comanda_number', comanda)
        .not('status', 'eq', 'cancelled');

      if (!error && data) {
         const mappedOrders = data.map((o: any) => ({
           ...o, // Pass all DB fields (comanda_number, etc)
           id: o.id,
           items: o.items,
           itemsWithStatus: o.items_with_status,
           totalPrice: o.total_amount,
           comandaNumber: o.comanda_number
         }));
         setOrders(mappedOrders);
      }
    } catch (e) {
      console.log('Erro ao carregar pedidos:', e);
    }
  };

  const handleSplitPayment = (valorDividido: number, itemsIds?: string[]) => {
    setValor(valorDividido.toFixed(2));
    if (itemsIds) {
      setPaidItemsIds(itemsIds);
    } else {
      setPaidItemsIds([]);
    }
    setIsSplitModalVisible(false);
  };

  const cancelUndeliveredAndRetryPayment = async (undeliveredItems: any[], valorPago: number) => {
    try {
      if (!user?.companyId) return;
      const dateKey = todayKey();
      
      // 🔄 Cancelar cada item não entregue
      for (const item of undeliveredItems) {
        const order = orders.find(o => o.itemsWithStatus?.some((it: any) => it.id === item.id));
        if (order) {
          const previousItem = order.itemsWithStatus?.find((it: any) => it.id === item.id);
          const cancelledOrder = OrderService.cancelItem(order, item.id);
          
          // Atualizar no banco
          const { error: updateError } = await supabase
            .from('orders')
            .update({ items_with_status: cancelledOrder.itemsWithStatus })
            .eq('id', order.id);
          
          if (updateError) {
            throw new Error(`Erro ao cancelar item ${item.name}: ${updateError.message}`);
          }

          await auditService.log({
            eventType: 'order.item_cancelled',
            resourceType: 'order',
            resourceId: String(order.id),
            companyId: user.companyId,
            metadata: {
              source: 'payment_undelivered_confirmation',
              comandaNumber: comanda,
              orderId: order.id,
              itemId: item.id,
              itemName: item.name,
              quantity: Number(previousItem?.quantity || item.quantity || 1),
              estimatedValue: Number(previousItem?.unitPrice || 0) * Number(previousItem?.quantity || item.quantity || 1),
            },
          });
        }
      }
      
      // 🔄 Recalcular totais da comanda
      const ComandasService = require('../services/ComandasService').default;
      await ComandasService.recalcularTotalComandaAposItemCancelado(user.companyId, comanda);
      
      // ✅ Tentar pagamento novamente
      await PagamentosService.registrarPagamento({
        companyId: user.companyId,
        dateKey: dateKey,
        comandaNumber: comanda,
        forma,
        valor: valorPago,
        usuarioId: user?.id || '',
        usuarioNome: user?.nome || 'Usuário',
        paidItemsIds: paidItemsIds.length > 0 ? paidItemsIds : undefined
      });
      
      setPaidItemsIds([]);
      await new Promise(resolve => setTimeout(resolve, 200));
      await carregarDadosComanda();
      setValor('');
      
      Alert.alert(
        'Sucesso',
        `${undeliveredItems.length} item(ns) cancelado(s) e pagamento registrado! Saldo atualizado.`
      );
    } catch (e: any) {
      Alert.alert('Erro ao cancelar e pagar', e.message);
    }
  };

  const pagar = async () => {
    const valorPago = parseFloat(valor || '0');

    try {
      if (!valor || valorPago <= 0) {
        Alert.alert('Erro', 'Informe um valor válido.');
        return;
      }

      await PagamentosService.registrarPagamento({
        companyId: user?.companyId || '',
        dateKey: todayKey(),
        comandaNumber: comanda,
        forma,
        valor: valorPago,
        usuarioId: user?.id || '',
        usuarioNome: user?.nome || 'Usuário',
        paidItemsIds: paidItemsIds.length > 0 ? paidItemsIds : undefined
      });
      
      setPaidItemsIds([]);
      
      await new Promise(resolve => setTimeout(resolve, 200));
      await carregarDadosComanda();
      
      setValor(''); // Clear value after payment
      Alert.alert('Sucesso', 'Pagamento registrado! Saldo atualizado.');

    } catch (e: any) {
      // 🔒 TRATAMENTO ESPECIAL: Itens não entregues
      if (e.code === 'UNDELIVERED_ITEMS' && e.undeliveredItems) {
        const itemsList = e.undeliveredItems
          .map((item: any) => `• ${item.name || item.id} (${item.quantity}x)`)
          .join('\n');
        
        Alert.alert(
          'Itens não entregues',
          `Existem itens não entregues nesta comanda:\n\n${itemsList}\n\nDeseja cancelá-los para prosseguir com o pagamento?`,
          [
            { text: 'Cancelar', onPress: () => {}, style: 'cancel' },
            {
              text: 'Cancelar itens e pagar',
              onPress: () => cancelUndeliveredAndRetryPayment(e.undeliveredItems, valorPago),
              style: 'default'
            }
          ]
        );
      } else {
        // Erro genérico
        Alert.alert('Erro', e.message);
      }
    }
  };

  const pagarViaMaquininha = async () => {
    try {
      if (!pdvDevicePaymentEnabled) {
        Alert.alert('Maquininha indisponível', 'Fluxo de maquininha desabilitado para esta empresa.');
        return;
      }

      if (!user?.companyId || !comanda) {
        Alert.alert('Erro', 'Selecione uma comanda válida antes de iniciar maquininha.');
        return;
      }

      const valorPago = parseFloat(valor || '0');
      if (!valor || Number.isNaN(valorPago) || valorPago <= 0) {
        Alert.alert('Erro', 'Informe um valor válido para processar na maquininha.');
        return;
      }

      const paymentMethod = forma === 'cartao_credito' ? 'cartao_credito' : 'cartao_debito';
      const result = await startDevicePayment({
        companyId: user.companyId,
        comandaNumber: String(comanda),
        amount: valorPago,
        paymentMethod,
      });

      if (result.status === 'processing') {
        Alert.alert(
          'Maquininha em processamento',
          result.message || 'Pagamento iniciado. Aguarde a confirmacao da maquininha.'
        );
        return;
      }

      if (result.status !== 'approved') {
        Alert.alert('Maquininha', result.message);
        return;
      }

      Alert.alert(
        'Maquininha aprovada',
        'Transação autorizada. Confirme o pagamento para registrar na comanda.'
      );
    } catch (error: any) {
      Alert.alert('Erro', error?.message || 'Falha ao processar pagamento presencial.');
    }
  };

  const registrarPagamentoExterno = async (data: ExternalPosPaymentData) => {
    try {
      if (!user?.companyId || !comanda) {
        Alert.alert('Erro', 'Selecione uma comanda válida.');
        return;
      }

      await PagamentosService.registrarPagamento({
        companyId: user.companyId,
        dateKey: todayKey(),
        comandaNumber: comanda,
        forma: data.cardType,
        valor: data.amount,
        usuarioId: user?.id || '',
        usuarioNome: user?.nome || 'Usuário',
      });

      await auditService.log({
        eventType: 'payment.manual_recorded',
        resourceType: 'payment',
        resourceId: String(comanda),
        companyId: user.companyId,
        metadata: {
          source: 'EXTERNAL_POS',
          comandaNumber: comanda,
          amount: data.amount,
          cardType: data.cardType,
          nsu: data.nsu ?? null,
          cardLast4: data.cardLast4 ?? null,
          note: data.note ?? null,
          idempotencyKey: data.idempotencyKey,
          operatorId: user?.id,
          operatorName: user?.nome,
        },
      });

      await new Promise(resolve => setTimeout(resolve, 200));
      await carregarDadosComanda();
      setValor('');
      Alert.alert('Sucesso', 'Recebimento externo registrado! Saldo atualizado.');
    } catch (e: any) {
      Alert.alert('Erro', e.message);
    }
  };

  const handleBack = () => {
    try {
      if (route.params?.returnScreen === 'Mapa') {
        // Reset the Comanda stack to List so it doesn't get stuck on Payment
        navigation.navigate('ComandaList'); 
        
        // Then go to Mapa and open the modal
        setTimeout(() => {
             navigation.navigate('Mapa', { 
                openOrderId: route.params.returnOrderId 
            });
        }, 50);
        return;
      }

      if (route.params?.returnScreen === 'ComandaGerenciamento') {
          navigation.navigate('ComandaList', {
              searchComanda: route.params.comandaNumber
          });
          return;
      }
      
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('ComandaList');
      }
    } catch {
      navigation.navigate('ComandaList');
    }
  };

  // --- RENDER ---
  const activeStep = !saldo ? 0 : saldo.aberto > 0 ? 1 : 2;
  const paymentSteps = ['Resumo', 'Pagamento', 'Confirmado'];

  return (
    <ScreenScaffold
      title="Resumo e Pagamento"
      subtitle={comanda ? `Comanda ${comanda}` : 'Consulta e fechamento'}
      leftAction={{ label: 'Voltar', onPress: handleBack }}
      scroll
      contentContainerStyle={styles.contentContainer}
    >
      <PaymentStepIndicator activeStep={activeStep} steps={paymentSteps} />

        {/* INFO DA COMANDA */}
        <PaymentComandaSummary
          comanda={comanda}
          onChangeComanda={setComanda}
          onSearch={carregarDadosComanda}
          saldo={saldo}
          formatCurrency={formatarMoeda}
          useUiNext={useUiNextPagamento}
        />

        {/* 1. RESUMO DO PEDIDO */}
        <PaymentOrderSummary orders={orders} formatCurrency={formatarMoeda} />

        {/* 2. PAGAMENTO RÁPIDO */}
        {saldo && saldo.aberto > 0 && (
          <PaymentActionPanel
            valor={valor}
            onChangeValor={setValor}
            forma={forma}
            onChangeForma={setForma}
            onConfirmPayment={pagar}
            onSplitByPeople={() => openSplitModal('pessoas')}
            onSplitByItems={() => openSplitModal('itens')}
            onUseDevicePayment={pagarViaMaquininha}
            showDevicePaymentAction={pdvDevicePaymentEnabled}
            isDevicePaymentBusy={isDevicePaymentProcessing}
            onExternalPosPayment={registrarPagamentoExterno}
            showExternalPosOption={pdvExternalPosEnabled}
            initialMode={initialPaymentMode}
            useUiNext={useUiNextPagamento}
          />
        )}

        {saldo && saldo.aberto <= 0 && (pdvDevicePaymentEnabled || pdvExternalPosEnabled) && (
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              O PDV fica visivel apenas quando a comanda tem saldo em aberto. Esta comanda ja esta quitada.
            </Text>
          </View>
        )}
      
      <SplitPaymentModal
        visible={isSplitModalVisible}
        onClose={() => setIsSplitModalVisible(false)}
        onConfirmPayment={handleSplitPayment}
        totalAmount={saldo?.aberto || 0}
        orders={orders}
        initialMode={splitInitialMode}
        menuItems={cardapioDin}
      />
      
      <StatusBar style="light" />
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    padding: 20,
  },
  infoBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
  },
  infoText: {
    color: '#1D4ED8',
    fontSize: 14,
    lineHeight: 20,
  },
});
