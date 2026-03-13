import React, { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { Navbar } from '../ui';
import { colorSystem } from '../design-system';

type NavbarAction = {
  label: string;
  onPress: () => void;
};

interface ScreenScaffoldProps {
  title: string;
  subtitle?: string;
  leftAction?: NavbarAction;
  rightSlot?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  scroll?: boolean;
  headerContainerStyle?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  bodyStyle?: ViewStyle;
}

export function ScreenScaffold({
  title,
  subtitle,
  leftAction,
  rightSlot,
  children,
  footer,
  scroll = false,
  headerContainerStyle,
  contentContainerStyle,
  bodyStyle,
}: ScreenScaffoldProps) {
  return (
    <View style={styles.container}>
      <View style={headerContainerStyle}>
        <Navbar
          title={title}
          subtitle={subtitle}
          leftAction={leftAction}
          rightSlot={rightSlot}
        />
      </View>

      {scroll ? (
        <ScrollView contentContainerStyle={contentContainerStyle} style={bodyStyle}>
          {children}
        </ScrollView>
      ) : (
        <View style={bodyStyle}>{children}</View>
      )}

      {footer}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorSystem.background,
  },
});