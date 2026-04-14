import React, { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Navbar } from '../ui';
import { colorSystem } from '../design-system';
import { useAuth } from '../context/AuthContext';

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
  headerContainerStyle?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  bodyStyle?: StyleProp<ViewStyle>;
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
  const { user } = useAuth();
  const resolvedSubtitle = subtitle ?? (user ? `Operador: ${user.nome || user.email}` : undefined);

  return (
    <View style={styles.container}>
      <View style={headerContainerStyle}>
        <Navbar
          title={title}
          subtitle={resolvedSubtitle}
          leftAction={leftAction}
          rightSlot={rightSlot}
        />
      </View>

      <KeyboardAvoidingView
        style={styles.body}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        {scroll ? (
          <ScrollView contentContainerStyle={contentContainerStyle} style={bodyStyle}>
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.body, bodyStyle]}>{children}</View>
        )}
      </KeyboardAvoidingView>

      {footer}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorSystem.background,
  },
  body: {
    flex: 1,
  },
});