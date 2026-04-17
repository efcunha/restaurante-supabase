import { colors, radius, spacing, typography } from '@restaurante/tokens';
import React from 'react';
import { Text, View } from 'react-native';

interface BadgeProps {
  label: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
}

const toneMap = {
  neutral: { bg: colors.neutral[100], text: colors.neutral[700] },
  success: { bg: '#dcfce7', text: '#166534' },
  warning: { bg: '#fef3c7', text: '#92400e' },
  danger: { bg: '#fee2e2', text: '#991b1b' },
} as const;

export function Badge({ label, tone = 'neutral' }: BadgeProps): React.JSX.Element {
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: toneMap[tone].bg,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: radius.full,
      }}
    >
      <Text style={{ color: toneMap[tone].text, fontSize: typography.size.xs, fontWeight: '600' }}>
        {label}
      </Text>
    </View>
  );
}
