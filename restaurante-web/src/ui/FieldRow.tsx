import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { fontSizes, fontWeights, spacing } from '../design-system';
import { colors } from '../theme/colors';

type FieldRowProps = {
  label: string;
  required?: boolean;
  error?: string;
  helper?: string;
  children: React.ReactNode;
};

export function FieldRow({ label, required = false, error, helper, children }: FieldRowProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}
        {required ? ' *' : ''}
      </Text>
      {children}
      {!!error && <Text style={styles.error}>{error}</Text>}
      {!error && !!helper && <Text style={styles.helper}>{helper}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[2],
  },
  label: {
    color: colors.text,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
  },
  helper: {
    color: colors.textSecondary,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.regular,
  },
  error: {
    color: colors.danger,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.medium,
  },
});
