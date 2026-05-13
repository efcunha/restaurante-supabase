import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../../theme/colors';
import { Button } from '../../../ui';
import { NewOrderCartFooterProps } from '../types';

export const NewOrderCartFooter = memo(function NewOrderCartFooter({
  total,
  onSubmit,
  isSubmitting,
  onHeightChange,
}: NewOrderCartFooterProps) {
  return (
    <View
      style={styles.stickyFooter}
      onLayout={(event) => onHeightChange?.(event.nativeEvent.layout.height)}
    >
      <View style={styles.totalContainer}>
        <Text style={styles.totalLabel}>Total:</Text>
        <Text style={styles.totalValue}>R$ {total.toFixed(2)}</Text>
      </View>

      <Button
        label="Criar Pedido"
        onPress={onSubmit}
        loading={isSubmitting}
        disabled={isSubmitting}
        fullWidth
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