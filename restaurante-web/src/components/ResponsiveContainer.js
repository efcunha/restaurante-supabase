import React from 'react';
import { View, Dimensions, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
/**
 * Componente que garante redimensionamento correto em todas as orientações
 * Resolve problemas de layout em tablets e celulares
 */
export default function ResponsiveContainer({ children, style }) {
  const insets = useSafeAreaInsets();
  const { width, height } = Dimensions.get('window');
  
  // Detectar orientação
  const isLandscape = width > height;
  
  const containerStyle = [
    styles.container,
    {
      paddingTop: insets.top,
      paddingBottom: insets.bottom,
      paddingLeft: insets.left,
      paddingRight: insets.right,
      // Ajustar padding baseado na orientação
      paddingHorizontal: isLandscape ? Math.max(insets.left, insets.right, 20) : 16,
    },
    style
  ];

  return (
    <View style={containerStyle}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
