import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { designColors, fontSizes, fontWeights, spacing } from '../design-system';

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
};

export function SectionHeader({ title, subtitle, rightSlot }: SectionHeaderProps) {
  return (
    <View style={styles.container} accessibilityRole="header">
      <View style={styles.row}>
        <View style={styles.main}>
          <Text style={styles.title}>{title}</Text>
          {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        {rightSlot}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing[2],
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing[3],
  },
  main: {
    flex: 1,
  },
  title: {
    color: designColors.text.primary,
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
  },
  subtitle: {
    marginTop: spacing[1],
    color: designColors.text.secondary,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.regular,
  },
});
