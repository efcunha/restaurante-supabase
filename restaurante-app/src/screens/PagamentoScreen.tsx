import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, Alert, ScrollView } from 'react-native';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
// @ts-ignore
import PagamentosService from '../services/PagamentosService';
import { getTodayKey } from '../services/FirebaseOptimizations';
// @ts-ignore
import { getCompanyDoc } from '../utils/firestoreUtils';
import { getDoc } from 'firebase/firestore';

// Usar função centralizada para consistência de data local
const todayKey = getTodayKey;

export default function PagamentoScreen() {
  const { user } = useAuth();
  
  // Helper para formatar valores em Real brasileiro
  const formatarMoeda = (valor: any) => {
    if (valor === null || valor === undefined || isNaN(valor)) return 'R$ 0,00';
    const numero = parseFloat(valor);
    const partes = numero.toFixed(2).split('.');
    partes[0] = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return 'R$ ' + partes.join(',');
  };
  
  const [comanda, setComanda] = useState('');
  const [forma, setForma] = useState('dinheiro');
  const [valor, setValor] = useState('');
  const [saldo, setSaldo] = useState<any>(null);

  const carregarSaldo = async () => {
    try {
      if (!user?.companyId || !comanda) return;
      // simples: estimar saldo a partir de comanda doc
      const dateKey = todayKey();
      const id = `comanda-${dateKey}-${comanda}`;
      
      const snap = await getDoc(getCompanyDoc(user.companyId, 'comandas', id));
      if (!snap.exists()) throw new Error('Comanda não encontrada');
      const data = snap.data();
      setSaldo({
        total: data.totalConsumido || 0,
        pago: data.totalPago || 0,
        aberto: data.saldoAberto || 0,
      });
    } catch (e: any) { Alert.alert('Erro', e.message); }
  };

  const pagar = async () => {
    try {
      if (!valor || parseFloat(valor) <= 0) {
        Alert.alert('Erro', 'Informe um valor válido.');
        return;
      }

      const valorPago = parseFloat(valor);

      // Registrar pagamento
      await PagamentosService.registrarPagamento({
        companyId: user?.companyId || '',
        dateKey: todayKey(),
        comandaNumber: comanda,
        forma,
        valor: valorPago,
        usuarioId: user?.id,
        usuarioNome: user?.nome,
      });
      
      // console.log('[Pagamento] ✅ Pagamento registrado, verificando saldo...');
      
      // 🚀 OTIMIZAÇÃO: Reduzir delay de 500ms para 200ms
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Recarregar saldo atualizado
      const dateKey = todayKey();
      const id = `comanda-${dateKey}-${comanda}`;
      const snap = await getDoc(getCompanyDoc(user?.companyId || '', 'comandas', id));
      
      if (!snap.exists()) {
        Alert.alert('Erro', 'Comanda não encontrada');
        return;
      }

      const data = snap.data();
      const saldoAtual = data.saldoAberto || 0;
      
      // console.log('[Pagamento] 💰 Saldo após pagamento:', {
      //   totalConsumido: data.totalConsumido,
      //   totalPago: data.totalPago,
      //   saldoAberto: saldoAtual
      // });
      
      // Atualizar UI
      setSaldo({
        total: data.totalConsumido || 0,
        pago: data.totalPago || 0,
        aberto: saldoAtual,
      });

      setValor('');
      Alert.alert('Sucesso', 'Pagamento registrado! Saldo atualizado.');

    } catch (e: any) {
      Alert.alert('Erro', e.message);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={styles.label}>Nº Comanda</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TextInput
            style={[styles.input, { flex: 1, marginRight: 10 }]}
            value={comanda}
            onChangeText={setComanda}
            keyboardType="number-pad"
            placeholder="Ex: 5"
          />
          <TouchableOpacity style={styles.searchBtn} onPress={carregarSaldo}>
            <Text style={styles.searchBtnText}>BUSCAR</Text>
          </TouchableOpacity>
        </View>

        {saldo && (
          <View style={styles.saldoContainer}>
            <Text style={styles.saldoText}>Total: {formatarMoeda(saldo.total)}</Text>
            <Text style={styles.saldoText}>Pago: {formatarMoeda(saldo.pago)}</Text>
            <Text style={[styles.saldoText, { fontWeight: 'bold', fontSize: 18, color: '#8B2F2F' }]}>
              Aberto: {formatarMoeda(saldo.aberto)}
            </Text>
          </View>
        )}

        <Text style={styles.label}>Valor do Pagamento</Text>
        <TextInput
          style={styles.input}
          value={valor}
          onChangeText={setValor}
          keyboardType="numeric"
          placeholder="0.00"
        />

        <Text style={styles.label}>Forma de Pagamento</Text>
        <View style={styles.formasContainer}>
          {['dinheiro', 'pix', 'debito', 'credito'].map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.formaBtn, forma === f && styles.formaBtnActive]}
              onPress={() => setForma(f)}
            >
              <Text style={[styles.formaBtnText, forma === f && styles.formaBtnTextActive]}>
                {f.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.payBtn} onPress={pagar}>
          <Text style={styles.payBtnText}>REGISTRAR PAGAMENTO</Text>
        </TouchableOpacity>
      </ScrollView>
      <StatusBar style="dark" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F1E8' },
  label: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 8, marginTop: 15 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E0D8C8',
    borderRadius: 8,
    padding: 12,
    fontSize: 16
  },
  searchBtn: { backgroundColor: '#333', padding: 12, borderRadius: 8 },
  searchBtnText: { color: '#fff', fontWeight: 'bold' },
  saldoContainer: {
    backgroundColor: '#E5D6B4',
    padding: 15,
    borderRadius: 10,
    marginTop: 20
  },
  saldoText: { fontSize: 16, marginBottom: 4 },
  formasContainer: { flexDirection: 'row', flexWrap: 'wrap' },
  formaBtn: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    marginRight: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#CCC'
  },
  formaBtnActive: { backgroundColor: '#8B2F2F', borderColor: '#8B2F2F' },
  formaBtnText: { color: '#333' },
  formaBtnTextActive: { color: '#fff', fontWeight: 'bold' },
  payBtn: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 30
  },
  payBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});
