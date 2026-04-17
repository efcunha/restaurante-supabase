import { colors, spacing } from '@restaurante/tokens';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';

export function Loader(): React.JSX.Element {
  return (
    <View style={{ padding: spacing.md, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={colors.brand[600]} />
    </View>
  );
}
