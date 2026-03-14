/**
 * PerformanceDashboard - Real-time performance metrics display
 * Shows query performance, cache hit rates, pool utilization, and real-time subscription metrics
 * 
 * Requirements: 11.7
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { performanceMonitorService } from '../services/optimization/PerformanceMonitorService';
import { usePerformanceDashboard, useResourceMetrics } from '../hooks/usePerformanceDashboard';

export default function PerformanceDashboard() {
  const { dashboardData, loading, refresh } = usePerformanceDashboard(10000);
  const [refreshing, setRefreshing] = useState(false);
  
  // Collect database resource metrics every 30 seconds
  useResourceMetrics(30000);

  const handleRefresh = () => {
    setRefreshing(true);
    refresh();
    setTimeout(() => setRefreshing(false), 500);
  };

  const handleExport = () => {
    try {
      const summary = performanceMonitorService.getMetricsSummary();
      console.log('[PerformanceDashboard] Metrics exported:', JSON.stringify(summary, null, 2));
      // In production, could save to file or send to server
    } catch (error) {
      console.error('[PerformanceDashboard] Error exporting metrics:', error);
    }
  };

  const handleClear = () => {
    try {
      performanceMonitorService.clear();
      refresh();
    } catch (error) {
      console.error('[PerformanceDashboard] Error clearing metrics:', error);
    }
  };

  if (loading || !dashboardData) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Carregando métricas...</Text>
      </View>
    );
  }

  const { summary, queryMetrics, cacheMetrics, connectionMetrics, realtimeMetrics } = dashboardData;

  const getLatencyColor = (latency: number) => {
    if (latency < 100) return colors.success; // Green - excellent
    if (latency < 200) return colors.success; // Light green - good
    if (latency < 500) return colors.warning; // Orange - warning
    return colors.danger; // Red - critical
  };

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 95) return colors.success; // Green
    if (rate >= 80) return colors.warning; // Orange
    return colors.danger; // Red
  };

  const getUtilizationColor = (utilization: number) => {
    if (utilization < 60) return colors.success; // Green - healthy
    if (utilization < 80) return colors.warning; // Orange - warning
    return colors.danger; // Red - critical
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
            <Ionicons name="download-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={handleClear}>
            <Ionicons name="trash-outline" size={20} color={colors.primary} />
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
            <Text style={styles.summaryLabel}>Queries Lentas</Text>
            <Text
              style={[
                styles.summaryValue,
                { color: summary.slowQueries > 10 ? colors.danger : colors.success },
              ]}
            >
              {summary.slowQueries}
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
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>P99 Latência</Text>
            <Text
              style={[
                styles.summaryValue,
                { color: getLatencyColor(summary.p99Latency) },
              ]}
            >
              {Math.round(summary.p99Latency)}ms
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Cache Hit Rate</Text>
            <Text
              style={[
                styles.summaryValue,
                { color: getSuccessRateColor(summary.cacheHitRate) },
              ]}
            >
              {summary.cacheHitRate.toFixed(1)}%
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Pool Utilization</Text>
            <Text
              style={[
                styles.summaryValue,
                { color: getUtilizationColor(summary.connectionPoolUtilization) },
              ]}
            >
              {summary.connectionPoolUtilization.toFixed(1)}%
            </Text>
          </View>
        </View>
      </View>

      {/* Query Performance Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Query Performance (Últimas 10)</Text>
        {queryMetrics.length === 0 ? (
          <Text style={styles.emptyText}>Nenhuma query registrada</Text>
        ) : (
          queryMetrics.slice(-10).reverse().map((metric, index) => (
            <View key={index} style={styles.queryItem}>
              <View style={styles.queryHeader}>
                <Text style={styles.queryName} numberOfLines={1}>
                  {metric.query}
                </Text>
                <Text
                  style={[
                    styles.queryTime,
                    { color: getLatencyColor(metric.executionTime) },
                  ]}
                >
                  {Math.round(metric.executionTime)}ms
                </Text>
              </View>
              <View style={styles.queryDetails}>
                <Text style={styles.queryDetail}>
                  Scanned: {metric.rowsScanned} | Returned: {metric.rowsReturned}
                </Text>
                <Text style={styles.queryTimestamp}>
                  {new Date(metric.timestamp).toLocaleTimeString()}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Cache Metrics Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Cache Performance</Text>
        {cacheMetrics.length === 0 ? (
          <Text style={styles.emptyText}>Nenhuma operação de cache registrada</Text>
        ) : (
          cacheMetrics.map((metric, index) => (
            <View key={index} style={styles.cacheItem}>
              <View style={styles.cacheHeader}>
                <Text style={styles.cacheName} numberOfLines={1}>
                  {metric.key}
                </Text>
                <Text
                  style={[
                    styles.cacheHitRate,
                    { color: getSuccessRateColor(metric.hitRate) },
                  ]}
                >
                  {metric.hitRate.toFixed(1)}%
                </Text>
              </View>
              <View style={styles.cacheStats}>
                <View style={styles.cacheStat}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                  <Text style={styles.cacheStatText}>Hits: {metric.hits}</Text>
                </View>
                <View style={styles.cacheStat}>
                  <Ionicons name="close-circle" size={16} color={colors.danger} />
                  <Text style={styles.cacheStatText}>Misses: {metric.misses}</Text>
                </View>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Connection Pool Metrics Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Connection Pool (Últimas 10)</Text>
        {connectionMetrics.length === 0 ? (
          <Text style={styles.emptyText}>Nenhuma métrica de conexão registrada</Text>
        ) : (
          connectionMetrics.slice(-10).reverse().map((metric, index) => (
            <View key={index} style={styles.connectionItem}>
              <View style={styles.connectionHeader}>
                <Text style={styles.connectionTime}>
                  {new Date(metric.timestamp).toLocaleTimeString()}
                </Text>
                <Text
                  style={[
                    styles.connectionUtilization,
                    { color: getUtilizationColor(metric.utilization) },
                  ]}
                >
                  {metric.utilization.toFixed(1)}%
                </Text>
              </View>
              <View style={styles.connectionStats}>
                <View style={styles.connectionStat}>
                  <View style={[styles.connectionDot, { backgroundColor: colors.success }]} />
                  <Text style={styles.connectionStatText}>Active: {metric.active}</Text>
                </View>
                <View style={styles.connectionStat}>
                  <View style={[styles.connectionDot, { backgroundColor: colors.warning }]} />
                  <Text style={styles.connectionStatText}>Idle: {metric.idle}</Text>
                </View>
                <View style={styles.connectionStat}>
                  <View style={[styles.connectionDot, { backgroundColor: colors.danger }]} />
                  <Text style={styles.connectionStatText}>Waiting: {metric.waiting}</Text>
                </View>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Real-Time Subscription Metrics Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Real-Time Subscriptions (Últimas 10)</Text>
        {realtimeMetrics.length === 0 ? (
          <Text style={styles.emptyText}>Nenhuma métrica de real-time registrada</Text>
        ) : (
          realtimeMetrics.slice(-10).reverse().map((metric, index) => (
            <View key={index} style={styles.realtimeItem}>
              <View style={styles.realtimeHeader}>
                <Text style={styles.realtimeName} numberOfLines={1}>
                  {metric.channel}
                </Text>
                <Text
                  style={[
                    styles.realtimeLatency,
                    { color: getLatencyColor(metric.latency) },
                  ]}
                >
                  {Math.round(metric.latency)}ms
                </Text>
              </View>
              <View style={styles.realtimeDetails}>
                <Text style={styles.realtimeDetail}>
                  Messages: {metric.messagesReceived}
                </Text>
                <Text style={styles.realtimeTimestamp}>
                  {new Date(metric.timestamp).toLocaleTimeString()}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>Legenda de Cores:</Text>
        <View style={styles.legendItems}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: colors.success }]} />
            <Text style={styles.legendText}>Excelente (&lt;100ms / &gt;95%)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: colors.success }]} />
            <Text style={styles.legendText}>Bom (100-200ms)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: colors.warning }]} />
            <Text style={styles.legendText}>Atenção (200-500ms / 80-95%)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: colors.danger }]} />
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
    backgroundColor: colors.background,
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.primary,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
  },
  headerButtons: {
    flexDirection: 'row',
  },
  headerButton: {
    marginLeft: 15,
    padding: 5,
    backgroundColor: colors.white,
    borderRadius: 5,
  },
  card: {
    backgroundColor: colors.white,
    margin: 15,
    padding: 20,
    borderRadius: 10,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
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
    color: colors.textSecondary,
    marginBottom: 5,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  queryItem: {
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  queryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  queryName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    marginRight: 10,
  },
  queryTime: {
    fontSize: 16,
    fontWeight: '700',
  },
  queryDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  queryDetail: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  queryTimestamp: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  cacheItem: {
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cacheHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cacheName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    marginRight: 10,
  },
  cacheHitRate: {
    fontSize: 16,
    fontWeight: '700',
  },
  cacheStats: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 20,
  },
  cacheStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  cacheStatText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  connectionItem: {
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  connectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  connectionTime: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  connectionUtilization: {
    fontSize: 18,
    fontWeight: '700',
  },
  connectionStats: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 15,
  },
  connectionStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  connectionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  connectionStatText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  realtimeItem: {
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  realtimeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  realtimeName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    marginRight: 10,
  },
  realtimeLatency: {
    fontSize: 16,
    fontWeight: '700',
  },
  realtimeDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  realtimeDetail: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  realtimeTimestamp: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 14,
    paddingVertical: 20,
  },
  legend: {
    margin: 15,
    padding: 15,
    backgroundColor: colors.white,
    borderRadius: 10,
    marginBottom: 30,
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
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
    color: colors.textSecondary,
  },
});
