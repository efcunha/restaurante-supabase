import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { getCompanyCollection } from '../utils/firestoreUtils';
import ComandasService from '../services/ComandasService';
import PagamentosService from '../services/PagamentosService';
import BackgroundPattern from '../components/BackgroundPattern';
import { getTodayKey } from '../services/FirebaseOptimizations';
import { exitApp } from '../utils/appUtils';

// Usar função centralizada para consistência de data local
const todayKey = getTodayKey;

export default function ComandaAbertaScreen() {
  const { user, logout } = useAuth();
  const [comandasAbertas, setComandasAbertas] = useState([]);
  const [selected, setSelected] = useState(null);
  const [pedidos, setPedidos] = useState([]);
  const [pagamentos, setPagamentos] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user?.companyId) loadComandasAbertas();
  }, [user]);

  const loadComandasAbertas = async () => {
    try {
      if (!user?.companyId) return;
      const list = await ComandasService.listarComandasAbertas(user.companyId);
      setComandasAbertas(list);

      // Se há uma comanda selecionada, atualizar seus dados
      if (selected) {
        const updatedComanda = list.find(c => c.comandaNumber === selected.comandaNumber);
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

  const loadPedidosComanda = async (comandaNumber) => {
    if (!user?.companyId) return;
    const q = query(
      getCompanyCollection(user.companyId, 'pedidos'),
      where('numeroComanda', '==', String(comandaNumber)),
      where('status', 'in', ['churrasqueira', 'montagem', 'pronto', 'entregue'])
    );
    const snap = await getDocs(q);
    const list = [];
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

  const selectComanda = async (comanda) => {
    setSelected(comanda);
    await loadPedidosComanda(comanda.comandaNumber);
    await loadPagamentosComanda(comanda.comandaNumber);
  };

  const loadPagamentosComanda = async (comandaNumber) => {
    if (!user?.companyId) return;
    const hoje = new Date().toISOString().split('T')[0];
    console.log('🔍 Buscando pagamentos - Comanda:', comandaNumber, 'Data:', hoje);
    const q = query(
      getCompanyCollection(user.companyId, 'pagamentos'),
      where('comandaNumber', '==', String(comandaNumber)),
      where('dateKey', '==', hoje)
    );
    const snap = await getDocs(q);
    const list = [];
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
    if (selected) {
      await loadPedidosComanda(selected.comandaNumber);
      await loadPagamentosComanda(selected.comandaNumber);
    }
  };

  const registrarPagamentoParcial = () => {
    Alert.prompt('Pagamento', 'Valor a pagar:', async (valor) => {
      Alert.prompt('Forma', '1-Dinheiro, 2-Pix, 3-Débito, 4-Crédito', async (input) => {
        const formas = ['dinheiro', 'pix', 'debito', 'credito'];
        const idx = parseInt(input, 10) - 1;
        if (idx >= 0 && idx < 4) {
          try {
            await PagamentosService.registrarPagamento({
              companyId: user.companyId,
              dateKey: todayKey(),
              comandaNumber: selected.comandaNumber,
              forma: formas[idx],
              valor,
              usuarioId: user?.id,
              usuarioNome: user?.nome,
            });
            Alert.alert('Ok', 'Pagamento registrado.');
            loadComandasAbertas();
            selectComanda(selected);
          } catch (e) { Alert.alert('Erro', e.message); }
        }
      });
    });
  };

  const registrarPagamentoRapido = async (forma) => {
    if (!selected) {
      console.error('❌ Nenhuma comanda selecionada');
      Alert.alert('Erro', 'Nenhuma comanda selecionada');
      return;
    }

    const saldo = Number(selected.saldoAberto || 0);
    if (!(saldo > 0)) {
      Alert.alert('Nada a pagar', 'Saldo já está zerado.');
      return;
    }

    try {
      await PagamentosService.registrarPagamento({
        companyId: user.companyId,
        dateKey: todayKey(),
        comandaNumber: selected.comandaNumber,
        forma: forma,
        valor: saldo,
        usuarioId: user?.id,
        usuarioNome: user?.nome,
      });
      await ComandasService.fecharComanda(user.companyId, selected.comandaNumber, user?.id, user?.nome);
      setSelected(null);
      setPedidos([]);
      await loadComandasAbertas();
      Alert.alert('✅ Sucesso', `Pagamento de R$ ${saldo.toFixed(2)} via ${forma} registrado.\nComanda fechada com sucesso!`);
    } catch (e) {
      console.error('❌ ERRO NO PAGAMENTO RÁPIDO:', e);
      console.error('Stack trace:', e.stack);
      Alert.alert('Erro', `Falha ao processar: ${e.message}`);
    }
  };

  const fecharComanda = async () => {
    try {
      await ComandasService.fecharComanda(user.companyId, selected.comandaNumber, user?.id, user?.nome);
      Alert.alert('Comanda fechada', 'Conta encerrada.');
      setSelected(null);
      setPedidos([]);
      loadComandasAbertas();
    } catch (e) { Alert.alert('Erro', e.message); }
  };

  return (
    <View style={styles.container}>
      <BackgroundPattern />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Comandas Abertas</Text>
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={exitApp}
        >
          <Text style={styles.logoutBtnText}>Sair</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#8B2F2F"
            colors={["#8B2F2F"]}
          />
        }
      >
        {!selected ? (
          <>
            <Text style={styles.sectionTitle}>Selecione uma comanda</Text>
            {comandasAbertas.map(c => (
              <TouchableOpacity key={c.id} style={styles.card} onPress={() => selectComanda(c)}>
                <Text style={styles.cardTitle}>Comanda {c.comandaNumber}</Text>
                <Text style={styles.cardLine}>Total consumido: R$ {Number(c.totalConsumido || 0).toFixed(2)}</Text>
                <Text style={styles.cardLine}>Pago: R$ {Number(c.totalPago || 0).toFixed(2)}</Text>
                <Text style={styles.cardLine}>Saldo aberto: R$ {Number(c.saldoAberto || 0).toFixed(2)}</Text>
              </TouchableOpacity>
            ))}
          </>
        ) : (
          <>
            <TouchableOpacity onPress={() => { setSelected(null); setPedidos([]); }}>
              <Text style={styles.backLink}>← Voltar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.refreshBtn}
              onPress={onRefresh}
            >
              <Text style={styles.refreshBtnText}>🔄 Atualizar</Text>
            </TouchableOpacity>
            <View style={styles.headerCard}>
              <Text style={styles.comandaNumBig}>Comanda {selected.comandaNumber}</Text>
              <Text style={styles.line}>Total: R$ {Number(selected.totalConsumido || 0).toFixed(2)}</Text>
              <Text style={styles.line}>Pago: R$ {Number(selected.totalPago || 0).toFixed(2)}</Text>
              <Text style={styles.line}>Saldo: R$ {Number(selected.saldoAberto || 0).toFixed(2)}</Text>
            </View>

            <Text style={styles.sectionTitle}>Pedidos</Text>
            {pedidos.map(p => (
              <View key={p.id} style={styles.pedidoCard}>
                <Text style={styles.pedidoId}>{p.id} — {p.status.toUpperCase()}</Text>
                {p.items.map((item, idx) => <Text key={idx} style={styles.itemLine}>• {item}</Text>)}
                <Text style={styles.totalLine}>R$ {Number(p.totalPrice).toFixed(2)}</Text>
              </View>
            ))}

            <Text style={styles.sectionTitle}>Pagamentos ({pagamentos.length})</Text>
            {pagamentos.length === 0 && <Text style={styles.itemLine}>Nenhum pagamento registrado</Text>}
            {pagamentos.map((pag, idx) => (
              <View key={idx} style={styles.pagamentoCard}>
                <Text style={styles.pagamentoLine}>💳 {pag.forma.toUpperCase()} - R$ {Number(pag.valor).toFixed(2)}</Text>
                <Text style={styles.pagamentoUser}>Recebido por: {pag.usuarioNome}</Text>
              </View>
            ))}

            {Number(selected.saldoAberto || 0) > 0 && (
              <View style={styles.paymentSection}>
                <Text style={styles.paymentSectionTitle}>Pagamento Rápido</Text>
                <View style={styles.paymentButtons}>
                  {['dinheiro', 'pix', 'débito', 'crédito'].map(forma => (
                    <TouchableOpacity
                      key={forma}
                      style={styles.paymentBtn}
                      onPress={() => registrarPagamentoRapido(forma)}
                    >
                      <Text style={styles.paymentBtnText}>{forma.toUpperCase()}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <TouchableOpacity style={styles.btn} onPress={registrarPagamentoParcial}>
              <Text style={styles.btnText}>REGISTRAR PAGAMENTO PARCIAL</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, { backgroundColor: '#8B2F2F', marginTop: 10 }]} onPress={fecharComanda}>
              <Text style={[styles.btnText, { color: '#fff' }]}>FECHAR COMANDA</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
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
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    zIndex: 10,
    elevation: 8,
  },
  headerTitle: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  logoutBtn: { backgroundColor: 'rgba(255,255,255,0.15)', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10 },
  logoutBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#8B2F2F', marginBottom: 12 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#F0EBE0' },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#8B2F2F', marginBottom: 8 },
  cardLine: { fontSize: 14, color: '#2C2C2C', marginBottom: 4 },
  backLink: { color: '#8B2F2F', fontSize: 16, fontWeight: '700', marginBottom: 12 },
  refreshBtn: { backgroundColor: '#E5B84A', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, alignSelf: 'flex-end', marginBottom: 12 },
  refreshBtnText: { color: '#2C2C2C', fontSize: 14, fontWeight: '700' },
  headerCard: { backgroundColor: '#8B2F2F', borderRadius: 12, padding: 20, marginBottom: 20 },
  comandaNumBig: { fontSize: 22, fontWeight: '700', color: '#E5B84A', marginBottom: 10 },
  line: { fontSize: 16, color: '#fff', marginBottom: 6 },
  pedidoCard: { backgroundColor: '#fff', borderRadius: 12, padding: 15, marginBottom: 12, borderWidth: 1, borderColor: '#F0EBE0' },
  pedidoId: { fontSize: 14, fontWeight: '700', color: '#8B2F2F', marginBottom: 8 },
  itemLine: { fontSize: 13, color: '#2C2C2C', marginBottom: 4 },
  totalLine: { fontSize: 16, fontWeight: '700', color: '#8B2F2F', marginTop: 8 },
  pagamentoCard: { backgroundColor: '#E8F5E9', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#4CAF50' },
  pagamentoLine: { fontSize: 14, fontWeight: '700', color: '#2E7D32', marginBottom: 4 },
  pagamentoUser: { fontSize: 12, color: '#555', fontStyle: 'italic' },
  paymentSection: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E5B84A' },
  paymentSectionTitle: { fontSize: 16, fontWeight: '700', color: '#8B2F2F', marginBottom: 12 },
  paymentButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  paymentBtn: { flexBasis: '48%', backgroundColor: '#8B2F2F', padding: 12, borderRadius: 8, alignItems: 'center' },
  paymentBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  btn: { backgroundColor: '#E5B84A', padding: 16, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#2C2C2C', fontWeight: '700' },
});
