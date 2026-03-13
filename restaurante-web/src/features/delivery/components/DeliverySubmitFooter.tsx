import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../../theme/colors';
import { Button } from '../../../ui';
import { DeliverySubmitFooterProps } from '../types';

export const DeliverySubmitFooter = memo(function DeliverySubmitFooter({
  finalTotal,
  onSubmit,
  isSubmitting,
  disabled,
}: DeliverySubmitFooterProps) {
  return (
    <View style={styles.stickyFooter}>
      <View style={styles.totalContainer}>
        <Text style={styles.totalLabel}>Total Final:</Text>
        <Text style={styles.totalValue}>R$ {finalTotal.toFixed(2)}</Text>
      </View>
      <Button
        label="Confirmar Delivery"
        onPress={onSubmit}
        loading={isSubmitting}
        disabled={disabled}
        fullWidth
        variant="secondary"
      />
    </View>
  );
});

const styles = StyleSheet.create({
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: 20,
    elevation: 20,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  totalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },
});