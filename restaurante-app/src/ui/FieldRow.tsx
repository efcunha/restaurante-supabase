import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { designColors, fontSizes, fontWeights, spacing } from '../design-system';

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
    color: designColors.text.primary,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
  },
  helper: {
    color: designColors.text.secondary,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.regular,
  },
  error: {
    color: designColors.semantic.error.default,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.medium,
  },
});
