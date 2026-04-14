import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { designColors, fontSizes, fontWeights, spacing } from '../design-system';

type HeaderAction = {
  label: string;
  onPress: () => void;
};

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  leftAction?: HeaderAction;
  rightAction?: HeaderAction;
};

export function ScreenHeader({ title, subtitle, leftAction, rightAction }: ScreenHeaderProps) {
  return (
    <View style={styles.container} accessibilityRole="header">
      <View style={styles.row}>
        <View style={styles.main}>
          <Text style={styles.title}>{title}</Text>
          {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        {!!rightAction && (
          <Pressable onPress={rightAction.onPress} accessibilityRole="button" style={styles.actionButton}>
            <Text style={styles.actionLabel}>{rightAction.label}</Text>
          </Pressable>
        )}
      </View>
      {!!leftAction && (
        <Pressable onPress={leftAction.onPress} accessibilityRole="button" style={styles.actionButton}>
          <Text style={styles.actionLabel}>{leftAction.label}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[2],
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
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.semibold,
  },
  subtitle: {
    marginTop: spacing[1],
    color: designColors.text.secondary,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.regular,
  },
  actionButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing[2],
  },
  actionLabel: {
    color: designColors.primary[700],
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
  },
});
