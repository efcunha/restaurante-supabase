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
      
      const { data, error } = await supabase
        .from('comandas')
        .select('*')
        .eq('company_id', user.companyId)
        .eq('date_key', dateKey)
        .eq('comanda_number', comanda)
        .single();

      if (error || !data) throw new Error('Comanda não encontrada');

      setSaldo({
        total: data.total_consumed || 0,
        pago: data.total_paid || 0,
        aberto: data.open_balance || 0,
      });
    } catch (e: any) { Alert.alert('Erro', e.message); }
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
           id: o.id,
           items: o.items,
           itemsWithStatus: o.items_with_status,
           totalPrice: o.total_amount
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
      
      setValor('');
      Alert.alert('Sucesso', 'Pagamento registrado! Saldo atualizado.');

    } catch (e: any) {
      Alert.alert('Erro', e.message);
    }
  };

  const handleBack = () => {
    try {
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
        <Text style={styles.headerTitle}>💰 PAGAMENTO / RATEIO</Text>
        <View style={{ width: 24 }} /> {/* Spacer */}
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {/* INFO DA COMANDA */}
        <View style={styles.comandaInfoCard}>
          <Text style={styles.label}>Nº Comanda</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TextInput
              style={[styles.input, { flex: 1, marginRight: 10 }]}
              value={comanda}
              onChangeText={setComanda}
              keyboardType="number-pad"
              placeholder="Ex: 5"
            />
            <TouchableOpacity style={styles.searchBtn} onPress={carregarDadosComanda}>
              <Text style={styles.searchBtnText}>BUSCAR</Text>
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

          {saldo && (
            <View style={styles.tabContent}>
              <Text style={styles.sectionTitle}>Modos de Divisão</Text>
              <Text style={styles.helperText}>Escolha como deseja dividir a conta desta comanda:</Text>

              <TouchableOpacity style={styles.optionCard} onPress={() => openSplitModal('pessoas')}>
                <View style={[styles.iconCircle, { backgroundColor: '#E3F2FD' }]}>
                  <Ionicons name="people" size={32} color="#2196F3" />
                </View>
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>Por Pessoas</Text>
                  <Text style={styles.optionDesc}>Divide o saldo restante igualmente pelo número de pessoas informado.</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#CCC" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.optionCard} onPress={() => openSplitModal('itens')}>
                <View style={[styles.iconCircle, { backgroundColor: '#E8F5E9' }]}>
                  <Ionicons name="list" size={32} color="#4CAF50" />
                </View>
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>Por Itens</Text>
                  <Text style={styles.optionDesc}>Permite selecionar itens específicos da comanda para pagar individualmente.</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#CCC" />
              </TouchableOpacity>
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
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
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
  label: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 8 },
  input: {
    backgroundColor: '#F9F9F9',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16
  },
  searchBtn: { backgroundColor: '#333', padding: 12, borderRadius: 8 },
  searchBtnText: { color: '#fff', fontWeight: 'bold' },
  
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

  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 5,
    marginBottom: 20,
    elevation: 2
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8
  },
  tabBtnActive: {
    backgroundColor: colors.primary
  },
  tabTxt: {
    fontWeight: '600',
    color: '#666'
  },
  tabTxtActive: {
    color: '#FFF',
    fontWeight: 'bold'
  },
  
  tabContent: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 10,
    elevation: 2,
    minHeight: 200
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5
  },
  helperText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20
  },
  
  formasContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20 },
  formaBtn: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    marginRight: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    minWidth: '45%',
    alignItems: 'center'
  },
  formaBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  formaBtnText: { color: '#333' },
  formaBtnTextActive: { color: '#fff', fontWeight: 'bold' },
  
  payBtn: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10
  },
  payBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#EEE'
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15
  },
  optionTextContainer: {
    flex: 1
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4
  },
  optionDesc: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18
  },
  
  // Estilos do Resumo
  resumoContainer: {
    marginBottom: 15,
    backgroundColor: '#FAFAFA',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EEE'
  },
  resumoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textTransform: 'uppercase'
  },
  orderItemContainer: {
    marginBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingBottom: 5
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2
  },
  itemText: {
    fontSize: 14,
    color: '#555',
    flex: 1
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333'
  },
  itemTextSimple: {
    fontSize: 14,
    color: '#555'
  },
  divider: {
    height: 1,
    backgroundColor: '#DDD',
    marginVertical: 15
  }
});
