import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, Alert, ScrollView } from 'react-native';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import CaixaService from '../services/CaixaService';

export default function CaixaFechamentoScreen() {
  const { user } = useAuth();
  const [caixa, setCaixa] = useState(null);
  const [saldoReal, setSaldoReal] = useState('');

  useEffect(() => { (async () => { setCaixa(await CaixaService.getCaixaAberto(user.companyId)); })(); }, []);

  const fechar = async () => {
    try {
      if (!saldoReal || parseFloat(saldoReal) < 0) {
        alert('⚠️ Atenção: Informe o saldo real contado no caixa.');
        return;
      }

      const r = await CaixaService.fecharCaixa(user.companyId, user?.id, user?.nome, saldoReal);
      
      const diferenca = r.diferenca;
      let mensagem = `✅ CAIXA FECHADO COM SUCESSO!\n\n`;
      mensagem += `Saldo esperado: R$ ${r.saldoEsperado.toFixed(2)}\n`;
      mensagem += `Saldo real: R$ ${r.saldoReal.toFixed(2)}\n`;
      mensagem += `Diferença: R$ ${diferenca.toFixed(2)}`;
      
      if (diferenca > 0) {
        mensagem += ` (SOBRA)`;
      } else if (diferenca < 0) {
        mensagem += ` (FALTA)`;
      } else {
        mensagem += ` (CONFERE ✓)`;
      }
      
      alert(mensagem);
      
      // Limpar estado
      setCaixa(null);
      setSaldoReal('');
    } catch (e) { 
      alert('❌ Erro: ' + e.message); 
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}><Text style={styles.headerTitle}>Fechamento de Caixa</Text></View>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {caixa ? (
          <View style={styles.card}>
            <Text style={styles.line}>Valor inicial: R$ {Number(caixa.valorInicial || 0).toFixed(2)}</Text>
            <Text style={styles.line}>Vendas: R$ {Number(caixa.vendasTotal || 0).toFixed(2)}</Text>
            <Text style={styles.line}>Reforços: R$ {Number(caixa.reforcosTotal || 0).toFixed(2)}</Text>
            <Text style={styles.line}>Sangrias: R$ {Number(caixa.sangriasTotal || 0).toFixed(2)}</Text>
            <Text style={styles.line}>Saldo esperado: R$ {Number(caixa.saldoEsperado || 0).toFixed(2)}</Text>
            <View style={{ height: 12 }} />
            <Text style={styles.section}>Por forma de pagamento</Text>
            <Text style={styles.line}>Dinheiro: R$ {Number(caixa.porForma?.dinheiro || 0).toFixed(2)}</Text>
            <Text style={styles.line}>Pix: R$ {Number(caixa.porForma?.pix || 0).toFixed(2)}</Text>
            <Text style={styles.line}>Débito: R$ {Number(caixa.porForma?.debito || 0).toFixed(2)}</Text>
            <Text style={styles.line}>Crédito: R$ {Number(caixa.porForma?.credito || 0).toFixed(2)}</Text>
          </View>
        ) : (
          <Text style={{ color:'#8B2F2F' }}>Nenhum caixa aberto.</Text>
        )}

        <Text style={styles.label}>Saldo real contado</Text>
        <TextInput style={styles.input} keyboardType="numeric" value={saldoReal} onChangeText={setSaldoReal} />
        <TouchableOpacity style={styles.btn} onPress={fechar}>
          <Text style={styles.btnText}>FECHAR CAIXA DO DIA</Text>
        </TouchableOpacity>
      </ScrollView>
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F1E8' },
  header: { backgroundColor: '#8B2F2F', paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20 },
  headerTitle: { color: '#fff', fontSize: 24, fontWeight: '600' },
  label: { color: '#8B2F2F', fontWeight: '600', marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E0D8C8', borderRadius: 12, padding: 14, marginBottom: 20 },
  btn: { backgroundColor: '#E5B84A', padding: 16, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#2C2C2C', fontWeight: '700' },
  card: { backgroundColor:'#fff', borderRadius:12, padding:16, borderColor:'#F0EBE0', borderWidth:1, marginBottom: 10 },
  line: { color: '#2C2C2C', marginBottom: 6 },
  section: { color: '#8B2F2F', fontWeight: '700', marginBottom: 8, marginTop: 8 },
});
