/**
 * PerformanceDashboardScreen
 * 
 * Screen wrapper for the Performance Dashboard component
 * Provides navigation integration and screen-level configuration
 * 
 * Requirements: 11.7
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import PerformanceDashboard from '../components/PerformanceDashboard';

export default function PerformanceDashboardScreen() {
  return (
    <View style={styles.container}>
      <PerformanceDashboard />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
