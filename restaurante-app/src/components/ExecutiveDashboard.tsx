/**
 * ExecutiveDashboard - Executive view of modernization success metrics
 * Shows baseline vs current metrics, weekly reports, and progress
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SuccessMetricsService, {
  BaselineMetrics,
  CurrentMetrics,
  WeeklyReport,
} from '../services/SuccessMetricsService';

interface ExecutiveDashboardProps {
  companyId: string;
}

export default function ExecutiveDashboard({ companyId }: ExecutiveDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>(null);

  useEffect(() => {
    loadDashboard();
  }, [companyId]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const data = await SuccessMetricsService.getExecutiveDashboard(companyId);
      setDashboardData(data);
    } catch (error) {
      console.error('[ExecutiveDashboard] Failed to load:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  };

  const handleGenerateReport = async () => {
    try {
      await SuccessMetricsService.generateWeeklyReport(companyId);
      await loadDashboard();
    } catch (error) {
      console.error('[ExecutiveDashboard] Failed to generate report:', error);
    }
  };

  const handleExport = async () => {
    try {
      const exportData = await SuccessMetricsService.exportMetrics(companyId);
      console.log('Exported Metrics:', exportData);
      // In production, could save to file or send to email
    } catch (error) {
      console.error('[ExecutiveDashboard] Failed to export:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B2F2F" />
        <Text style={styles.loadingText}>Carregando métricas...</Text>
      </View>
    );
  }

  if (!dashboardData) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="analytics-outline" size={64} color="#CCC" />
        <Text style={styles.emptyText}>Nenhuma métrica disponível</Text>
        <TouchableOpacity
          style={styles.recordButton}
          onPress={() => SuccessMetricsService.recordBaseline(companyId)}
        >
          <Text style={styles.recordButtonText}>Registrar Baseline</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { baseline, current, recentReports, summary } = dashboardData;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on-track':
        return '#2E7D32';
      case 'at-risk':
        return '#F57C00';
      case 'off-track':
        return '#D32F2F';
      default:
        return '#999';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'on-track':
        return 'checkmark-circle';
      case 'at-risk':
        return 'warning';
      case 'off-track':
        return 'close-circle';
      default:
        return 'help-circle';
    }
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📊 Dashboard Executivo</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleGenerateReport}
          >
            <Ionicons name="document-text-outline" size={20} color="#8B2F2F" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={handleExport}>
            <Ionicons name="download-outline" size={20} color="#8B2F2F" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Overall Progress Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Progresso Geral</Text>
        <View style={styles.progressContainer}>
          <View style={styles.progressCircle}>
            <Text style={styles.progressPercentage}>
              {Math.round(summary.overallProgress)}%
            </Text>
            <Text style={styles.progressLabel}>Completo</Text>
          </View>
          <View style={styles.progressDetails}>
            <View style={styles.progressRow}>
              <Ionicons
                name={getStatusIcon(summary.status)}
                size={24}
                color={getStatusColor(summary.status)}
              />
              <Text
                style={[
                  styles.statusText,
                  { color: getStatusColor(summary.status) },
                ]}
              >
                {summary.status === 'on-track' && 'No Caminho Certo'}
                {summary.status === 'at-risk' && 'Em Risco'}
                {summary.status === 'off-track' && 'Fora do Caminho'}
              </Text>
            </View>
            <Text style={styles.targetsText}>
              {summary.targetsMet} de {summary.targetsTotal} metas atingidas
            </Text>
          </View>
        </View>
      </View>

      {/* Metrics Comparison */}
      {baseline && current && (
        <>
          {/* Latency Metrics */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>⚡ Latência P95</Text>
            <View style={styles.comparisonRow}>
              <View style={styles.comparisonColumn}>
                <Text style={styles.comparisonLabel}>Baseline</Text>
                <Text style={styles.comparisonValue}>
                  {Math.round(
                    (baseline.p95Latency.fetchOrders +
                      baseline.p95Latency.createOrder +
                      baseline.p95Latency.updateOrder) /
                      3
                  )}
                  ms
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={24} color="#999" />
              <View style={styles.comparisonColumn}>
                <Text style={styles.comparisonLabel}>Atual</Text>
                <Text style={[styles.comparisonValue, { color: '#2E7D32' }]}>
                  {Math.round(
                    (current.p95Latency.fetchOrders +
                      current.p95Latency.createOrder +
                      current.p95Latency.updateOrder) /
                      3
                  )}
                  ms
                </Text>
              </View>
              <View style={styles.improvementBadge}>
                <Text style={styles.improvementText}>
                  {current.improvements.p95LatencyReduction > 0 ? '-' : '+'}
                  {Math.abs(current.improvements.p95LatencyReduction).toFixed(1)}%
                </Text>
              </View>
            </View>
          </View>

          {/* Cost Metrics */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>💰 Custos Firestore</Text>
            <View style={styles.comparisonRow}>
              <View style={styles.comparisonColumn}>
                <Text style={styles.comparisonLabel}>Baseline</Text>
                <Text style={styles.comparisonValue}>
                  ${baseline.firestoreCosts.estimatedMonthlyCost.toFixed(2)}
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={24} color="#999" />
              <View style={styles.comparisonColumn}>
                <Text style={styles.comparisonLabel}>Atual</Text>
                <Text style={[styles.comparisonValue, { color: '#2E7D32' }]}>
                  ${current.firestoreCosts.estimatedMonthlyCost.toFixed(2)}
                </Text>
              </View>
              <View style={styles.improvementBadge}>
                <Text style={styles.improvementText}>
                  {current.improvements.costReduction > 0 ? '-' : '+'}
                  {Math.abs(current.improvements.costReduction).toFixed(1)}%
                </Text>
              </View>
            </View>
            <View style={styles.costBreakdown}>
              <Text style={styles.costBreakdownTitle}>Operações Mensais:</Text>
              <Text style={styles.costBreakdownItem}>
                Reads: {current.firestoreCosts.reads.toLocaleString()}
              </Text>
              <Text style={styles.costBreakdownItem}>
                Writes: {current.firestoreCosts.writes.toLocaleString()}
              </Text>
              <Text style={styles.costBreakdownItem}>
                Deletes: {current.firestoreCosts.deletes.toLocaleString()}
              </Text>
            </View>
          </View>

          {/* Security Metrics */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🔒 Segurança</Text>
            <View style={styles.securityGrid}>
              <View style={styles.securityItem}>
                <Text style={styles.securityValue}>
                  {current.securityIncidents.authFailures}
                </Text>
                <Text style={styles.securityLabel}>Falhas de Auth</Text>
              </View>
              <View style={styles.securityItem}>
                <Text style={styles.securityValue}>
                  {current.securityIncidents.permissionDenied}
                </Text>
                <Text style={styles.securityLabel}>Permissão Negada</Text>
              </View>
              <View style={styles.securityItem}>
                <Text style={styles.securityValue}>
                  {current.securityIncidents.rateLimitViolations}
                </Text>
                <Text style={styles.securityLabel}>Rate Limit</Text>
              </View>
              <View style={styles.securityItem}>
                <Text style={styles.securityValue}>
                  {current.securityIncidents.suspiciousActivity}
                </Text>
                <Text style={styles.securityLabel}>Atividade Suspeita</Text>
              </View>
            </View>
          </View>

          {/* Code Quality Metrics */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📘 Qualidade de Código</Text>
            <View style={styles.qualityGrid}>
              <View style={styles.qualityItem}>
                <Text style={styles.qualityValue}>
                  {current.codeQuality.testCoverage}%
                </Text>
                <Text style={styles.qualityLabel}>Cobertura de Testes</Text>
              </View>
              <View style={styles.qualityItem}>
                <Text style={styles.qualityValue}>
                  {current.codeQuality.typeScriptAdoption}%
                </Text>
                <Text style={styles.qualityLabel}>Adoção TypeScript</Text>
              </View>
              <View style={styles.qualityItem}>
                <Text style={styles.qualityValue}>
                  {current.codeQuality.lintErrors}
                </Text>
                <Text style={styles.qualityLabel}>Erros de Lint</Text>
              </View>
              <View style={styles.qualityItem}>
                <Text style={styles.qualityValue}>
                  {current.codeQuality.codeSmells}
                </Text>
                <Text style={styles.qualityLabel}>Code Smells</Text>
              </View>
            </View>
          </View>
        </>
      )}

      {/* Recent Reports */}
      {recentReports && recentReports.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📅 Relatórios Recentes</Text>
          {recentReports.map((report: WeeklyReport, index: number) => (
            <View key={index} style={styles.reportItem}>
              <View style={styles.reportHeader}>
                <Text style={styles.reportTitle}>
                  Semana {report.weekNumber} - {report.year}
                </Text>
                <Text style={styles.reportDate}>
                  {report.startDate} a {report.endDate}
                </Text>
              </View>

              {report.highlights.length > 0 && (
                <View style={styles.reportSection}>
                  <Text style={styles.reportSectionTitle}>Destaques:</Text>
                  {report.highlights.map((highlight, i) => (
                    <Text key={i} style={styles.reportHighlight}>
                      {highlight}
                    </Text>
                  ))}
                </View>
              )}

              {report.concerns.length > 0 && (
                <View style={styles.reportSection}>
                  <Text style={styles.reportSectionTitle}>Preocupações:</Text>
                  {report.concerns.map((concern, i) => (
                    <Text key={i} style={styles.reportConcern}>
                      {concern}
                    </Text>
                  ))}
                </View>
              )}

              {report.recommendations.length > 0 && (
                <View style={styles.reportSection}>
                  <Text style={styles.reportSectionTitle}>Recomendações:</Text>
                  {report.recommendations.map((rec, i) => (
                    <Text key={i} style={styles.reportRecommendation}>
                      {rec}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F1E8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F1E8',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F1E8',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    marginTop: 20,
    marginBottom: 30,
  },
  recordButton: {
    backgroundColor: '#8B2F2F',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
  },
  recordButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#8B2F2F',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
  },
  headerButtons: {
    flexDirection: 'row',
  },
  headerButton: {
    marginLeft: 15,
    padding: 5,
    backgroundColor: '#FFF',
    borderRadius: 5,
  },
  card: {
    backgroundColor: '#FFF',
    margin: 15,
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 15,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F5F1E8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  progressPercentage: {
    fontSize: 28,
    fontWeight: '700',
    color: '#8B2F2F',
  },
  progressLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  progressDetails: {
    flex: 1,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 10,
  },
  targetsText: {
    fontSize: 14,
    color: '#666',
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  comparisonColumn: {
    alignItems: 'center',
  },
  comparisonLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 5,
  },
  comparisonValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },
  improvementBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  improvementText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
  },
  costBreakdown: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#E0D8C8',
  },
  costBreakdownTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  costBreakdownItem: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  securityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  securityItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 15,
  },
  securityValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#2E7D32',
  },
  securityLabel: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 5,
  },
  qualityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  qualityItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 15,
  },
  qualityValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#2196F3',
  },
  qualityLabel: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 5,
  },
  reportItem: {
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0D8C8',
  },
  reportHeader: {
    marginBottom: 10,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  reportDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  reportSection: {
    marginTop: 10,
  },
  reportSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  reportHighlight: {
    fontSize: 13,
    color: '#2E7D32',
    marginBottom: 3,
  },
  reportConcern: {
    fontSize: 13,
    color: '#F57C00',
    marginBottom: 3,
  },
  reportRecommendation: {
    fontSize: 13,
    color: '#2196F3',
    marginBottom: 3,
  },
});
