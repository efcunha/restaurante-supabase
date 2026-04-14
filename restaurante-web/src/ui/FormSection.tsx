import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { borderRadius, borderWidth, fontSizes, fontWeights, spacing } from '../design-system';
import { colors } from '../theme/colors';

type FormSectionProps = {
  title?: string;
  description?: string;
  children: React.ReactNode;
};

export function FormSection({ title, description, children }: FormSectionProps) {
  return (
    <View style={styles.container}>
      {!!title && <Text style={styles.title}>{title}</Text>}
      {!!description && <Text style={styles.description}>{description}</Text>}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: borderWidth.default,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.white,
    padding: spacing[4],
    gap: spacing[2],
  },
  title: {
    color: colors.text,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
  },
  description: {
    color: colors.textSecondary,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.regular,
  },
  content: {
    gap: spacing[3],
  },
});
