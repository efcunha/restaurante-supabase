import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, ScrollView, Modal, ActivityIndicator, Alert } from 'react-native';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import CaixaService from '../services/CaixaService';
import * as Print from 'expo-print';
import { getUserFriendlyMessage } from '../utils/errors';
import { Caixa, Comanda } from '../types';
import { supabase } from '../config/SupabaseConfig';
import { colors } from '../theme/colors';
interface FechamentoResult {
  saldoEsperado: number;
  saldoReal: number;
  diferenca: number;
  caixaData: Caixa;
}

export default function CaixaFechamentoScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [caixasAbertos, setCaixasAbertos] = useState<Caixa[]>([]);
  const [selectedCaixa, setSelectedCaixa] = useState<Caixa | null>(null);
  const [saldoReal, setSaldoReal] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [fechamentoResult, setFechamentoResult] = useState<FechamentoResult | null>(null); // Para mostrar modal de sucesso/impressão
  const [blindClosing, setBlindClosing] = useState<boolean>(false); // Configuração de Fechamento Cego
  const [totalCancelado, setTotalCancelado] = useState<number>(0); // ✅ Novo estado para exibir na tela

  useEffect(() => {
    loadCaixas();
    loadConfig();
  }, []);

  const loadConfig = async () => {
    if (!user?.companyId) return;
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .eq('company_id', user.companyId)
        .eq('key', 'financeiro')
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data && data.value) {
        setBlindClosing(data.value.blind_closing || false);
      }
    } catch (e) {
      console.error("Erro ao carregar config financeira:", e);
    }
  };

  const loadCaixas = async () => {
    if (!user?.companyId) return;
    setLoading(true);
    const abertos = await CaixaService.getCaixasAbertos(user.companyId);
    setCaixasAbertos(abertos);
    setLoading(false);
  };

  const handleSelectCaixa = async (caixa: Caixa) => {
    if (!user?.companyId) return;
    setSelectedCaixa(caixa);
    setSaldoReal('');

    // ✅ Buscar total cancelado ao selecionar o caixa
    setLoading(true);
    try {
      const total = await CaixaService.getTotalCancelados(user.companyId, caixa.data);
      setTotalCancelado(total);
    } catch (e) {
      console.error('Erro ao buscar cancelados:', e);
    } finally {
      setLoading(false);
    }
  };

  const fechar = async () => {
    if (!selectedCaixa || !user?.companyId) return;
    try {
      if (!saldoReal || parseFloat(saldoReal) < 0) {
        alert('⚠️ Atenção: Informe o saldo real contado no caixa.');
        return;
      }

      // Calcular diferença antes de fechar
      const diff = parseFloat(saldoReal) - (
        (selectedCaixa.valorInicial || 0) +
        (selectedCaixa.vendasTotal || 0) +
        (selectedCaixa.reforcosTotal || 0) -
        (selectedCaixa.sangriasTotal || 0)
      );

      const confirmFechamento = async () => {
        setLoading(true);
        try {
          const companyId = user?.companyId;
          if (!companyId) {
            setLoading(false);
            return;
          }

          // @ts-ignore - CaixaService definition might need update for full types
          const r = await CaixaService.fecharCaixa(
            companyId,
            user?.id || null,
            user?.nome || '',
            saldoReal,
            selectedCaixa.id
          );
          setFechamentoResult({ ...r, caixaData: selectedCaixa });
          setLoading(false);
          setSelectedCaixa(null);
          loadCaixas();
        } catch (e: any) {
          setLoading(false);
          alert('❌ Erro Detalhado: ' + (e.message || String(e)));
        }
      };

      if (Math.abs(diff) > 0.01) {
        Alert.alert(
          'Diferença no Caixa',
          `O saldo informado tem uma diferença de R$ ${diff.toFixed(2)} em relação ao esperado.\n\nDeseja fechar mesmo assim?`,
          [
            { text: 'Corrigir Valor', style: 'cancel' },
            { text: 'Fechar Com Diferença', onPress: confirmFechamento, style: 'destructive' }
          ]
        );
        return;
      }

      await confirmFechamento();

    } catch (e: any) {
      setLoading(false);
      alert('❌ Erro: ' + e.message);
    }
  };

  const gerarRelatorioHTML = async () => {
    if (!fechamentoResult || !user?.companyId) return '';
    const caixa = fechamentoResult.caixaData;
    const r = fechamentoResult;

    // Buscar comandas detalhadas
    // @ts-ignore
    const comandas: Comanda[] = await CaixaService.getComandasFechadas(user.companyId, caixa.data);

    // Buscar total cancelado (Informativo)
    const canceladoHTML = await CaixaService.getTotalCancelados(user.companyId, caixa.data);

    const htmlComandas = comandas.map(c => `
      <tr>
        <td>#${c.numeroComanda || c.comandaNumber || '-'}</td>
        <td>${(c.itens || []).length} itens</td>
        <td>R$ ${(c.totalConsumido || 0).toFixed(2)}</td>
      </tr>
    `).join('');

    return `
      <html>
        <head>
          <style>
            body { font-family: 'Helvetica', sans-serif; padding: 20px; }
            h1 { text-align: center; color: ${colors.text}; }
            h2 { border-bottom: 2px solid ${colors.border}; padding-bottom: 5px; margin-top: 20px; }
            .info { margin-bottom: 20px; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid ${colors.border}; padding: 8px; text-align: left; }
            th { background-color: ${colors.surfaceMuted}; }
            .total-row { font-weight: bold; background-color: ${colors.background}; }
            .footer { margin-top: 40px; text-align: center; font-size: 12px; color: ${colors.textSecondary}; }
            .cancelado-row { color: ${colors.danger}; font-style: italic; }
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
            <tr class="cancelado-row"><td>Total Cancelado (Informativo)</td><td>R$ ${canceladoHTML.toFixed(2)}</td></tr>
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
    } catch (e: any) {
      setLoading(false);
      alert('Erro ao imprimir: ' + getUserFriendlyMessage(e));
    }
  };

  if (loading && !selectedCaixa && caixasAbertos.length === 0) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
          <View style={styles.headerLeft} />
          <View style={styles.headerCenter}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="lock-closed-outline" size={24} color={colors.white} style={styles.headerIcon} />
              <Text style={styles.headerTitle}>Fechamento de Caixa</Text>
            </View>
            {!!user && <Text style={styles.userInfo}>Operador: {user.nome || user.email}</Text>}
          </View>
          <View style={styles.headerRight} />
        </View>
        <ActivityIndicator size="large" color={colors.secondary} style={{ marginTop: 50 }} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <View style={styles.headerLeft} />
        <View style={styles.headerCenter}>
          <View style={styles.headerTitleRow}>
            <Ionicons name="lock-closed-outline" size={24} color={colors.white} style={styles.headerIcon} />
            <Text style={styles.headerTitle}>Fechamento de Caixa</Text>
          </View>
          {!!user && <Text style={styles.userInfo}>Operador: {user.nome || user.email}</Text>}
        </View>
        <View style={styles.headerRight} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>

        {/* LISTA DE CAIXAS ABERTOS (se nada selecionado) */}
        {!selectedCaixa && (
          <View>
            <Text style={styles.sectionTitle}>Caixas Pendentes de Fechamento</Text>
            {caixasAbertos.length === 0 ? (
              <Text style={{ color: colors.textSecondary, fontStyle: 'italic', marginTop: 10 }}>Nenhum caixa aberto encontrado.</Text>
            ) : (
              caixasAbertos.map((c) => (
                <TouchableOpacity key={c.id} style={styles.cardItem} onPress={() => handleSelectCaixa(c)}>
                  <View>
                    <Text style={styles.cardDate}>{c.data}</Text>
                    <Text style={styles.cardStatus}>Aberto por: {c.abertoPorNome}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    {blindClosing ? (
                      <Text style={[styles.cardValue, { color: colors.textSecondary, fontSize: 14 }]}>🔒 Oculto</Text>
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
              <Text style={{ color: colors.primary, fontWeight: 'bold' }}>← Voltar para lista</Text>
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
                  <Text style={[styles.resumoValue, { color: colors.textSecondary, fontSize: 14 }]}>🔒 Oculto</Text>
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

              {/* ✅ Exibir Total Cancelado (Informativo) */}
              <View style={[styles.resumoRow, { marginTop: 4 }]}>
                <Text style={[styles.resumoLabel, { color: colors.textSecondary, fontStyle: 'italic' }]}>Cancelado (Info):</Text>
                <Text style={[styles.resumoValue, { color: colors.textSecondary, fontStyle: 'italic' }]}>R$ {totalCancelado?.toFixed(2)}</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.resumoRow}>
                <Text style={[styles.resumoLabel, styles.totalLabel]}>Saldo Esperado:</Text>
                {blindClosing ? (
                  <Text style={[styles.resumoValue, styles.totalValue, { color: colors.textSecondary, fontSize: 16 }]}>🔒 (Fechamento Cego)</Text>
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

            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={fechar}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.text} />
              ) : (
                <Text style={styles.btnText}>CONCLUIR FECHAMENTO</Text>
              )}
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
              <Text style={{ color: colors.textSecondary }}>Fechar e Sair</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.primary,
    paddingBottom: 15,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    zIndex: 10,
    elevation: 8,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  headerLeft: { flex: 1 },
  headerCenter: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRight: { flex: 1 },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: { marginRight: 6 },
  headerTitle: {
    fontSize: 18,
    color: colors.white,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  userInfo: {
    color: colors.userInfo,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: colors.primary, marginBottom: 15 },
  cardItem: { backgroundColor: colors.white, padding: 15, borderRadius: 10, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderColor: colors.border, borderWidth: 1 },
  cardDate: { fontSize: 16, fontWeight: 'bold', color: colors.text },
  cardStatus: { fontSize: 12, color: colors.textSecondary },
  cardValue: { fontSize: 16, fontWeight: 'bold', color: colors.text },
  cardLabel: { fontSize: 12, color: colors.primary },
  backLink: { marginBottom: 15, padding: 5 },
  label: { color: colors.primary, fontWeight: '600', marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, marginBottom: 20 },
  btn: { backgroundColor: colors.secondary, padding: 16, borderRadius: 12, alignItems: 'center' },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: colors.text, fontWeight: '700' },
  resumoCard: { backgroundColor: colors.white, borderRadius: 12, padding: 16, borderColor: colors.border, borderWidth: 1, marginBottom: 10 },
  resumoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  resumoLabel: { fontSize: 14, color: colors.textSecondary },
  resumoValue: { fontSize: 14, fontWeight: 'bold', color: colors.text },
  resumoLabelBold: { fontSize: 16, fontWeight: 'bold', color: colors.text },
  resumoValueBold: { fontSize: 16, fontWeight: 'bold', color: colors.text },
  totalLabel: { marginTop: 5 },
  totalValue: { marginTop: 5, fontSize: 18, color: colors.success }, // Highlight esperado
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 8 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalCard: { backgroundColor: colors.white, width: '85%', padding: 25, borderRadius: 15, alignItems: 'center' },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: colors.text },
});
