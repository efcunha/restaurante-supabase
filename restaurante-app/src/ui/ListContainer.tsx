import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { spacing } from '../design-system';

type ListContainerProps = {
  children: React.ReactNode;
  style?: ViewStyle;
};

export function ListContainer({ children, style }: ListContainerProps) {
  return <View style={[styles.container, style]} accessibilityRole="list">{children}</View>;
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[3],
  },
});
