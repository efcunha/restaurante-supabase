import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, ScrollView, Modal, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import CaixaService from '../services/CaixaService';
import * as Print from 'expo-print';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';

export default function CaixaFechamentoScreen() {
  const { user } = useAuth();
  const [caixasAbertos, setCaixasAbertos] = useState([]);
  const [selectedCaixa, setSelectedCaixa] = useState(null);
  const [saldoReal, setSaldoReal] = useState('');
  const [loading, setLoading] = useState(false);
  const [fechamentoResult, setFechamentoResult] = useState(null); // Para mostrar modal de sucesso/impressão
  const [blindClosing, setBlindClosing] = useState(false); // Configuração de Fechamento Cego

  useEffect(() => {
    loadCaixas();
    loadConfig();
  }, []);

  const loadConfig = async () => {
    if (!user?.companyId) return;
    try {
      const docRef = doc(db, 'companies', user.companyId, 'settings', 'financeiro');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setBlindClosing(snap.data().blindClosing || false);
      }
    } catch (e) {
      console.error("Erro ao carregar config financeira:", e);
    }
  };

  const loadCaixas = async () => {
    setLoading(true);
    const abertos = await CaixaService.getCaixasAbertos(user.companyId);
    setCaixasAbertos(abertos);
    setLoading(false);
  };

  const handleSelectCaixa = (caixa) => {
    setSelectedCaixa(caixa);
    setSaldoReal('');
  };

  const fechar = async () => {
    if (!selectedCaixa) return;
    try {
      if (!saldoReal || parseFloat(saldoReal) < 0) {
        alert('⚠️ Atenção: Informe o saldo real contado no caixa.');
        return;
      }

      setLoading(true);
      const r = await CaixaService.fecharCaixa(
        user.companyId,
        user?.id,
        user?.nome,
        saldoReal,
        selectedCaixa.data // Passando a data do caixa selecionado
      );

      setFechamentoResult({ ...r, caixaData: selectedCaixa });
      setLoading(false);
      setSelectedCaixa(null);
      loadCaixas(); // Recarrega lista
    } catch (e) {
      setLoading(false);
      alert('❌ Erro: ' + e.message);
    }
  };

  const gerarRelatorioHTML = async () => {
    if (!fechamentoResult) return '';
    const caixa = fechamentoResult.caixaData;
    const r = fechamentoResult;

    // Buscar comandas detalhadas
    const comandas = await CaixaService.getComandasFechadas(user.companyId, caixa.data);

    let htmlComandas = comandas.map(c => `
      <tr>
        <td>#${c.numeroComanda || c.comandaNumber || '-'}</td>
        <td>${c.itens?.length || 0} itens</td>
        <td>R$ ${(c.total || 0).toFixed(2)}</td>
      </tr>
    `).join('');

    return `
      <html>
        <head>
          <style>
            body { font-family: 'Helvetica', sans-serif; padding: 20px; }
            h1 { text-align: center; color: #333; }
            h2 { border-bottom: 2px solid #ddd; padding-bottom: 5px; margin-top: 20px; }
            .info { margin-bottom: 20px; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .total-row { font-weight: bold; background-color: #e8e8e8; }
            .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <h1>Fechamento de Caixa</h1>
          
          <div class="info">
            <p><strong>Data do Caixa:</strong> ${caixa.data}</p>
            <p><strong>Fechado por:</strong> ${user?.nome}</p>
            <p><strong>Data Fechamento:</strong> ${new Date().toLocaleString('pt-BR')}</p>
          </div>

          <h2>Resumo Financeiro</h2>
          <table>
            <tr><th>Descrição</th><th>Valor</th></tr>
            <tr><td>Saldo Inicial</td><td>R$ ${(caixa.valorInicial || 0).toFixed(2)}</td></tr>
            <tr><td>Total Vendas</td><td>R$ ${(caixa.vendasTotal || 0).toFixed(2)}</td></tr>
            <tr><td>Reforços</td><td>R$ ${(caixa.reforcosTotal || 0).toFixed(2)}</td></tr>
            <tr><td>Sangrias</td><td>- R$ ${(caixa.sangriasTotal || 0).toFixed(2)}</td></tr>
            <tr class="total-row"><td>Saldo Esperado</td><td>R$ ${(r.saldoEsperado).toFixed(2)}</td></tr>
            <tr class="total-row"><td>Saldo Real (Contado)</td><td>R$ ${(r.saldoReal).toFixed(2)}</td></tr>
            <tr class="total-row"><td>Diferença</td><td>R$ ${(r.diferenca).toFixed(2)}</td></tr>
          </table>

          <h2>Detalhamento Vendas</h2>
          <table>
            <tr><th>Forma Pagamento</th><th>Valor</th></tr>
            <tr><td>Dinheiro</td><td>R$ ${(caixa.porForma?.dinheiro || 0).toFixed(2)}</td></tr>
            <tr><td>Pix</td><td>R$ ${(caixa.porForma?.pix || 0).toFixed(2)}</td></tr>
            <tr><td>Débito</td><td>R$ ${(caixa.porForma?.debito || 0).toFixed(2)}</td></tr>
            <tr><td>Crédito</td><td>R$ ${(caixa.porForma?.credito || 0).toFixed(2)}</td></tr>
            <tr><td>Outros</td><td>R$ ${(caixa.porForma?.outros || 0).toFixed(2)}</td></tr>
          </table>

          <h2>Comandas do Dia</h2>
          <table>
            <tr><th>Comanda</th><th>Itens</th><th>Valor</th></tr>
            ${htmlComandas}
          </table>

          <div class="footer">
            <p>Sistema de Gestão Restaurante - Impresso em ${new Date().toLocaleString('pt-BR')}</p>
          </div>
        </body>
      </html>
    `;
  };

  const imprimir = async () => {
    try {
      setLoading(true);
      const html = await gerarRelatorioHTML();
      await Print.printAsync({ html });
      setLoading(false);
    } catch (e) {
      setLoading(false);
      alert('Erro ao imprimir: ' + e.message);
    }
  };

  if (loading && !fechamentoResult) {
    return (
      <View style={styles.container}>
        <View style={styles.header}><Text style={styles.headerTitle}>Carregando...</Text></View>
        <ActivityIndicator size="large" color="#E5B84A" style={{ marginTop: 50 }} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>

        {/* LISTA DE CAIXAS ABERTOS (se nada selecionado) */}
        {!selectedCaixa && (
          <View>
            <Text style={styles.sectionTitle}>Caixas Pendentes de Fechamento</Text>
            {caixasAbertos.length === 0 ? (
              <Text style={{ color: '#666', fontStyle: 'italic', marginTop: 10 }}>Nenhum caixa aberto encontrado.</Text>
            ) : (
              caixasAbertos.map((c) => (
                <TouchableOpacity key={c.id} style={styles.cardItem} onPress={() => handleSelectCaixa(c)}>
                  <View>
                    <Text style={styles.cardDate}>{c.data}</Text>
                    <Text style={styles.cardStatus}>Aberto por: {c.abertoPorNome}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    {blindClosing ? (
                      <Text style={[styles.cardValue, { color: '#999', fontSize: 14 }]}>🔒 Oculto</Text>
                    ) : (
                      <>
                        <Text style={styles.cardValue}>R$ {Number(c.vendasTotal || 0).toFixed(2)}</Text>
                        <Text style={styles.cardLabel}>em vendas</Text>
                      </>
                    )}
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* DETALHES DO CAIXA SELECIONADO */}
        {selectedCaixa && (
          <View>
            <TouchableOpacity onPress={() => setSelectedCaixa(null)} style={styles.backLink}>
              <Text style={{ color: '#8B2F2F', fontWeight: 'bold' }}>← Voltar para lista</Text>
            </TouchableOpacity>

            <View style={styles.resumoCard}>
              <Text style={styles.sectionTitle}>💰 Resumo Financeiro</Text>

              <View style={styles.resumoRow}>
                <Text style={styles.resumoLabel}>Saldo Inicial:</Text>
                <Text style={styles.resumoValue}>R$ {selectedCaixa.valorInicial?.toFixed(2)}</Text>
              </View>
              <View style={styles.resumoRow}>
                <Text style={styles.resumoLabel}>Vendas:</Text>
                {blindClosing ? (
                  <Text style={[styles.resumoValue, { color: '#999', fontSize: 14 }]}>🔒 Oculto</Text>
                ) : (
                  <Text style={styles.resumoValue}>R$ {selectedCaixa.vendasTotal?.toFixed(2)}</Text>
                )}
              </View>
              <View style={styles.resumoRow}>
                <Text style={styles.resumoLabel}>Reforços:</Text>
                <Text style={styles.resumoValue}>+ R$ {selectedCaixa.reforcosTotal?.toFixed(2)}</Text>
              </View>
              <View style={styles.resumoRow}>
                <Text style={styles.resumoLabel}>Sangrias:</Text>
                <Text style={styles.resumoValue}>- R$ {selectedCaixa.sangriasTotal?.toFixed(2)}</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.resumoRow}>
                <Text style={[styles.resumoLabel, styles.totalLabel]}>Saldo Esperado:</Text>
                {blindClosing ? (
                  <Text style={[styles.resumoValue, styles.totalValue, { color: '#999', fontSize: 16 }]}>🔒 (Fechamento Cego)</Text>
                ) : (
                  <Text style={[styles.resumoValue, styles.totalValue]}>
                    R$ {(
                      (selectedCaixa.valorInicial || 0) +
                      (selectedCaixa.vendasTotal || 0) +
                      (selectedCaixa.reforcosTotal || 0) -
                      (selectedCaixa.sangriasTotal || 0)
                    ).toFixed(2)}
                  </Text>
                )}
              </View>

              {!blindClosing && (
                <ScrollView style={{ maxHeight: 100, marginTop: 10 }}>
                  <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>Por Forma de Pagamento:</Text>
                  <Text>💵 Dinheiro: R$ {selectedCaixa.porForma?.dinheiro?.toFixed(2)}</Text>
                  <Text>💠 Pix: R$ {selectedCaixa.porForma?.pix?.toFixed(2)}</Text>
                  <Text>💳 Débito: R$ {selectedCaixa.porForma?.debito?.toFixed(2)}</Text>
                  <Text>💳 Crédito: R$ {selectedCaixa.porForma?.credito?.toFixed(2)}</Text>
                </ScrollView>
              )}
            </View>
            <Text style={styles.label}>Saldo real contado</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={saldoReal}
              onChangeText={setSaldoReal}
              placeholder="Ex: 150.00"
            />

            <TouchableOpacity style={styles.btn} onPress={fechar}>
              <Text style={styles.btnText}>CONCLUIR FECHAMENTO</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* MODAL DE SUCESSO / IMPRESSÃO */}
      <Modal visible={!!fechamentoResult} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>✅ Caixa Fechado!</Text>

            {fechamentoResult && (
              <View style={{ marginVertical: 15 }}>
                <Text>Saldo Esperado: R$ {fechamentoResult.saldoEsperado.toFixed(2)}</Text>
                <Text>Saldo Real: R$ {fechamentoResult.saldoReal.toFixed(2)}</Text>
                <Text style={{ fontWeight: 'bold', marginTop: 5, color: fechamentoResult.diferenca !== 0 ? 'red' : 'green' }}>
                  Diferença: R$ {fechamentoResult.diferenca.toFixed(2)}
                </Text>
              </View>
            )}

            <TouchableOpacity style={[styles.btn, { marginBottom: 10 }]} onPress={imprimir}>
              <Text style={styles.btnText}>🖨️ IMPRIMIR RELATÓRIO</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setFechamentoResult(null)} style={{ padding: 15 }}>
              <Text style={{ color: '#666' }}>Fechar e Sair</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F1E8' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#8B2F2F', marginBottom: 15 },
  cardItem: { backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderColor: '#E0D8C8', borderWidth: 1 },
  cardDate: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  cardStatus: { fontSize: 12, color: '#666' },
  cardValue: { fontSize: 16, fontWeight: 'bold', color: '#2C2C2C' },
  cardLabel: { fontSize: 12, color: '#8B2F2F' },
  backLink: { marginBottom: 15, padding: 5 },
  label: { color: '#8B2F2F', fontWeight: '600', marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E0D8C8', borderRadius: 12, padding: 14, marginBottom: 20 },
  btn: { backgroundColor: '#E5B84A', padding: 16, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#2C2C2C', fontWeight: '700' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderColor: '#F0EBE0', borderWidth: 1, marginBottom: 10 },
  highlightTitle: { fontSize: 18, fontWeight: 'bold', color: '#8B2F2F', marginBottom: 10, textAlign: 'center' },
  line: { color: '#2C2C2C', marginBottom: 6, fontSize: 15 },
  section: { color: '#8B2F2F', fontWeight: '700', marginBottom: 8, marginTop: 8 },
  divider: { height: 1, backgroundColor: '#E0D8C8', marginVertical: 8 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalCard: { backgroundColor: '#fff', width: '85%', padding: 25, borderRadius: 15, alignItems: 'center' },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#2C2C2C' },
});
