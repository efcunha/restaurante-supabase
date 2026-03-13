import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colorSystem, spacing, typography } from '../../design-system';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info';

type BadgeProps = {
  label: string;
  variant?: BadgeVariant;
};

export function Badge({ label, variant = 'info' }: BadgeProps) {
  return (
    <View style={[styles.base, variant === 'success' && styles.success, variant === 'warning' && styles.warning, variant === 'error' && styles.error, variant === 'info' && styles.info]}>
      <Text style={[styles.label, variant === 'warning' ? styles.warningText : styles.defaultText]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 999,
    paddingHorizontal: spacing.s8,
    paddingVertical: spacing.s4,
    alignSelf: 'flex-start',
  },
  success: { backgroundColor: '#E8F7EE' },
  warning: { backgroundColor: '#FFF1E8' },
  error: { backgroundColor: '#FDEBEC' },
  info: { backgroundColor: '#E2F4F8' },
  label: {
    ...typography.small,
    fontWeight: '700',
  },
  defaultText: {
    color: colorSystem.text,
  },
  warningText: {
    color: colorSystem.warningText,
  },
});
