import React from 'react';
import { View, Text, StyleSheet, Dimensions, Platform } from 'react-native';
import { colors } from '../theme/colors';
// Conditional import to prevent Web bundling errors if module is native-only
let BarChart, PieChart;
try {
  if (Platform.OS !== 'web') {
    const Charts = require('react-native-chart-kit');
    BarChart = Charts.BarChart;
    PieChart = Charts.PieChart;
  }
} catch (e) {
  console.warn('Charts module not available:', e);
}



const chartConfig = {
  backgroundGradientFrom: colors.white,
  backgroundGradientTo: colors.white,
  color: (opacity = 1) => `rgba(139, 47, 47, ${opacity})`,
  strokeWidth: 2,
  barPercentage: 0.6,
  useShadowColorFromDataset: false,
  decimalPlaces: 0,
  propsForLabels: {
    fontSize: 10,
  },
};

export const SalesByDayChart = ({ data }) => {
  if (Platform.OS === 'web' || !BarChart) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Gráficos disponíveis apenas no App (Mobile)</Text>
      </View>
    );
  }

  // data format: { labels: ['Seg', 'Ter', ...], datasets: [{ data: [100, 200, ...] }] }

  if (!data || !data.datasets || data.datasets[0].data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Sem dados de vendas no período</Text>
      </View>
    );
  }

  const screenWidth = Dimensions.get('window').width;

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>Vendas por Dia (R$)</Text>
      <BarChart
        data={data}
        width={screenWidth - 60}
        height={220}
        yAxisLabel="R$ "
        chartConfig={chartConfig}
        verticalLabelRotation={30}
        showValuesOnTopOfBars={true}
        fromZero={true}
        style={{
          ...styles.chart,
          paddingRight: 30, // Hack para evitar corte do último label
        }}
      />
    </View>
  );
};

export const SalesByPaymentChart = ({ data }) => {
  if (Platform.OS === 'web' || !PieChart) {
    return null;
  }

  // data format: array of objects for PieChart
  // e.g. [{ name: 'Pix', population: 200, color: '...', legendFontColor: '...', legendFontSize: 15 }]

  if (!data || data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Sem dados de pagamento</Text>
      </View>
    );
  }

  const screenWidth = Dimensions.get('window').width;

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>Meios de Pagamento</Text>
      <PieChart
        data={data}
        width={screenWidth - 80}
        height={220}
        chartConfig={chartConfig}
        accessor={"population"}
        backgroundColor={"transparent"}
        paddingLeft={"15"}
        center={[0, 0]}
        absolute
      />
    </View>
  );
};

const styles = StyleSheet.create({
  chartContainer: {
    backgroundColor: colors.white,
    borderRadius: 15,
    padding: 16,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 5,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 10,
    textAlign: 'center',
  },
  chart: {
    borderRadius: 16,
    marginVertical: 8,
  },
  emptyContainer: {
    backgroundColor: colors.white,
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    elevation: 5,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
  },
  emptyText: {
    color: colors.textSecondary,
    fontStyle: 'italic',
  }
});
