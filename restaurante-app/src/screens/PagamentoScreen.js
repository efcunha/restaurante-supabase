import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, Alert, ScrollView } from 'react-native';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import CaixaService from '../services/CaixaService';
import PagamentosService from '../services/PagamentosService';
import ComandasService from '../services/ComandasService';
import { getTodayKey } from '../services/FirebaseOptimizations';
import { getCompanyDoc, getCompanyCollection } from '../utils/firestoreUtils';
import { getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';

// Usar função centralizada para consistência de data local
const todayKey = getTodayKey;

export default function PagamentoScreen() {
  const { user } = useAuth();
  
  // Helper para formatar valores em Real brasileiro
  const formatarMoeda = (valor) => {
    if (valor === null || valor === undefined || isNaN(valor)) return 'R$ 0,00';
    const numero = parseFloat(valor);
    const partes = numero.toFixed(2).split('.');
    partes[0] = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return 'R$ ' + partes.join(',');
  };
  
  const [comanda, setComanda] = useState('');
  const [forma, setForma] = useState('dinheiro');
  const [valor, setValor] = useState('');
  const [saldo, setSaldo] = useState(null);

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
    } catch (e) { Alert.alert('Erro', e.message); }
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
        companyId: user.companyId,
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
      const snap = await getDoc(getCompanyDoc(user.companyId, 'comandas', id));
      
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
      
      // Se saldo zerou ou é menor que 0.01, fechar comanda automaticamente
      if (saldoAtual <= 0.01) {
        // console.log('[Pagamento] 🔒 Saldo zerou, fechando comanda automaticamente...');
        
        try {
          // 🔒 MARCAR TODOS OS PEDIDOS COMO PAGOS ANTES DE FECHAR
          
          const ordersRef = getCompanyCollection(user.companyId, 'pedidos');
          const q = query(ordersRef, where('comandaNumber', '==', comanda));
          const snapshot = await getDocs(q);
          
          if (!snapshot.empty) {
            const pedidosIds = [];
            snapshot.forEach(doc => {
              const data = doc.data();
              pedidosIds.push(data.idFormatado || data.id);
            });
            
            if (pedidosIds.length > 0) {
              await PagamentosService.marcarPedidosComoPagos(user.companyId, pedidosIds, forma);
            }
          }
          
          await ComandasService.fecharComanda(user.companyId, comanda, user?.id, user?.nome);
          // console.log('[Pagamento] ✅ Comanda fechada com sucesso');
          
          // Limpar antes do Alert
          setValor('');
          setComanda('');
          setSaldo(null);
          
          setTimeout(() => {
            Alert.alert('✅ Pagamento Concluído', 'Comanda fechada e movida para PAGAS!');
          }, 100);
        } catch (fechamentoErro) {
          console.error('[Pagamento] ❌ Erro ao fechar comanda:', fechamentoErro);
          Alert.alert(
            'Pagamento Registrado', 
            `Pagamento aplicado mas não foi possível fechar a comanda automaticamente.\n\nErro: ${fechamentoErro.message}`
          );
        }
      } else {
        const msg = `Pagamento: ${formatarMoeda(valorPago)}\nSaldo: ${formatarMoeda(saldoAtual)}`;
        setValor('');
        
        setTimeout(() => {
          Alert.alert('✅ Pagamento Registrado', msg);
        }, 100);
      }
    } catch (e) { 
      console.error('[Pagamento] ❌ Erro:', e);
      Alert.alert('Erro', e.message); 
    }
  };

  const fechar = async () => {
    try {
      await ComandasService.fecharComanda(user.companyId, comanda, user?.id, user?.nome);
      setTimeout(() => {
        Alert.alert('✅ Comanda fechada', 'Conta encerrada com sucesso.');
      }, 100);
    } catch (e) { 
      Alert.alert('Erro', e.message); 
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}><Text style={styles.headerTitle}>Pagamento / Conta</Text></View>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={styles.label}>Número da Comanda</Text>
        <TextInput style={styles.input} keyboardType="numeric" value={comanda} onChangeText={setComanda} onBlur={carregarSaldo} />

        {saldo && (
          <View style={styles.card}>
            <Text style={styles.line}>Total: {formatarMoeda(saldo.total)}</Text>
            <Text style={styles.line}>Pago: {formatarMoeda(saldo.pago)}</Text>
            <Text style={styles.line}>Em aberto: {formatarMoeda(saldo.aberto)}</Text>
          </View>
        )}

        <Text style={styles.label}>Forma de pagamento</Text>
        <View style={styles.row}>
          {['dinheiro','pix','debito','credito'].map(f => (
            <TouchableOpacity key={f} style={[styles.formaChip, forma===f && styles.formaChipActive]} onPress={() => setForma(f)}>
              <Text style={[styles.formaText, forma===f && styles.formaTextActive]}>{f.toUpperCase()}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Valor</Text>
        <TextInput style={styles.input} keyboardType="numeric" value={valor} onChangeText={setValor} />

        <TouchableOpacity style={styles.btn} onPress={pagar}><Text style={styles.btnText}>REGISTRAR PAGAMENTO</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.btn,{backgroundColor:'#8B2F2F'}]} onPress={fechar}><Text style={[styles.btnText,{color:'#fff'}]}>FECHAR CONTA</Text></TouchableOpacity>
      </ScrollView>
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F1E8' },
  header: { backgroundColor: '#8B2F2F', paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20 },
  headerTitle: { color: '#fff', fontSize: 24, fontWeight: '600' },
  label: { color: '#8B2F2F', fontWeight: '600', marginBottom: 8, marginTop: 10 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E0D8C8', borderRadius: 12, padding: 14, marginBottom: 12 },
  btn: { backgroundColor: '#E5B84A', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#2C2C2C', fontWeight: '700' },
  card: { backgroundColor:'#fff', borderRadius:12, padding:16, borderColor:'#F0EBE0', borderWidth:1, marginBottom: 12 },
  line: { color: '#2C2C2C', marginBottom: 6 },
  row: { flexDirection: 'row', gap: 8 },
  formaChip: { borderWidth:1, borderColor:'#E0D8C8', borderRadius: 10, paddingVertical:8, paddingHorizontal:10, backgroundColor:'#fff' },
  formaChipActive: { backgroundColor:'#E5B84A', borderColor:'#E5B84A' },
  formaText: { color:'#5C5C5C', fontWeight:'700' },
  formaTextActive: { color:'#2C2C2C' },
});
