import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colorSystem, typography, spacing } from '../design-system';
import { Period } from '../utils/dateUtils';

interface AdminStatsCardsProps {
  /** @deprecated O componente agora usa seus proprios estilos internos */
  styles?: any;
  loadingStats: boolean;
  stats: {
    totalPedidos: number;
    totalItens: number;
    tempoMedio: number;
  };
  onRefreshStats: () => void;
  loadingVendas: boolean;
  vendasStats: {
    totalVendido: number;
    totalPedidos: number;
    ticketMedio: number;
    totalCancelado: number;
    qtdCanceladas: number;
  };
  periodoSelecionado: Period;
  onSelectPeriodo: (periodo: Period) => void;
  onRefreshVendas: () => void;
  formatarMoeda: (valor: any) => string;
}

interface KpiCardProps {
  icon: string;
  iconColor: string;
  label: string;
  value: string;
  loading?: boolean;
}

function KpiCard({ icon, iconColor, label, value, loading }: KpiCardProps) {
  return (
    <View style={kpiStyles.card}>
      <View style={[kpiStyles.iconWrapper, { backgroundColor: `${iconColor}1A` }]}>
        <Ionicons name={icon as any} size={20} color={iconColor} />
      </View>
      <Text style={kpiStyles.label} numberOfLines={1}>{label}</Text>
      {loading
        ? <ActivityIndicator size="small" color={colorSystem.primary} style={{ marginTop: 4 }} />
        : <Text style={kpiStyles.value} numberOfLines={1}>{value}</Text>
      }
    </View>
  );
}

const kpiStyles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 100,
    backgroundColor: colorSystem.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colorSystem.border,
    padding: spacing.s16,
    alignItems: 'center',
    gap: spacing.s4,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.s4,
  },
  label: {
    ...typography.small,
    color: colorSystem.textMuted,
    textAlign: 'center',
  },
  value: {
    ...typography.headingM,
    color: colorSystem.text,
    textAlign: 'center',
    fontSize: 20,
  },
});

export default function AdminStatsCards({
  loadingStats,
  stats,
  onRefreshStats,
  loadingVendas,
  vendasStats,
  periodoSelecionado,
  onSelectPeriodo,
  onRefreshVendas,
  formatarMoeda,
}: AdminStatsCardsProps) {
  const PERIODS: { key: Period; label: string }[] = [
    { key: 'hoje', label: 'Hoje' },
    { key: 'semana', label: 'Semana' },
    { key: 'mes', label: 'Mes' },
  ];

  const taxaCancelamento =
    vendasStats.totalPedidos + vendasStats.qtdCanceladas > 0
      ? ((vendasStats.qtdCanceladas / (vendasStats.totalPedidos + vendasStats.qtdCanceladas)) * 100).toFixed(1)
      : '0.0';

  return (
    <View style={styles.root}>
      {/* Bloco: Estatisticas Operacionais */}
      <View style={styles.block}>
        <View style={styles.blockHeader}>
          <Text style={styles.blockTitle}>Estatisticas Operacionais</Text>
          <TouchableOpacity onPress={onRefreshStats} style={styles.refreshBtn} accessibilityLabel="Atualizar estatisticas">
            <Ionicons name="refresh" size={16} color={colorSystem.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.kpiRow}>
          <KpiCard
            icon="receipt"
            iconColor={colorSystem.primary}
            label="Pedidos"
            value={String(stats.totalPedidos)}
            loading={loadingStats}
          />
          <KpiCard
            icon="cube"
            iconColor={colorSystem.accent}
            label="Itens vendidos"
            value={`${stats.totalItens}x`}
            loading={loadingStats}
          />
          <KpiCard
            icon="time"
            iconColor={colorSystem.secondary}
            label="Tempo medio"
            value={`${stats.tempoMedio}m`}
            loading={loadingStats}
          />
        </View>
      </View>

      {/* Bloco: Estatisticas de Venda */}
      <View style={styles.block}>
        <View style={styles.blockHeader}>
          <Text style={styles.blockTitle}>Vendas do Periodo</Text>
          <View style={styles.periodChips}>
            {PERIODS.map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                style={[styles.periodChip, periodoSelecionado === key && styles.periodChipActive]}
                onPress={() => onSelectPeriodo(key)}
              >
                <Text style={[styles.periodChipText, periodoSelecionado === key && styles.periodChipTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity onPress={onRefreshVendas} style={styles.refreshBtn} accessibilityLabel="Atualizar vendas">
            <Ionicons name="refresh" size={16} color={colorSystem.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.kpiRow}>
          <KpiCard
            icon="cash"
            iconColor={colorSystem.success}
            label="Total Vendido"
            value={formatarMoeda(vendasStats.totalVendido)}
            loading={loadingVendas}
          />
          <KpiCard
            icon="cart"
            iconColor={colorSystem.primary}
            label="Pedidos"
            value={String(vendasStats.totalPedidos)}
            loading={loadingVendas}
          />
          <KpiCard
            icon="trending-up"
            iconColor={colorSystem.accent}
            label="Ticket Medio"
            value={formatarMoeda(vendasStats.ticketMedio)}
            loading={loadingVendas}
          />
        </View>

        {vendasStats.qtdCanceladas > 0 && (
          <View style={styles.cancelRow}>
            <View style={styles.cancelHeader}>
              <Ionicons name="warning" size={14} color={colorSystem.warning} />
              <Text style={styles.cancelTitle}>Cancelamentos</Text>
            </View>
            <View style={styles.kpiRow}>
              <KpiCard
                icon="close-circle"
                iconColor={colorSystem.warning}
                label="Total Cancelado"
                value={formatarMoeda(vendasStats.totalCancelado)}
                loading={loadingVendas}
              />
              <KpiCard
                icon="document-text"
                iconColor={colorSystem.warning}
                label="Comandas"
                value={String(vendasStats.qtdCanceladas)}
                loading={loadingVendas}
              />
              <KpiCard
                icon="stats-chart"
                iconColor={colorSystem.warning}
                label="Taxa"
                value={`${taxaCancelamento}%`}
                loading={loadingVendas}
              />
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.s16,
  },
  block: {
    backgroundColor: colorSystem.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colorSystem.border,
    padding: spacing.s16,
    gap: spacing.s12,
  },
  blockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s8,
  },
  blockTitle: {
    ...typography.body,
    fontWeight: '700',
    color: colorSystem.text,
    flex: 1,
  },
  refreshBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colorSystem.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  periodChips: {
    flexDirection: 'row',
    gap: spacing.s4,
  },
  periodChip: {
    paddingHorizontal: spacing.s12,
    paddingVertical: spacing.s4,
    borderRadius: 20,
    backgroundColor: colorSystem.background,
    borderWidth: 1,
    borderColor: colorSystem.border,
  },
  periodChipActive: {
    backgroundColor: colorSystem.primary,
    borderColor: colorSystem.primary,
  },
  periodChipText: {
    ...typography.small,
    color: colorSystem.textMuted,
    fontWeight: '600',
  },
  periodChipTextActive: {
    color: colorSystem.onPrimary,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: spacing.s12,
  },
  cancelRow: {
    borderTopWidth: 1,
    borderTopColor: colorSystem.border,
    paddingTop: spacing.s12,
    gap: spacing.s8,
  },
  cancelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s4,
  },
  cancelTitle: {
    ...typography.small,
    color: colorSystem.warning,
    fontWeight: '700',
  },
});