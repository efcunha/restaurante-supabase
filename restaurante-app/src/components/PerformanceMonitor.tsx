/**
 * Performance Monitor Component
 * 
 * Displays real-time performance metrics for monitoring application performance.
 * Shows query performance, cache hit rates, and connection pool utilization.
 * 
 * Requirements: 11.7
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { usePerformanceMetrics, useCacheStats, useConnectionPoolStats } from '../hooks/usePerformanceMetrics';

/**
 * Performance Monitor Component
 */
export const PerformanceMonitor: React.FC = () => {
  const { metrics, loading: metricsLoading, refresh: refreshMetrics } = usePerformanceMetrics();
  const { stats: cacheStats, loading: cacheLoading } = useCacheStats();
  const { stats: poolStats, loading: poolLoading } = useConnectionPoolStats();

  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refreshMetrics();
    setRefreshing(false);
  }, [refreshMetrics]);

  if (metricsLoading && !metrics) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading performance metrics...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Query Performance</Text>
        {metrics && (
          <>
            <MetricRow label="Total Operations" value={metrics.totalOperations.toString()} />
            <MetricRow label="Average Latency" value={`${metrics.averageLatency.toFixed(2)}ms`} />
            <MetricRow label="P95 Latency" value={`${metrics.p95Latency.toFixed(2)}ms`} />
            <MetricRow label="P99 Latency" value={`${metrics.p99Latency.toFixed(2)}ms`} />
            <MetricRow label="Slow Queries" value={metrics.slowQueries.toString()} />
          </>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cache Performance</Text>
        {cacheStats && (
          <>
            <MetricRow label="Hit Rate" value={`${(cacheStats.hitRate * 100).toFixed(1)}%`} />
            <MetricRow label="Hits" value={cacheStats.hits.toString()} />
            <MetricRow label="Misses" value={cacheStats.misses.toString()} />
            <MetricRow label="Cache Size" value={`${(cacheStats.size / 1024 / 1024).toFixed(2)} MB`} />
            <MetricRow label="Entries" value={cacheStats.entries.toString()} />
          </>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Connection Pool</Text>
        {poolStats && (
          <>
            <MetricRow label="Active Connections" value={poolStats.active.toString()} />
            <MetricRow label="Idle Connections" value={poolStats.idle.toString()} />
            <MetricRow label="Waiting Requests" value={poolStats.waiting.toString()} />
            <MetricRow label="Total Connections" value={poolStats.total.toString()} />
            <MetricRow label="Utilization" value={`${poolStats.utilization.toFixed(1)}%`} />
          </>
        )}
      </View>
    </ScrollView>
  );
};

/**
 * Metric Row Component
 */
const MetricRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.metricRow}>
    <Text style={styles.metricLabel}>{label}</Text>
    <Text style={styles.metricValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
  section: {
    backgroundColor: '#fff',
    margin: 10,
    padding: 15,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  metricLabel: {
    fontSize: 14,
    color: '#666',
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
});

export default PerformanceMonitor;
