import React, { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colorSystem, shadows, spacing, typography } from '../../design-system';

type NavbarAction = {
  label: string;
  onPress: () => void;
};

type NavbarProps = {
  title: string;
  subtitle?: string;
  leftAction?: NavbarAction;
  rightSlot?: ReactNode;
};

export function Navbar({ title, subtitle, leftAction, rightSlot }: NavbarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrapper, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        <View style={styles.leftBlock}>
          {!!leftAction && (
            <Pressable onPress={leftAction.onPress} style={styles.backButton}>
              <Text style={styles.backText}>{leftAction.label}</Text>
            </Pressable>
          )}
          <Text style={styles.title}>{title}</Text>
          {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        <View>{rightSlot}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: colorSystem.surface,
    borderBottomWidth: 1,
    borderBottomColor: colorSystem.border,
    ...shadows.low,
  },
  content: {
    paddingHorizontal: spacing.s16,
    paddingVertical: spacing.s12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftBlock: {
    flex: 1,
  },
  title: {
    ...typography.headingM,
    color: colorSystem.text,
  },
  subtitle: {
    ...typography.small,
    color: colorSystem.textMuted,
    marginTop: spacing.s4,
  },
  backButton: {
    marginBottom: spacing.s8,
    alignSelf: 'flex-start',
  },
  backText: {
    ...typography.small,
    color: colorSystem.primary,
    fontWeight: '700',
  },
});
