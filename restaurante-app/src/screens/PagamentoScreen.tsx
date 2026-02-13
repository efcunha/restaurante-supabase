import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, Alert, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
// @ts-ignore
import PagamentosService from '../services/PagamentosService';
import { getTodayKey } from '../utils/dateUtils';
import { supabase } from '../config/SupabaseConfig';
import SplitPaymentModal from '../components/SplitPaymentModal';
import { colors } from '../theme/colors';
import { calcularPrecoItem } from '../utils/orderCalculator';

// Usar função centralizada para consistência de data local
const todayKey = getTodayKey;

export default function PagamentoScreen({ route, navigation }: any) {
  const { user } = useAuth();
  
  // Helper para formatar valores em Real brasileiro
  const formatarMoeda = (valor: any) => {
    if (valor === null || valor === undefined || isNaN(valor)) return 'R$ 0,00';
    const numero = parseFloat(valor);
    const partes = numero.toFixed(2).split('.');
    partes[0] = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return 'R$ ' + partes.join(',');
  };
  
  // --- STATE ---
  const [activeTab, setActiveTab] = useState<'completo' | 'rateio'>('completo');
  const [splitInitialMode, setSplitInitialMode] = useState<'pessoas' | 'itens'>('pessoas');

  const [comanda, setComanda] = useState('');
  const [forma, setForma] = useState('dinheiro');
  const [valor, setValor] = useState('');
  const [saldo, setSaldo] = useState<any>(null);

  const [isSplitModalVisible, setIsSplitModalVisible] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [paidItemsIds, setPaidItemsIds] = useState<string[]>([]);

  const openSplitModal = (mode: 'pessoas' | 'itens') => {
    setSplitInitialMode(mode);
    setIsSplitModalVisible(true);
  };

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
  }, [comanda]);

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
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('company_id', user.companyId)
        .eq('date_key', dateKey)
        .eq('comanda_number', comanda)
        .not('status', 'eq', 'cancelled');

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
                         const calc = calcularPrecoItem(item.name);
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
      
      const displayPaid = totalItemsAllocated;
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
    setActiveTab('completo'); 
  };

  const pagar = async () => {
    try {
      if (!valor || parseFloat(valor) <= 0) {
        Alert.alert('Erro', 'Informe um valor válido.');
        return;
      }

      const valorPago = parseFloat(valor);

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
    } catch (e) {
      navigation.navigate('ComandaList');
    }
  };

  const renderResumoItens = () => (
    <View style={styles.resumoContainer}>
      <Text style={styles.resumoTitle}>Resumo do Pedido</Text>
      {orders.map((order, idx) => (
        <View key={order.id || idx} style={styles.orderItemContainer}>
          {order.itemsWithStatus ? (
            order.itemsWithStatus.map((item: any, i: number) => (
              <View key={i} style={styles.itemRow}>
                <Text style={styles.itemText}>
                  {item.quantity || 1}x {item.name || item.nome}
                </Text>
                <Text style={styles.itemPrice}>
                  {item.price ? formatarMoeda(item.price) : '-'}
                </Text>
              </View>
            ))
          ) : (
            order.items && order.items.map((itemStr: string, i: number) => (
              <Text key={i} style={styles.itemTextSimple}>• {itemStr}</Text>
            ))
          )}
        </View>
      ))}
      {orders.length === 0 && (
          <Text style={{color: '#999', fontStyle: 'italic'}}>Nenhum pedido encontrado.</Text>
      )}
    </View>
  );

  // --- RENDER ---
  return (
    <View style={styles.container}>
      {/* HEADER PERSONALIZADO */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>RESUMO & PAGAMENTO</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {/* INFO DA COMANDA */}
        <View style={styles.comandaInfoCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
             <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Text style={styles.label}>Nº Comanda:</Text>
                <TextInput
                  style={[styles.input, { width: 60, marginLeft: 10, textAlign: 'center' }]}
                  value={comanda}
                  onChangeText={setComanda}
                  keyboardType="number-pad"
                  placeholder="Nº"
                />
             </View>
             <TouchableOpacity style={styles.searchBtn} onPress={carregarDadosComanda}>
               <Ionicons name="search" size={16} color="#FFF" />
             </TouchableOpacity>
          </View>

          {saldo && (
            <View style={styles.saldoRow}>
               <View>
                 <Text style={styles.saldoLabel}>Total</Text>
                 <Text style={styles.saldoValue}>{formatarMoeda(saldo.total)}</Text>
               </View>
               <View>
                 <Text style={styles.saldoLabel}>Pago</Text>
                 <Text style={[styles.saldoValue, { color: colors.success }]}>{formatarMoeda(saldo.pago)}</Text>
               </View>
               <View>
                 <Text style={styles.saldoLabel}>Aberto</Text>
                 <Text style={[styles.saldoValue, { color: colors.danger, fontWeight: 'bold' }]}>{formatarMoeda(saldo.aberto)}</Text>
               </View>
            </View>
          )}
        </View>

        {/* 1. RESUMO DO PEDIDO */}
        {renderResumoItens()}

        {/* 2. PAGAMENTO RÁPIDO */}
        {saldo && saldo.aberto > 0 && (
            <View style={styles.paymentSection}>
                <Text style={styles.sectionTitle}>Pagamento</Text>
                
                <View style={styles.paymentRow}>
                    <Text style={styles.paymentLabel}>Valor (R$):</Text>
                    <TextInput
                        style={styles.paymentInput}
                        value={valor}
                        onChangeText={setValor}
                        keyboardType="numeric"
                        placeholder="0,00"
                    />
                </View>

                <Text style={styles.subTitle}>Forma de Pagamento:</Text>
                <View style={styles.formaBtnContainer}>
                    {['dinheiro', 'pix', 'cartao_credito', 'cartao_debito'].map((f) => {
                       const isSelected = forma === f;
                       let bgColor = '#F5F5F5';
                       let borderColor = '#E0E0E0';
                       let textColor = '#333';
                       
                       // Define colors for each method
                       switch(f) {
                           case 'dinheiro': 
                              bgColor = isSelected ? '#4CAF50' : '#E8F5E9'; // Green 
                              borderColor = isSelected ? '#4CAF50' : '#C8E6C9';
                              textColor = isSelected ? '#FFF' : '#2E7D32';
                              break;
                           case 'pix': 
                              bgColor = isSelected ? '#32BCAD' : '#E0F2F1'; // Teal
                              borderColor = isSelected ? '#32BCAD' : '#B2DFDB';
                              textColor = isSelected ? '#FFF' : '#00695C';
                              break;
                           case 'cartao_debito': 
                              bgColor = isSelected ? '#2196F3' : '#E3F2FD'; // Blue
                              borderColor = isSelected ? '#2196F3' : '#BBDEFB';
                              textColor = isSelected ? '#FFF' : '#1565C0';
                              break;
                           case 'cartao_credito': 
                              bgColor = isSelected ? '#FF9800' : '#FFF3E0'; // Orange
                              borderColor = isSelected ? '#FF9800' : '#FFE0B2';
                              textColor = isSelected ? '#FFF' : '#EF6C00';
                              break;
                       }

                       return (
                        <TouchableOpacity
                            key={f}
                            style={[
                                styles.formaBtn, 
                                { 
                                    backgroundColor: bgColor,
                                    borderColor: borderColor,
                                    borderWidth: isSelected ? 2 : 1
                                }
                            ]}
                            onPress={() => setForma(f)}
                        >
                            <Text style={[
                                styles.formaBtnText, 
                                { color: textColor, fontWeight: isSelected ? 'bold' : 'normal' }
                            ]}>
                            {f.replace('_', ' ').toUpperCase()}
                            </Text>
                            {isSelected && (
                                <View style={{
                                    position: 'absolute', 
                                    right: 5, 
                                    top: 5, 
                                    backgroundColor: 'rgba(255,255,255,0.3)', 
                                    borderRadius: 10, 
                                    width: 16, 
                                    height: 16, 
                                    alignItems: 'center', 
                                    justifyContent: 'center'
                                }}>
                                    <Ionicons name="checkmark" size={10} color="#FFF" />
                                </View>
                            )}
                        </TouchableOpacity>
                       );
                    })}
                </View>

                <TouchableOpacity style={styles.payBtn} onPress={pagar}>
                    <Text style={styles.payBtnText}>CONFIRMAR PAGAMENTO</Text>
                </TouchableOpacity>
            </View>
        )}

        {/* 3. OPÇÕES DE DIVISÃO ALTERNATIVAS */}
        {saldo && saldo.aberto > 0 && (
            <View style={styles.splitSection}>
              <Text style={styles.sectionTitle}>Opções de Divisão</Text>
              
              <View style={styles.splitButtonsRow}>
                  <TouchableOpacity style={styles.splitBtn} onPress={() => openSplitModal('pessoas')}>
                    <Ionicons name="people-outline" size={20} color="#007BFF" />
                    <Text style={styles.splitBtnText}>Por Pessoas</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.splitBtn} onPress={() => openSplitModal('itens')}>
                    <Ionicons name="list-outline" size={20} color="#28A745" />
                    <Text style={styles.splitBtnText}>Por Itens</Text>
                  </TouchableOpacity>
              </View>
            </View>
        )}
      </ScrollView>
      
      <SplitPaymentModal
        visible={isSplitModalVisible}
        onClose={() => setIsSplitModalVisible(false)}
        onConfirmPayment={handleSplitPayment}
        totalAmount={saldo?.aberto || 0}
        orders={orders}
        initialMode={splitInitialMode}
      />
      
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: colors.primary,
    elevation: 4,
  },
  backBtn: { padding: 5 },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  
  comandaInfoCard: {
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 10,
    elevation: 2,
    marginBottom: 20
  },
  label: { fontSize: 16, fontWeight: '600', color: '#333' },
  input: {
    backgroundColor: '#F9F9F9',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 8,
    fontSize: 16
  },
  searchBtn: { backgroundColor: colors.primary, padding: 10, borderRadius: 8 },
  
  saldoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#EEE'
  },
  saldoLabel: { fontSize: 12, color: '#666' },
  saldoValue: { fontSize: 18, fontWeight: 'bold', color: '#333' },

  // Resumo styles
  resumoContainer: {
    marginBottom: 20,
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 10,
    elevation: 2
  },
  resumoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    paddingBottom: 5
  },
  orderItemContainer: {
    marginBottom: 5,
    paddingBottom: 5
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4
  },
  itemText: {
    fontSize: 14,
    color: '#333',
    flex: 1
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555'
  },
  itemTextSimple: {
    fontSize: 14,
    color: '#333'
  },

  // Payment Section
  paymentSection: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 10,
    elevation: 2,
    marginBottom: 20
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15
  },
  paymentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 15
  },
  paymentLabel: {
      fontSize: 16,
      marginRight: 10,
      color: '#333'
  },
  paymentInput: {
      flex: 1,
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.success,
      borderBottomWidth: 1,
      borderBottomColor: '#EEE',
      padding: 5
  },
  subTitle: {
      fontSize: 14,
      color: '#666',
      marginBottom: 10
  },
  formaBtnContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 15 },
  formaBtn: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 14, // increased for touch target
    paddingHorizontal: 12,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    minWidth: '45%', // slightly wider
    alignItems: 'center'
  },
  formaBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  formaBtnText: { color: '#333', fontSize: 16, fontWeight: 'bold' }, // Significantly bigger
  formaBtnTextActive: { color: '#fff', fontWeight: 'bold' },
  
  payBtn: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 5
  },
  payBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },

  // Split Section
  splitSection: {
      marginTop: 10
  },
  splitButtonsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between'
  },
  splitBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 12,
      backgroundColor: '#FFF',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#DDD',
      marginHorizontal: 5
  },
  splitBtnText: {
      marginLeft: 8,
      fontWeight: '600',
      color: '#333'
  }
});
