import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Table } from './ui-next/Table';
import { colors } from '../theme/colors';
/**
 * Componente: Card de Dados do Garçom
 */
export const CardDadosGarcom = ({ nome }) => (
  <View style={styles.card}>
    <Text style={styles.cardTitle}>👤 Dados do Garçom</Text>
    <View style={styles.cardContent}>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Nome:</Text>
        <Text style={styles.infoValue}>{nome}</Text>
      </View>
    </View>
  </View>
);

// Valores padrão para estatísticas vazias
const EMPTY_STATS = {
  totalVendido: 0,
  quantidadeComandas: 0,
  ticketMedio: 0,
  totalPedidos: 0,
  totalRecebido: 0,
  totalAberto: 0,
  comandasAbertas: 0,
  comandasFechadas: 0,
};

const EMPTY_PAGAMENTOS = {
  dinheiro: { total: 0, quantidade: 0 },
  pix: { total: 0, quantidade: 0 },
  debito: { total: 0, quantidade: 0 },
  credito: { total: 0, quantidade: 0 },
};

// Helper para garantir número válido
const safeNumber = (value) => {
  const num = Number(value);
  return isNaN(num) ? 0 : num;
};

const formatCurrency = (value) => `R$ ${safeNumber(value).toFixed(2)}`;

const formatPaymentCell = (entry) => `${formatCurrency(entry?.total)} • ${safeNumber(entry?.quantidade)}x`;

/**
 * Componente: Card de Vendas (Hoje/Semana/Mês)
 */
export const CardVendas = ({ vendas }) => {
  // Garantir que vendas tem estrutura correta
  const hoje = vendas?.hoje || EMPTY_STATS;
  const semana = vendas?.semana || EMPTY_STATS;
  const mes = vendas?.mes || EMPTY_STATS;

  const salesRows = [
    {
      periodo: 'Hoje',
      totalVendido: formatCurrency(hoje.totalVendido),
      comandas: String(safeNumber(hoje.quantidadeComandas)),
      ticketMedio: formatCurrency(hoje.ticketMedio),
    },
    {
      periodo: 'Semana',
      totalVendido: formatCurrency(semana.totalVendido),
      comandas: String(safeNumber(semana.quantidadeComandas)),
      ticketMedio: formatCurrency(semana.ticketMedio),
    },
    {
      periodo: 'Mês',
      totalVendido: formatCurrency(mes.totalVendido),
      comandas: String(safeNumber(mes.quantidadeComandas)),
      ticketMedio: formatCurrency(mes.ticketMedio),
    },
  ];

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>💰 Vendas por Período</Text>
      <View style={styles.cardContent}>
        <Table
          columns={[
            { key: 'periodo', title: 'Período', width: 120 },
            { key: 'totalVendido', title: 'Total Vendido', width: 180 },
            { key: 'comandas', title: 'Comandas', width: 130 },
            { key: 'ticketMedio', title: 'Ticket Médio', width: 160 },
          ]}
          rows={salesRows}
          rowKey={(row) => row.periodo}
        />
      </View>
    </View>
  );
};

/**
 * Componente: Card de Pagamentos Recebidos
 */
export const CardPagamentos = ({ pagamentos }) => {
  // Garantir que pagamentos tem estrutura correta
  const hoje = pagamentos?.hoje || EMPTY_PAGAMENTOS;
  const semana = pagamentos?.semana || EMPTY_PAGAMENTOS;
  const mes = pagamentos?.mes || EMPTY_PAGAMENTOS;

  const paymentRows = [
    {
      metodo: 'Dinheiro',
      hoje: formatPaymentCell(hoje.dinheiro),
      semana: formatPaymentCell(semana.dinheiro),
      mes: formatPaymentCell(mes.dinheiro),
    },
    {
      metodo: 'Pix',
      hoje: formatPaymentCell(hoje.pix),
      semana: formatPaymentCell(semana.pix),
      mes: formatPaymentCell(mes.pix),
    },
    {
      metodo: 'Cartão Débito',
      hoje: formatPaymentCell(hoje.debito),
      semana: formatPaymentCell(semana.debito),
      mes: formatPaymentCell(mes.debito),
    },
    {
      metodo: 'Cartão Crédito',
      hoje: formatPaymentCell(hoje.credito),
      semana: formatPaymentCell(semana.credito),
      mes: formatPaymentCell(mes.credito),
    },
  ];

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>💳 Pagamentos Recebidos</Text>
      <View style={styles.cardContent}>
        <Table
          columns={[
            { key: 'metodo', title: 'Método', width: 170 },
            { key: 'hoje', title: 'Hoje', width: 170 },
            { key: 'semana', title: 'Semana', width: 170 },
            { key: 'mes', title: 'Mês', width: 170 },
          ]}
          rows={paymentRows}
          rowKey={(row) => row.metodo}
        />
      </View>
    </View>
  );
};

/**
 * Componente: Container principal de estatísticas
 */
export const EstatisticasGarcomContainer = ({ estatisticas, nomeGarcom, loading = false }) => {
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Carregando estatísticas...</Text>
      </View>
    );
  }

  if (!estatisticas) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Nenhuma estatística disponível</Text>
      </View>
    );
  }

  const { vendas, pagamentos } = estatisticas;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
      <View style={styles.headerSection}>
        <Text style={styles.sectionTitle}>📊 Estatísticas por Garçom</Text>
      </View>

      <CardDadosGarcom
        nome={nomeGarcom}
      />

      <CardVendas vendas={vendas} />

      <CardPagamentos pagamentos={pagamentos} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 14,
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  headerSection: {
    backgroundColor: colors.primary,
    padding: 20,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 15,
    margin: 15,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cardContent: {
    padding: 18,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
  },
  statItem: {
    alignItems: 'center',
    marginVertical: 8,
    minWidth: '22%',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  periodoSection: {
    marginVertical: 5,
  },
  periodoHeader: {
    marginBottom: 12,
  },
  periodoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  periodoStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  periodoStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  periodoStatLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 6,
    textAlign: 'center',
  },
  periodoStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  metodoSection: {
    marginVertical: 8,
  },
  metodoHeader: {
    marginBottom: 12,
  },
  metodoTitulo: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  metodoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  metodoItem: {
    alignItems: 'center',
    flex: 1,
  },
  metodoLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  metodoValor: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.success,
    marginBottom: 2,
  },
  metodoQtd: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  totalItem: {
    marginVertical: 8,
  },
  totalLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  totalValor: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primary,
  },
  produtoDestaque: {
    backgroundColor: colors.warningSurface,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  produtoLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  produtoNome: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  produtoQtd: {
    fontSize: 13,
    color: colors.textSecondary,
  },
});
