/**
 * PerformanceDashboard - Real-time performance metrics display
 * Shows latency, success rates, and Firestore operations
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PerformanceMonitoringService from '../services/PerformanceMonitoringService';

export default function PerformanceDashboard() {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboardData = () => {
    const data = PerformanceMonitoringService.getDashboardData();
    setDashboardData(data);
  };

  useEffect(() => {
    loadDashboardData();

    // Auto-refresh every 10 seconds
    const intervalId = setInterval(loadDashboardData, 10000);

    return () => clearInterval(intervalId);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
    setTimeout(() => setRefreshing(false), 500);
  };

  const handleExport = () => {
    const exportData = PerformanceMonitoringService.exportMetrics();
    console.log('Exported Metrics:', exportData);
    // In production, could save to file or send to server
  };

  const handleClear = () => {
    PerformanceMonitoringService.clearMetrics();
    loadDashboardData();
  };

  if (!dashboardData) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Carregando métricas...</Text>
      </View>
    );
  }

  const { summary, criticalOperations, recentFailures } = dashboardData;

  const getLatencyColor = (latency: number) => {
    if (latency < 200) return '#2E7D32'; // Green
    if (latency < 500) return '#F57C00'; // Orange
    return '#D32F2F'; // Red
  };

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 95) return '#2E7D32'; // Green
    if (rate >= 80) return '#F57C00'; // Orange
    return '#D32F2F'; // Red
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📊 Performance Dashboard</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.headerButton} onPress={handleExport}>
            <Ionicons name="download-outline" size={20} color="#8B2F2F" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={handleClear}>
            <Ionicons name="trash-outline" size={20} color="#8B2F2F" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Summary Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Resumo Geral</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Operações</Text>
            <Text style={styles.summaryValue}>{summary.totalOperations}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Taxa de Sucesso</Text>
            <Text
              style={[
                styles.summaryValue,
                { color: getSuccessRateColor(summary.successRate) },
              ]}
            >
              {summary.successRate.toFixed(1)}%
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Latência Média</Text>
            <Text
              style={[
                styles.summaryValue,
                { color: getLatencyColor(summary.averageLatency) },
              ]}
            >
              {Math.round(summary.averageLatency)}ms
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>P95 Latência</Text>
            <Text
              style={[
                styles.summaryValue,
                { color: getLatencyColor(summary.p95Latency) },
              ]}
            >
              {Math.round(summary.p95Latency)}ms
            </Text>
          </View>
        </View>
      </View>

      {/* Firestore Metrics Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Operações Firestore</Text>
        <View style={styles.firestoreGrid}>
          <View style={styles.firestoreItem}>
            <Ionicons name="eye-outline" size={24} color="#2196F3" />
            <Text style={styles.firestoreLabel}>Reads</Text>
            <Text style={styles.firestoreValue}>{summary.firestoreReads}</Text>
          </View>
          <View style={styles.firestoreItem}>
            <Ionicons name="create-outline" size={24} color="#4CAF50" />
            <Text style={styles.firestoreLabel}>Writes</Text>
            <Text style={styles.firestoreValue}>{summary.firestoreWrites}</Text>
          </View>
          <View style={styles.firestoreItem}>
            <Ionicons name="trash-outline" size={24} color="#F44336" />
            <Text style={styles.firestoreLabel}>Deletes</Text>
            <Text style={styles.firestoreValue}>{summary.firestoreDeletes}</Text>
          </View>
        </View>
      </View>

      {/* Critical Operations Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Operações Críticas</Text>
        {criticalOperations.length === 0 ? (
          <Text style={styles.emptyText}>Nenhuma operação registrada</Text>
        ) : (
          criticalOperations.map((op: any, index: number) => (
            <View key={index} style={styles.operationItem}>
              <View style={styles.operationHeader}>
                <Text style={styles.operationName}>{op.name}</Text>
                <Text style={styles.operationCount}>{op.count}x</Text>
              </View>
              <View style={styles.operationMetrics}>
                <View style={styles.operationMetric}>
                  <Text style={styles.metricLabel}>Média</Text>
                  <Text
                    style={[
                      styles.metricValue,
                      { color: getLatencyColor(op.avgLatency) },
                    ]}
                  >
                    {Math.round(op.avgLatency)}ms
                  </Text>
                </View>
                <View style={styles.operationMetric}>
                  <Text style={styles.metricLabel}>P95</Text>
                  <Text
                    style={[
                      styles.metricValue,
                      { color: getLatencyColor(op.p95Latency) },
                    ]}
                  >
                    {Math.round(op.p95Latency)}ms
                  </Text>
                </View>
                <View style={styles.operationMetric}>
                  <Text style={styles.metricLabel}>Sucesso</Text>
                  <Text
                    style={[
                      styles.metricValue,
                      { color: getSuccessRateColor(op.successRate) },
                    ]}
                  >
                    {op.successRate.toFixed(0)}%
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Recent Failures Card */}
      {recentFailures.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Falhas Recentes</Text>
          {recentFailures.map((failure: any, index: number) => (
            <View key={index} style={styles.failureItem}>
              <View style={styles.failureHeader}>
                <Ionicons name="alert-circle" size={20} color="#D32F2F" />
                <Text style={styles.failureOperation}>{failure.operation}</Text>
              </View>
              <Text style={styles.failureError}>{failure.error}</Text>
              <Text style={styles.failureTime}>
                {new Date(failure.timestamp).toLocaleTimeString()}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Legend */}
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>Legenda de Cores:</Text>
        <View style={styles.legendItems}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#2E7D32' }]} />
            <Text style={styles.legendText}>Bom (&lt;200ms / &gt;95%)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#F57C00' }]} />
            <Text style={styles.legendText}>Atenção (200-500ms / 80-95%)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#D32F2F' }]} />
            <Text style={styles.legendText}>Crítico (&gt;500ms / &lt;80%)</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F1E8',
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#666',
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
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  summaryItem: {
    width: '48%',
    marginBottom: 15,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 5,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },
  firestoreGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  firestoreItem: {
    alignItems: 'center',
  },
  firestoreLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  firestoreValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginTop: 5,
  },
  operationItem: {
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0D8C8',
  },
  operationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  operationName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  operationCount: {
    fontSize: 12,
    color: '#999',
  },
  operationMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  operationMetric: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 3,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  failureItem: {
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#FFEBEE',
    borderRadius: 5,
    borderLeftWidth: 3,
    borderLeftColor: '#D32F2F',
  },
  failureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  failureOperation: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  failureError: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  failureTime: {
    fontSize: 11,
    color: '#999',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
    paddingVertical: 20,
  },
  legend: {
    margin: 15,
    padding: 15,
    backgroundColor: '#FFF',
    borderRadius: 10,
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  legendItems: {
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  legendColor: {
    width: 20,
    height: 20,
    borderRadius: 4,
    marginRight: 10,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
});
