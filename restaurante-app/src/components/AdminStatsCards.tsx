import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../theme/colors';
import { Period } from '../utils/dateUtils';

interface AdminStatsCardsProps {
  styles: any;
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

export default function AdminStatsCards({
  styles,
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
  return (
    <>
      <View style={styles.statsCard}>
        <View style={styles.statsHeader}>
          <Text style={styles.statsTitle}>Estatísticas Operacionais</Text>
          <TouchableOpacity onPress={onRefreshStats}>
            <Text style={styles.refreshButton}>🔄</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.statsContentWrapper}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{loadingStats ? '...' : stats.totalPedidos}</Text>
              <Text style={styles.statLabel}>Pedidos</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{loadingStats ? '...' : `${stats.totalItens}x`}</Text>
              <Text style={styles.statLabel}>Itens{'\n'}vendidos</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{loadingStats ? '...' : `${stats.tempoMedio}m`}</Text>
              <Text style={styles.statLabel}>Tempo{'\n'}médio</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.vendasCard}>
        <View style={styles.statsHeader}>
          <Text style={styles.vendasCardTitle}>Estatísticas de Venda</Text>
          <TouchableOpacity onPress={onRefreshVendas}>
            <Text style={styles.refreshButton}>🔄</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.vendasTabs}>
          <TouchableOpacity
            style={[styles.vendaTab, periodoSelecionado === 'hoje' && styles.vendaTabActive]}
            onPress={() => onSelectPeriodo('hoje')}
          >
            <Text style={[styles.vendaTabText, periodoSelecionado === 'hoje' && styles.vendaTabTextActive]}>
              Hoje
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.vendaTab, periodoSelecionado === 'semana' && styles.vendaTabActive]}
            onPress={() => onSelectPeriodo('semana')}
          >
            <Text style={[styles.vendaTabText, periodoSelecionado === 'semana' && styles.vendaTabTextActive]}>
              Semana
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.vendaTab, periodoSelecionado === 'mes' && styles.vendaTabActive]}
            onPress={() => onSelectPeriodo('mes')}
          >
            <Text style={[styles.vendaTabText, periodoSelecionado === 'mes' && styles.vendaTabTextActive]}>
              Mês
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.vendasContent}>
          <View style={styles.vendasRowStats}>
            <View style={styles.vendaStatItem}>
              <Text style={styles.vendaStatValue}>
                {loadingVendas ? '...' : formatarMoeda(vendasStats.totalVendido)}
              </Text>
              <Text style={styles.vendaStatLabel}>Total Vendido</Text>
            </View>
            <View style={styles.vendaStatItem}>
              <Text style={styles.vendaStatValue}>
                {loadingVendas ? '...' : vendasStats.totalPedidos}
              </Text>
              <Text style={styles.vendaStatLabel}>Pedidos</Text>
            </View>
            <View style={styles.vendaStatItem}>
              <Text style={styles.vendaStatValue}>
                {loadingVendas ? '...' : formatarMoeda(vendasStats.ticketMedio)}
              </Text>
              <Text style={styles.vendaStatLabel}>Ticket Médio</Text>
            </View>
          </View>

          {vendasStats.qtdCanceladas > 0 && (
            <View style={[styles.vendasRowStats, { marginTop: 15, backgroundColor: colors.warningSurface, borderRadius: 8, padding: 10 }]}>
              <View style={styles.vendaStatItem}>
                <Text style={[styles.vendaStatValue, { color: colors.warning }]}>
                  {loadingVendas ? '...' : formatarMoeda(vendasStats.totalCancelado)}
                </Text>
                <Text style={[styles.vendaStatLabel, { color: colors.warning }]}>Total Cancelado</Text>
              </View>
              <View style={styles.vendaStatItem}>
                <Text style={[styles.vendaStatValue, { color: colors.warning }]}>
                  {loadingVendas ? '...' : vendasStats.qtdCanceladas}
                </Text>
                <Text style={[styles.vendaStatLabel, { color: colors.warning }]}>Comandas Canceladas</Text>
              </View>
              <View style={styles.vendaStatItem}>
                <Text style={[styles.vendaStatValue, { color: colors.warning, fontSize: 16 }]}>
                  {loadingVendas ? '...' : `${((vendasStats.qtdCanceladas / (vendasStats.totalPedidos + vendasStats.qtdCanceladas)) * 100).toFixed(1)}%`}
                </Text>
                <Text style={[styles.vendaStatLabel, { color: colors.warning }]}>Taxa Cancelamento</Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </>
  );
}
