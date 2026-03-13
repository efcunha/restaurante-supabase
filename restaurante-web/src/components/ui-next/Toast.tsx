import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colorSystem, radius, shadows, spacing, typography } from '../../design-system';

type ToastVariant = 'success' | 'error' | 'info' | 'warning';

type ToastProps = {
  message: string;
  variant?: ToastVariant;
};

export function Toast({ message, variant = 'info' }: ToastProps) {
  return (
    <View style={[styles.base, variant === 'success' && styles.success, variant === 'error' && styles.error, variant === 'warning' && styles.warning, variant === 'info' && styles.info]}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.medium,
    paddingHorizontal: spacing.s12,
    paddingVertical: spacing.s12,
    ...shadows.medium,
  },
  success: { backgroundColor: colorSystem.success },
  error: { backgroundColor: colorSystem.error },
  warning: { backgroundColor: colorSystem.warningText },
  info: { backgroundColor: colorSystem.primary },
  text: {
    ...typography.small,
    color: colorSystem.surface,
    fontWeight: '700',
  },
});
