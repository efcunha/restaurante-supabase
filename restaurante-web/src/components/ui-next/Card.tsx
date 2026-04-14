import React, { ReactNode } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { colorSystem, radius, shadows, spacing } from '../../design-system';

type CardProps = {
  children: ReactNode;
  padded?: boolean;
  elevated?: 'low' | 'medium' | 'high';
  style?: StyleProp<ViewStyle>;
};

export function Card({ children, padded = true, elevated = 'low', style }: CardProps) {
  return (
    <View
      style={[
        styles.base,
        padded && styles.padded,
        elevated === 'low' && shadows.low,
        elevated === 'medium' && shadows.medium,
        elevated === 'high' && shadows.high,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.large,
    backgroundColor: colorSystem.surface,
    borderWidth: 1,
    borderColor: colorSystem.border,
  },
  padded: {
    padding: spacing.s16,
  },
});
