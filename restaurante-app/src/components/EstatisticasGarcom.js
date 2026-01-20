import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';

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

/**
 * Componente: Card de Vendas (Hoje/Semana/Mês)
 */
export const CardVendas = ({ vendas }) => {
  // Garantir que vendas tem estrutura correta
  const hoje = vendas?.hoje || EMPTY_STATS;
  const semana = vendas?.semana || EMPTY_STATS;
  const mes = vendas?.mes || EMPTY_STATS;

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>💰 Vendas por Período</Text>
      <View style={styles.cardContent}>
        {/* Hoje */}
        <View style={styles.periodoSection}>
          <View style={styles.periodoHeader}>
            <Text style={styles.periodoTitle}>🔹 Hoje</Text>
          </View>
          <View style={styles.periodoStats}>
            <View style={styles.periodoStatItem}>
              <Text style={styles.periodoStatLabel}>Total Vendido</Text>
              <Text style={styles.periodoStatValue}>R$ {safeNumber(hoje.totalVendido).toFixed(2)}</Text>
            </View>
            <View style={styles.periodoStatItem}>
              <Text style={styles.periodoStatLabel}>Comandas</Text>
              <Text style={styles.periodoStatValue}>{safeNumber(hoje.quantidadeComandas)}</Text>
            </View>
            <View style={styles.periodoStatItem}>
              <Text style={styles.periodoStatLabel}>Ticket Médio</Text>
              <Text style={styles.periodoStatValue}>R$ {safeNumber(hoje.ticketMedio).toFixed(2)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Semana */}
        <View style={styles.periodoSection}>
          <View style={styles.periodoHeader}>
            <Text style={styles.periodoTitle}>🔹 Semana</Text>
          </View>
          <View style={styles.periodoStats}>
            <View style={styles.periodoStatItem}>
              <Text style={styles.periodoStatLabel}>Total Vendido</Text>
              <Text style={styles.periodoStatValue}>R$ {safeNumber(semana.totalVendido).toFixed(2)}</Text>
            </View>
            <View style={styles.periodoStatItem}>
              <Text style={styles.periodoStatLabel}>Comandas</Text>
              <Text style={styles.periodoStatValue}>{safeNumber(semana.quantidadeComandas)}</Text>
            </View>
            <View style={styles.periodoStatItem}>
              <Text style={styles.periodoStatLabel}>Ticket Médio</Text>
              <Text style={styles.periodoStatValue}>R$ {safeNumber(semana.ticketMedio).toFixed(2)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Mês */}
        <View style={styles.periodoSection}>
          <View style={styles.periodoHeader}>
            <Text style={styles.periodoTitle}>🔹 Mês</Text>
          </View>
          <View style={styles.periodoStats}>
            <View style={styles.periodoStatItem}>
              <Text style={styles.periodoStatLabel}>Total Vendido</Text>
              <Text style={styles.periodoStatValue}>R$ {safeNumber(mes.totalVendido).toFixed(2)}</Text>
            </View>
            <View style={styles.periodoStatItem}>
              <Text style={styles.periodoStatLabel}>Comandas</Text>
              <Text style={styles.periodoStatValue}>{safeNumber(mes.quantidadeComandas)}</Text>
            </View>
            <View style={styles.periodoStatItem}>
              <Text style={styles.periodoStatLabel}>Ticket Médio</Text>
              <Text style={styles.periodoStatValue}>R$ {safeNumber(mes.ticketMedio).toFixed(2)}</Text>
            </View>
          </View>
        </View>
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

  const renderMetodo = (icone, titulo, data) => (
    <View style={styles.metodoSection}>
      <View style={styles.metodoHeader}>
        <Text style={styles.metodoTitulo}>{icone} {titulo}</Text>
      </View>
      <View style={styles.metodoGrid}>
        <View style={styles.metodoItem}>
          <Text style={styles.metodoLabel}>Hoje</Text>
          <Text style={styles.metodoValor}>R$ {safeNumber(data.hoje?.total).toFixed(2)}</Text>
          <Text style={styles.metodoQtd}>{safeNumber(data.hoje?.quantidade)}x</Text>
        </View>
        <View style={styles.metodoItem}>
          <Text style={styles.metodoLabel}>Semana</Text>
          <Text style={styles.metodoValor}>R$ {safeNumber(data.semana?.total).toFixed(2)}</Text>
          <Text style={styles.metodoQtd}>{safeNumber(data.semana?.quantidade)}x</Text>
        </View>
        <View style={styles.metodoItem}>
          <Text style={styles.metodoLabel}>Mês</Text>
          <Text style={styles.metodoValor}>R$ {safeNumber(data.mes?.total).toFixed(2)}</Text>
          <Text style={styles.metodoQtd}>{safeNumber(data.mes?.quantidade)}x</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>💳 Pagamentos Recebidos</Text>
      <View style={styles.cardContent}>
        {renderMetodo('💵', 'Dinheiro', {
          hoje: hoje.dinheiro || { total: 0, quantidade: 0 },
          semana: semana.dinheiro || { total: 0, quantidade: 0 },
          mes: mes.dinheiro || { total: 0, quantidade: 0 },
        })}
        
        <View style={styles.divider} />
        
        {renderMetodo('📱', 'Pix', {
          hoje: hoje.pix || { total: 0, quantidade: 0 },
          semana: semana.pix || { total: 0, quantidade: 0 },
          mes: mes.pix || { total: 0, quantidade: 0 },
        })}
        
        <View style={styles.divider} />
        
        {renderMetodo('💳', 'Cartão Débito', {
          hoje: hoje.debito || { total: 0, quantidade: 0 },
          semana: semana.debito || { total: 0, quantidade: 0 },
          mes: mes.debito || { total: 0, quantidade: 0 },
        })}
        
        <View style={styles.divider} />
        
        {renderMetodo('💳', 'Cartão Crédito', {
          hoje: hoje.credito || { total: 0, quantidade: 0 },
          semana: semana.credito || { total: 0, quantidade: 0 },
          mes: mes.credito || { total: 0, quantidade: 0 },
        })}
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
        <ActivityIndicator size="large" color="#8B2F2F" />
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

  const { vendas, pagamentos, comandas } = estatisticas;

  return (
    <ScrollView style={styles.container}>
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
    color: '#999',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  headerSection: {
    backgroundColor: '#8B2F2F',
    padding: 20,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    margin: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#8B2F2F',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#E0D8C8',
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
    color: '#666',
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0D8C8',
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
    color: '#8B2F2F',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#999',
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
    color: '#8B2F2F',
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
    color: '#999',
    marginBottom: 6,
    textAlign: 'center',
  },
  periodoStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
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
    color: '#333',
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
    color: '#999',
    marginBottom: 6,
  },
  metodoValor: {
    fontSize: 15,
    fontWeight: '700',
    color: '#7ED321',
    marginBottom: 2,
  },
  metodoQtd: {
    fontSize: 10,
    color: '#999',
  },
  totalItem: {
    marginVertical: 8,
  },
  totalLabel: {
    fontSize: 13,
    color: '#999',
    marginBottom: 6,
  },
  totalValor: {
    fontSize: 22,
    fontWeight: '700',
    color: '#8B2F2F',
  },
  produtoDestaque: {
    backgroundColor: '#FFF9E6',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  produtoLabel: {
    fontSize: 13,
    color: '#999',
    marginBottom: 8,
  },
  produtoNome: {
    fontSize: 18,
    fontWeight: '700',
    color: '#8B2F2F',
    marginBottom: 4,
  },
  produtoQtd: {
    fontSize: 13,
    color: '#666',
  },
});
