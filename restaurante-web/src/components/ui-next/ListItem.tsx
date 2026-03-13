import React, { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colorSystem, radius, spacing, typography } from '../../design-system';

type ListItemProps = {
  title: string;
  subtitle?: string;
  leftSlot?: ReactNode;
  rightSlot?: ReactNode;
  onPress?: () => void;
};

export function ListItem({ title, subtitle, leftSlot, rightSlot, onPress }: ListItemProps) {
  const Wrapper = onPress ? Pressable : View;
  const wrapperProps = onPress
    ? { onPress, style: ({ pressed }: { pressed: boolean }) => [styles.row, pressed && styles.pressed] }
    : { style: styles.row };

  return (
    <Wrapper {...wrapperProps}>
      {leftSlot}
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {rightSlot}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s12,
    backgroundColor: colorSystem.surface,
    borderWidth: 1,
    borderColor: colorSystem.border,
    borderRadius: radius.medium,
    paddingHorizontal: spacing.s12,
    paddingVertical: spacing.s12,
  },
  pressed: {
    opacity: 0.86,
  },
  content: {
    flex: 1,
  },
  title: {
    ...typography.body,
    color: colorSystem.text,
    fontWeight: '600',
  },
  subtitle: {
    ...typography.small,
    color: colorSystem.textMuted,
    marginTop: spacing.s4,
  },
});
