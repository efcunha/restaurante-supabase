import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { borderRadius, borderWidth, designColors, fontSizes, fontWeights, spacing } from '../design-system';

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
    borderColor: designColors.border.subtle,
    borderRadius: borderRadius.lg,
    backgroundColor: designColors.surface.card,
    padding: spacing[4],
    gap: spacing[2],
  },
  title: {
    color: designColors.text.primary,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
  },
  description: {
    color: designColors.text.secondary,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.regular,
  },
  content: {
    gap: spacing[3],
  },
});
