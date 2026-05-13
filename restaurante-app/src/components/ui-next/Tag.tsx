import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colorSystem, radius, spacing, typography } from '../../design-system';
import { colors } from '../../theme/colors';
type TagProps = {
  label: string;
  active?: boolean;
  onPress?: () => void;
};

export function Tag({ label, active = false, onPress }: TagProps) {
  const Comp = onPress ? Pressable : React.Fragment;

  if (!onPress) {
    return <Text style={[styles.base, styles.label, active && styles.active]}>{label}</Text>;
  }

  return (
    <Comp onPress={onPress} style={({ pressed }) => [styles.base, active && styles.active, pressed && styles.pressed]}>
      <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
    </Comp>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    borderRadius: radius.large,
    borderWidth: 1,
    borderColor: colorSystem.border,
    backgroundColor: colorSystem.surface,
    paddingHorizontal: spacing.s12,
    paddingVertical: spacing.s8,
  },
  active: {
    borderColor: colorSystem.primary,
    backgroundColor: colors.primaryTint,
  },
  label: {
    ...typography.small,
    color: colorSystem.textMuted,
  },
  labelActive: {
    color: colorSystem.primary,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.85,
  },
});
