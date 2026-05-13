import { colors, radius, spacing } from '@restaurante/tokens';
import React from 'react';
import { View } from 'react-native';

interface CardProps {
  children: React.ReactNode;
}

export function Card({ children }: CardProps): React.JSX.Element {
  return (
    <View
      style={{
        backgroundColor: colors.neutral[0],
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.neutral[200],
        padding: spacing.lg,
      }}
    >
      {children}
    </View>
  );
}
