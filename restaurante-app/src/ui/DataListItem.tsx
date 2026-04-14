import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { borderRadius, borderWidth, designColors, fontSizes, fontWeights, spacing } from '../design-system';

type DataListItemStatus = 'default' | 'success' | 'warning' | 'error';

type DataListItemProps = {
  title: string;
  subtitle?: string;
  meta?: string;
  status?: DataListItemStatus;
  onPress?: () => void;
  swipeActions?: React.ReactNode;
};

const STATUS_COLOR: Record<DataListItemStatus, string> = {
  default: designColors.border.default,
  success: designColors.semantic.success.default,
  warning: designColors.semantic.warning.default,
  error: designColors.semantic.error.default,
};

export function DataListItem({
  title,
  subtitle,
  meta,
  status = 'default',
  onPress,
  swipeActions,
}: DataListItemProps) {
  const content = (
    <View style={[styles.item, { borderLeftColor: STATUS_COLOR[status] }]}>
      <View style={styles.textBlock}>
        <Text style={styles.title}>{title}</Text>
        {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {!!meta && <Text style={styles.meta}>{meta}</Text>}
      {swipeActions}
    </View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [pressed && styles.pressed]}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: {
    borderWidth: borderWidth.default,
    borderColor: designColors.border.subtle,
    borderLeftWidth: 4,
    borderRadius: borderRadius.lg,
    backgroundColor: designColors.surface.card,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3],
    gap: spacing[1],
  },
  textBlock: {
    gap: spacing[1],
  },
  title: {
    color: designColors.text.primary,
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
  },
  subtitle: {
    color: designColors.text.secondary,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.regular,
  },
  meta: {
    color: designColors.text.tertiary,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.medium,
  },
  pressed: {
    opacity: 0.88,
  },
});
