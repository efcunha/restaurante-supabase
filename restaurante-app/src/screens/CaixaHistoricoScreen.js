import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { useEffect, useState } from 'react';
import CaixaService from '../services/CaixaService';

export default function CaixaHistoricoScreen() {
  const [registros, setRegistros] = useState([]);

  useEffect(() => { (async () => setRegistros(await CaixaService.historico()))(); }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}><Text style={styles.headerTitle}>Histórico de Caixas</Text></View>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {registros.map((c) => (
          <View key={c.id} style={styles.card}>
            <Text style={styles.title}>{c.data} — {c.status?.toUpperCase()}</Text>
            <Text style={styles.line}>Abertura: R$ {Number(c.valorInicial || 0).toFixed(2)} por {c.abertoPorNome || '-'}</Text>
            <Text style={styles.line}>Vendas: R$ {Number(c.vendasTotal || 0).toFixed(2)}</Text>
            <Text style={styles.line}>Ref.: R$ {Number(c.reforcosTotal || 0).toFixed(2)} | Sang.: R$ {Number(c.sangriasTotal || 0).toFixed(2)}</Text>
            <Text style={styles.line}>Esperado: R$ {Number(c.saldoEsperado || 0).toFixed(2)} | Real: {c.saldoReal != null ? `R$ ${Number(c.saldoReal).toFixed(2)}` : '-'}</Text>
            <Text style={styles.line}>Diferença: {c.diferenca != null ? `R$ ${Number(c.diferenca).toFixed(2)}` : '-'}</Text>
          </View>
        ))}
      </ScrollView>
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F1E8' },
  header: { backgroundColor: '#8B2F2F', paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20 },
  headerTitle: { color: '#fff', fontSize: 24, fontWeight: '600' },
  card: { backgroundColor:'#fff', borderRadius:12, padding:16, borderColor:'#F0EBE0', borderWidth:1, marginBottom: 12 },
  title: { color: '#8B2F2F', fontWeight: '700', marginBottom: 8 },
  line: { color: '#2C2C2C', marginBottom: 6 },
});
