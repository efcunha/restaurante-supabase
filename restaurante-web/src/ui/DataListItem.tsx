import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { borderRadius, borderWidth, fontSizes, fontWeights, spacing } from '../design-system';
import { colors } from '../theme/colors';

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
  default: colors.border,
  success: colors.success,
  warning: colors.warning,
  error: colors.danger,
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
    borderColor: colors.border,
    borderLeftWidth: 4,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.white,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3],
    gap: spacing[1],
  },
  textBlock: {
    gap: spacing[1],
  },
  title: {
    color: colors.text,
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.regular,
  },
  meta: {
    color: colors.textSecondary,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.medium,
  },
  pressed: {
    opacity: 0.88,
  },
});
