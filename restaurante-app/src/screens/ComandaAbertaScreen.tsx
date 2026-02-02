import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { query, where, getDocs } from 'firebase/firestore';
// @ts-ignore
import { getCompanyCollection } from '../utils/firestoreUtils';
// @ts-ignore
import ComandasService from '../services/ComandasService';
// @ts-ignore
import PagamentosService from '../services/PagamentosService';
// @ts-ignore
import BackgroundPattern from '../components/BackgroundPattern';
import { getTodayKey } from '../services/FirebaseOptimizations';
import { exitApp } from '../utils/appUtils';

export default function ComandaAbertaScreen() {
  const { user } = useAuth();
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
    const q = query(
      // @ts-ignore
      getCompanyCollection(user.companyId, 'pedidos'),
      where('numeroComanda', '==', String(comandaNumber)),
      where('status', 'in', ['churrasqueira', 'montagem', 'pronto', 'entregue'])
    );
    const snap = await getDocs(q);
    const list: any[] = [];
    snap.forEach(d => {
      const data = d.data();
      list.push({
        id: data.idFormatado || d.id,
        items: data.itens || [],
        status: data.status,
        totalPrice: data.totalPrice || 0,
      });
    });
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
    const q = query(
      // @ts-ignore
      getCompanyCollection(user.companyId, 'pagamentos'),
      where('comandaNumber', '==', String(comandaNumber)),
      where('dateKey', '==', hoje)
    );
    const snap = await getDocs(q);
    const list: any[] = [];
    snap.forEach(d => {
      const data = d.data();
      console.log('💳 Pagamento encontrado:', data);
      list.push({
        forma: data.forma,
        valor: data.valor || 0,
        usuarioNome: data.usuarioNome,
      });
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
      <BackgroundPattern />
      <View style={styles.header}>
        <Text style={styles.title}>Comandas Abertas</Text>
        <TouchableOpacity onPress={onRefresh}>
          <Ionicons name="refresh" size={24} color="#FFF" />
        </TouchableOpacity>
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
                      {item.abertura ? new Date(item.abertura.seconds * 1000).toLocaleTimeString().slice(0, 5) : '--:--'}
                    </Text>
                  </View>
                  <Text style={styles.cardClient}>{item.cliente || 'Consumidor'}</Text>
                  <Text style={styles.cardTotal}>R$ {item.totalConsumido?.toFixed(2)}</Text>
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
                <Text style={styles.totalLabel}>Total Consumido:</Text>
                <Text style={styles.totalValue}>R$ {selected.totalConsumido?.toFixed(2)}</Text>
              </View>

            </ScrollView>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={64} color="#ccc" />
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
  container: { flex: 1, backgroundColor: '#F5F1E8' },
  header: {
    backgroundColor: '#8B2F2F',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 5
  },
  title: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  listContainer: { width: '35%', borderRightWidth: 1, borderColor: '#DDD', backgroundColor: '#FFF' },
  detailsContainer: { flex: 1, padding: 20 },
  card: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    backgroundColor: '#fff'
  },
  cardSelected: {
    backgroundColor: '#FFF8E1',
    borderLeftWidth: 4,
    borderLeftColor: '#E5B84A'
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  cardTitle: { fontWeight: 'bold', fontSize: 16, color: '#333' },
  cardTime: { fontSize: 12, color: '#888' },
  cardClient: { fontSize: 14, color: '#666', marginBottom: 5 },
  cardTotal: { fontSize: 16, fontWeight: 'bold', color: '#8B2F2F' },
  emptyText: { textAlign: 'center', marginTop: 30, color: '#999' },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  detailTitle: { fontSize: 22, fontWeight: 'bold', color: '#2C2C2C' },
  statusBadge: { backgroundColor: '#4CAF50', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginTop: 15, marginBottom: 10, color: '#555', borderBottomWidth: 1, borderBottomColor: '#EEE', paddingBottom: 5 },
  orderItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  itemText: { fontSize: 15, color: '#333' },
  itemPrice: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  itemStatus: { fontSize: 12, color: '#888', textAlign: 'right' },
  divider: { height: 1, backgroundColor: '#DDD', marginVertical: 20 },
  paymentItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  paymentMethod: { fontSize: 14, color: '#333' },
  paymentValue: { fontSize: 14, fontWeight: 'bold', color: '#8B2F2F' },
  paymentUser: { fontSize: 12, color: '#888', marginLeft: 5 },
  totalContainer: { marginTop: 30, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },
  totalLabel: { fontSize: 18, fontWeight: 'bold', marginRight: 10 },
  totalValue: { fontSize: 24, fontWeight: 'bold', color: '#8B2F2F' },
  emptySmall: { fontStyle: 'italic', color: '#999', fontSize: 12 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyStateText: { marginTop: 15, fontSize: 16, color: '#999' }
});
