import React, { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Navbar } from '../ui';
import { colorSystem } from '../design-system';
import { useAuth } from '../context/AuthContext';

type NavbarAction = {
  label: string;
  onPress: () => void;
};

interface ScreenScaffoldProps {
  title?: string;
  subtitle?: string;
  header?: { title: string; subtitle?: string };
  onClose?: () => void;
  titleIcon?: ReactNode;
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
  header,
  onClose,
  titleIcon,
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
  const resolvedTitle = header?.title ?? title ?? '';
  const resolvedSubtitle = header?.subtitle ?? subtitle ?? (user ? `Operador: ${user.nome || user.email}` : undefined);
  const resolvedLeftAction = leftAction ?? (onClose ? { label: 'Voltar', onPress: onClose } : undefined);

  return (
    <View style={styles.container}>
      <View style={headerContainerStyle}>
        <Navbar
          title={resolvedTitle}
          subtitle={resolvedSubtitle}
          titleIcon={titleIcon}
          leftAction={resolvedLeftAction}
          rightSlot={rightSlot}
        />
      </View>

      {scroll ? (
        <ScrollView contentContainerStyle={contentContainerStyle} style={bodyStyle}>
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.body, bodyStyle]}>{children}</View>
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
  body: {
    flex: 1,
  },
});