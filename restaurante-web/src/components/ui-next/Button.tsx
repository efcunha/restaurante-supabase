import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { colorSystem, radius, spacing, typography } from '../../design-system';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
};

const SIZE_MAP = {
  sm: { paddingVertical: spacing.s8, paddingHorizontal: spacing.s12 },
  md: { paddingVertical: spacing.s12, paddingHorizontal: spacing.s16 },
  lg: { paddingVertical: spacing.s16, paddingHorizontal: spacing.s24 },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  loading = false,
  style,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        SIZE_MAP[size],
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'ghost' && styles.ghost,
        variant === 'danger' && styles.danger,
        fullWidth && styles.fullWidth,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'ghost' ? colorSystem.primary : colorSystem.surface} />
      ) : (
        <Text
          style={[
            styles.label,
            variant === 'ghost' ? styles.ghostLabel : styles.filledLabel,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  primary: {
    backgroundColor: colorSystem.primary,
  },
  secondary: {
    backgroundColor: colorSystem.secondary,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colorSystem.border,
  },
  danger: {
    backgroundColor: colorSystem.error,
  },
  fullWidth: {
    width: '100%',
  },
  label: {
    ...typography.button,
  },
  filledLabel: {
    color: colorSystem.surface,
  },
  ghostLabel: {
    color: colorSystem.primary,
  },
  pressed: {
    opacity: 0.86,
    transform: [{ translateY: 1 }],
  },
  disabled: {
    opacity: 0.46,
  },
});
