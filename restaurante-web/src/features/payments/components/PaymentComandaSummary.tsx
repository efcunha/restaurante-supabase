import React, { memo } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { colors } from '../../../theme/colors';
import { Button } from '../../../ui';
import { PaymentComandaSummaryProps } from '../types';

export const PaymentComandaSummary = memo(function PaymentComandaSummary({
  comanda,
  onChangeComanda,
  onSearch,
  saldo,
  formatCurrency,
  useUiNext = true,
}: PaymentComandaSummaryProps) {
  return (
    <View style={styles.comandaInfoCard}>
      <View style={styles.searchRow}>
        <View style={styles.comandaFieldRow}>
          <Text style={styles.label}>Nº Comanda:</Text>
          <TextInput
            style={styles.input}
            value={comanda}
            onChangeText={onChangeComanda}
            keyboardType="number-pad"
            placeholder="Nº"
          />
        </View>
        {useUiNext ? (
          <Button label="Buscar" onPress={onSearch} size="sm" style={styles.searchActionButton} />
        ) : (
          <TouchableOpacity style={styles.searchLegacyButton} onPress={onSearch}>
            <Text style={styles.searchLegacyButtonText}>Buscar</Text>
          </TouchableOpacity>
        )}
      </View>

      {saldo && (
        <View style={styles.saldoRow}>
          <View>
            <Text style={styles.saldoLabel}>Total</Text>
            <Text style={styles.saldoValue}>{formatCurrency(saldo.total)}</Text>
          </View>
          <View>
            <Text style={styles.saldoLabel}>Pago</Text>
            <Text style={[styles.saldoValue, styles.saldoPaid]}>{formatCurrency(saldo.pago)}</Text>
          </View>
          <View>
            <Text style={styles.saldoLabel}>Aberto</Text>
            <Text style={[styles.saldoValue, styles.saldoOpen]}>{formatCurrency(saldo.aberto)}</Text>
          </View>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  comandaInfoCard: {
    backgroundColor: colors.white,
    padding: 15,
    borderRadius: 10,
    elevation: 2,
    marginBottom: 20,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  comandaFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  input: {
    width: 60,
    marginLeft: 10,
    textAlign: 'center',
    backgroundColor: '#F7FAFD',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 8,
    fontSize: 16,
  },
  searchActionButton: {
    minWidth: 88,
  },
  searchLegacyButton: {
    minWidth: 88,
    minHeight: 40,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  searchLegacyButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  saldoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  saldoLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  saldoValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  saldoPaid: {
    color: colors.success,
  },
  saldoOpen: {
    color: colors.danger,
    fontWeight: 'bold',
  },
});