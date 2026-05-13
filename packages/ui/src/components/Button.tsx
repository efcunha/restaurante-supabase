import { colors, radius, spacing, typography } from '@restaurante/tokens';
import React from 'react';
import { ActivityIndicator, Pressable, Text } from 'react-native';

type ButtonVariant = 'primary' | 'secondary' | 'danger';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: ButtonVariant;
}

const backgroundByVariant: Record<ButtonVariant, string> = {
  primary: colors.brand[600],
  secondary: colors.neutral[700],
  danger: colors.danger,
};

export function Button({
  label,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
}: ButtonProps): React.JSX.Element {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={{
        backgroundColor: backgroundByVariant[variant],
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderRadius: radius.md,
        opacity: isDisabled ? 0.7 : 1,
        alignItems: 'center',
      }}
    >
      {loading ? (
        <ActivityIndicator color={colors.neutral[0]} />
      ) : (
        <Text
          style={{
            color: colors.neutral[0],
            fontSize: typography.size.md,
            fontWeight: typography.weight.semibold,
          }}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}
