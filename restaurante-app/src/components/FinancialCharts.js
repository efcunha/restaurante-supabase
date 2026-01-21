import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { BarChart, PieChart } from 'react-native-chart-kit';
import { colors } from '../theme/colors';

const screenWidth = Dimensions.get('window').width;

const chartConfig = {
  backgroundGradientFrom: "#ffffff",
  backgroundGradientTo: "#ffffff",
  color: (opacity = 1) => `rgba(139, 47, 47, ${opacity})`, // colors.primary
  strokeWidth: 2,
  barPercentage: 0.7,
  useShadowColorFromDataset: false,
  decimalPlaces: 0,
};

export const SalesByDayChart = ({ data }) => {
  // data format: { labels: ['Seg', 'Ter', ...], datasets: [{ data: [100, 200, ...] }] }
  
  if (!data || !data.datasets || data.datasets[0].data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Sem dados de vendas no período</Text>
      </View>
    );
  }

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>Vendas por Dia (R$)</Text>
      <BarChart
        data={data}
        width={screenWidth - 40}
        height={220}
        yAxisLabel="R$ "
        chartConfig={chartConfig}
        verticalLabelRotation={0}
        showValuesOnTopOfBars={true}
        fromZero={true}
        style={styles.chart}
      />
    </View>
  );
};

export const SalesByPaymentChart = ({ data }) => {
  // data format: array of objects for PieChart
  // e.g. [{ name: 'Pix', population: 200, color: '...', legendFontColor: '...', legendFontSize: 15 }]

  if (!data || data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Sem dados de pagamento</Text>
      </View>
    );
  }

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>Meios de Pagamento</Text>
      <PieChart
        data={data}
        width={screenWidth - 40}
        height={220}
        chartConfig={chartConfig}
        accessor={"population"}
        backgroundColor={"transparent"}
        paddingLeft={"15"}
        center={[10, 0]}
        absolute
      />
    </View>
  );
};

const styles = StyleSheet.create({
  chartContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    marginBottom: 20,
  },
  emptyText: {
    color: '#999',
    fontStyle: 'italic',
  }
});
