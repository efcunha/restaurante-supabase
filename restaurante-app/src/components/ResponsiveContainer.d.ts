import type { ComponentType, ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

export interface ResponsiveContainerProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

declare const ResponsiveContainer: ComponentType<ResponsiveContainerProps>;

export default ResponsiveContainer;