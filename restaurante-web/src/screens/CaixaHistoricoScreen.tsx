import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import CaixaService from '../services/CaixaService';
// @ts-ignore
import CashFlowScreen from './CashFlowScreen';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency } from '../utils/formatCurrency';
import { Caixa } from '../types';
import { ScreenScaffold } from '../layouts/ScreenScaffold';
import { colors } from '../theme/colors';
interface CaixaHistoricoScreenProps {
  onClose: () => void;
}

export default function CaixaHistoricoScreen({ onClose }: CaixaHistoricoScreenProps) {
  const { user } = useAuth();
  const [registros, setRegistros] = useState<Caixa[]>([]);
  const [selectedCaixa, setSelectedCaixa] = useState<Caixa | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      if (user?.companyId) {
        const data = await CaixaService.historico(user.companyId);
        setRegistros(data);
      }
    };
    fetchHistory();
  }, [user]);

  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'aberto': return colors.success;
      case 'fechado': return colors.textSecondary;
      default: return colors.textSecondary;
    }
  };

  return (
    <ScreenScaffold
      title="Histórico de Caixas"
      leftAction={{ label: 'Voltar', onPress: onClose }}
    >
      <ScrollView contentContainerStyle={{ padding: 15 }}>
        <Text style={styles.hintText}>Toque em um cartão para ver o extrato completo</Text>

        {registros.map((c) => (
          <TouchableOpacity key={c.id} style={styles.card} onPress={() => setSelectedCaixa(c)}>
            {/* Header do Card */}
            <View style={styles.cardHeader}>
              <View style={styles.dateContainer}>
                <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                <Text style={styles.dateText}>{formatDate(c.data)}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(c.status) }]}>
                <Text style={styles.statusText}>{c.status?.toUpperCase()}</Text>
              </View>
            </View>

            {/* Operador */}
            <Text style={styles.operatorText}>
              <Ionicons name="person-circle-outline" size={14} color={colors.textSecondary} />
              {' '}Operador: {c.abertoPorNome || c.fechadoPorNome || '-'}
            </Text>

            <View style={styles.divider} />

            {/* Grid de Métricas */}
            <View style={styles.metricsGrid}>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Fundo Inicial</Text>
                <Text style={[styles.metricValue, { color: colors.text }]}>{formatCurrency(c.valorInicial)}</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Vendas Totais</Text>
                <Text style={[styles.metricValue, { color: colors.success }]}>{formatCurrency(c.vendasTotal)}</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Reforços</Text>
                <Text style={[styles.metricValue, { color: colors.secondary }]}>{formatCurrency(c.reforcosTotal)}</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Sangrias</Text>
                <Text style={[styles.metricValue, { color: colors.danger }]}>{formatCurrency(c.sangriasTotal)}</Text>
              </View>
            </View>

            {/* Rodapé do Card - Fechamento */}
            <View style={styles.footerContainer}>
              <View style={styles.footerRow}>
                <Text style={styles.footerLabel}>Esperado:</Text>
                <Text style={styles.footerValue}>{formatCurrency(c.saldoEsperado)}</Text>
              </View>
              <View style={[styles.footerRow, { marginTop: 4 }]}>
                <Text style={styles.footerLabel}>Real (Contado):</Text>
                <Text style={[styles.footerValue, { fontWeight: 'bold' }]}>
                  {c.saldoReal != null ? formatCurrency(c.saldoReal) : '-'}
                </Text>
              </View>

              {c.diferenca != null && (
                <View style={[styles.footerRow, { marginTop: 8, backgroundColor: c.diferenca < 0 ? colors.dangerSurface : colors.successSurface, padding: 6, borderRadius: 4 }]}>
                  <Text style={[styles.footerLabel, { color: c.diferenca < 0 ? colors.danger : colors.success, fontWeight: 'bold' }]}>
                    DIFERENÇA:
                  </Text>
                  <Text style={[styles.footerValue, { fontWeight: '900', color: c.diferenca < 0 ? colors.danger : colors.success }]}>
                    {formatCurrency(c.diferenca)}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Modal visible={!!selectedCaixa} animationType="slide" onRequestClose={() => setSelectedCaixa(null)}>
        <CashFlowScreen caixa={selectedCaixa} onClose={() => setSelectedCaixa(null)} />
      </Modal>

      <StatusBar style="light" />
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  hintText: { textAlign: 'center', color: colors.textSecondary, marginBottom: 15, fontSize: 13, fontStyle: 'italic' },

  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 15,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  dateContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateText: { fontSize: 16, fontWeight: 'bold', color: colors.text },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { color: colors.white, fontSize: 10, fontWeight: 'bold' },

  operatorText: { fontSize: 13, color: colors.textSecondary, marginBottom: 10 },
  divider: { height: 1, backgroundColor: colors.border, marginBottom: 10 },

  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 },
  metricItem: { width: '50%', marginBottom: 12 },
  metricLabel: { fontSize: 12, color: colors.textSecondary },
  metricValue: { fontSize: 15, fontWeight: '600' },

  footerContainer: { backgroundColor: colors.surfaceMuted, padding: 10, borderRadius: 8 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerLabel: { fontSize: 13, color: colors.textSecondary },
  footerValue: { fontSize: 13, color: colors.text }
});
