import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
// @ts-ignore
import ComandasService from '../services/ComandasService';
import { supabase } from '../config/SupabaseConfig';
import { colors } from '../theme/colors';
export default function ComandaAbertaScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [comandasAbertas, setComandasAbertas] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [pagamentos, setPagamentos] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // @ts-ignore
    if (user?.companyId) loadComandasAbertas();
  }, [user]);

  const loadComandasAbertas = async () => {
    try {
      // @ts-ignore
      if (!user?.companyId) return;
      // @ts-ignore
      const list = await ComandasService.listarComandasAbertas(user.companyId);
      setComandasAbertas(list);

      // Se há uma comanda selecionada, atualizar seus dados
      if (selected) {
        const updatedComanda = list.find((c: any) => c.comandaNumber === selected.comandaNumber);
        if (updatedComanda) {
          setSelected(updatedComanda);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar comandas:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const loadPedidosComanda = async (comandaNumber: string | number) => {
    // @ts-ignore
    if (!user?.companyId) return;
    
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('company_id', user.companyId)
      .eq('comanda_number', String(comandaNumber))
      .in('status', ['preparing', 'ready', 'delivered']);

    if (error) {
      console.error('Error loading pedidos:', error);
      return;
    }

    const list = (data || []).map(d => ({
      id: d.id_formatado || d.id,
      items: d.items || [],
      status: d.status,
      totalPrice: d.total_amount || 0, // ✅ FIXED: total_amount not total_price
    }));
    
    setPedidos(list);
  };

  const selectComanda = async (comanda: any) => {
    setSelected(comanda);
    await loadPedidosComanda(comanda.comandaNumber);
    await loadPagamentosComanda(comanda.comandaNumber);
  };

  const loadPagamentosComanda = async (comandaNumber: string | number) => {
    // @ts-ignore
    if (!user?.companyId) return;
    const hoje = new Date().toISOString().split('T')[0];
    console.log('🔍 Buscando pagamentos - Comanda:', comandaNumber, 'Data:', hoje);
    
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('company_id', user.companyId)
      .eq('comanda_number', String(comandaNumber))
      .eq('date_key', hoje);

    if (error) {
      console.error('Error loading pagamentos:', error);
      return;
    }

    const list = (data || []).map(d => {
      console.log('💳 Pagamento encontrado:', d);
      return {
        forma: d.payment_method,
        valor: d.amount || 0,
        usuarioNome: d.user_name,
      };
    });
    
    console.log('📋 Total de pagamentos:', list.length, list);
    setPagamentos(list);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadComandasAbertas();
  };

  return (
    <View style={styles.container}>

      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <View style={styles.headerLeft} />
        <View style={styles.headerCenter}>
          <View style={styles.headerTitleRow}>
            <Ionicons name="receipt-outline" size={24} color={colors.white} style={styles.headerIcon} />
            <Text style={styles.title}>Comandas Abertas</Text>
          </View>
          {!!user && <Text style={styles.userInfo}>Operador: {user.nome || user.email}</Text>}
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
            <Ionicons name="refresh" size={24} color={colors.white} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ flex: 1, flexDirection: 'row' }}>
        {/* Lado Esquerdo: Lista */}
        <View style={styles.listContainer}>
          <ScrollView
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          >
            {comandasAbertas.length === 0 ? (
              <Text style={styles.emptyText}>Nenhuma comanda aberta</Text>
            ) : (
              comandasAbertas.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.card,
                    selected?.comandaNumber === item.comandaNumber && styles.cardSelected
                  ]}
                  onPress={() => selectComanda(item)}
                >
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>#{item.comandaNumber}</Text>
                    <Text style={styles.cardTime}>
                      {item.abertura ? new Date(item.abertura).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                    </Text>
                  </View>
                  <Text style={styles.cardClient}>{item.cliente || 'Consumidor'}</Text>
                  <Text style={[styles.cardTotal, (item.saldoAberto || 0) > 0 ? { color: colors.primary } : { color: colors.success }]}> 
                    Saldo: R$ {(item.saldoAberto || 0).toFixed(2)}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>

        {/* Lado Direito: Detalhes */}
        <View style={styles.detailsContainer}>
          {selected ? (
            <ScrollView>
              <View style={styles.detailHeader}>
                <Text style={styles.detailTitle}>Detalhes da Comanda #{selected.comandaNumber}</Text>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>ABERTA</Text>
                </View>
              </View>

              <Text style={styles.sectionTitle}>Pedidos</Text>
              {pedidos.map((p, i) => (
                <View key={i} style={styles.orderItem}>
                  <View>
                    {p.items.map((it: any, k: number) => (
                      <Text key={k} style={styles.itemText}>{it}</Text>
                    ))}
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.itemPrice}>R$ {p.totalPrice.toFixed(2)}</Text>
                    <Text style={styles.itemStatus}>{p.status}</Text>
                  </View>
                </View>
              ))}

              <View style={styles.divider} />

              <Text style={styles.sectionTitle}>Pagamentos Parciais</Text>
              {pagamentos.length === 0 ? (
                <Text style={styles.emptySmall}>Nenhum pagamento registrado hoje</Text>
              ) : (
                pagamentos.map((pag, idx) => (
                  <View key={idx} style={styles.paymentItem}>
                    <Text style={styles.paymentMethod}>{pag.forma}</Text>
                    <Text style={styles.paymentValue}>- R$ {pag.valor.toFixed(2)}</Text>
                    {pag.usuarioNome && <Text style={styles.paymentUser}>({pag.usuarioNome})</Text>}
                  </View>
                ))
              )}

              <View style={styles.totalContainer}>
                <Text style={styles.totalLabel}>Saldo a Pagar:</Text>
                <Text style={[styles.totalValue, (selected.saldoAberto || 0) > 0 ? { color: colors.primary } : { color: colors.success }]}>
                  R$ {(selected.saldoAberto || 0).toFixed(2)}
                </Text>
              </View>
              <View style={[styles.totalContainer, { marginTop: 5 }]}>
                <Text style={[styles.totalLabel, { fontSize: 14, color: colors.textSecondary }]}>Total Consumido:</Text>
                <Text style={[styles.totalValue, { fontSize: 16, color: colors.textSecondary }]}>R$ {(selected.totalConsumido || 0).toFixed(2)}</Text>
              </View>

            </ScrollView>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={64} color={colors.disabled} />
              <Text style={styles.emptyStateText}>Selecione uma comanda para ver detalhes</Text>
            </View>
          )}
        </View>
      </View>
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.primary,
    minHeight: 92,
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 8,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    zIndex: 10,
  },
  headerLeft: { flex: 1 },
  headerCenter: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRight: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: { marginRight: 8 },
  title: { color: colors.white, fontSize: 20, fontWeight: 'bold' },
  userInfo: {
    color: colors.userInfo,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  refreshBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.logoutBg,
  },
  listContainer: { width: '35%', borderRightWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  detailsContainer: { flex: 1, padding: 20 },
  card: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.white
  },
  cardSelected: {
    backgroundColor: colors.warningSurface,
    borderLeftWidth: 4,
    borderLeftColor: colors.secondary
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  cardTitle: { fontWeight: 'bold', fontSize: 16, color: colors.text },
  cardTime: { fontSize: 12, color: colors.textSecondary },
  cardClient: { fontSize: 14, color: colors.textSecondary, marginBottom: 5 },
  cardTotal: { fontSize: 16, fontWeight: 'bold', color: colors.primary },
  emptyText: { textAlign: 'center', marginTop: 30, color: colors.textSecondary },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  detailTitle: { fontSize: 22, fontWeight: 'bold', color: colors.text },
  statusBadge: { backgroundColor: colors.success, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { color: colors.white, fontSize: 12, fontWeight: 'bold' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginTop: 15, marginBottom: 10, color: colors.textSecondary, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 5 },
  orderItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  itemText: { fontSize: 15, color: colors.text },
  itemPrice: { fontSize: 15, fontWeight: 'bold', color: colors.text },
  itemStatus: { fontSize: 12, color: colors.textSecondary, textAlign: 'right' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 20 },
  paymentItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  paymentMethod: { fontSize: 14, color: colors.text },
  paymentValue: { fontSize: 14, fontWeight: 'bold', color: colors.primary },
  paymentUser: { fontSize: 12, color: colors.textSecondary, marginLeft: 5 },
  totalContainer: { marginTop: 30, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },
  totalLabel: { fontSize: 18, fontWeight: 'bold', marginRight: 10 },
  totalValue: { fontSize: 24, fontWeight: 'bold', color: colors.primary },
  emptySmall: { fontStyle: 'italic', color: colors.textSecondary, fontSize: 12 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyStateText: { marginTop: 15, fontSize: 16, color: colors.textSecondary }
});
