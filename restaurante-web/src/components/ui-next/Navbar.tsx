import React, { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
  return (
    <View style={styles.wrapper}>
      <View style={styles.content}>
        <View style={styles.sideSlot}>
          {!!leftAction && (
            <Pressable onPress={leftAction.onPress} style={styles.backButton}>
              <Text style={styles.backText}>{leftAction.label}</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.centerBlock}>
          <Text style={styles.title}>{title}</Text>
          {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>

        <View style={[styles.sideSlot, styles.rightSlot]}>{rightSlot}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: colorSystem.primary,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    overflow: 'hidden',
    ...shadows.medium,
  },
  content: {
    paddingHorizontal: spacing.s16,
    paddingVertical: spacing.s12,
    minHeight: 88,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sideSlot: {
    flex: 1,
    minWidth: 88,
    justifyContent: 'center',
  },
  centerBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.s8,
  },
  rightSlot: {
    alignItems: 'flex-end',
  },
  title: {
    ...typography.headingM,
    color: colorSystem.onPrimary,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.small,
    color: 'rgba(255,255,255,0.78)',
    marginTop: spacing.s4,
    textAlign: 'center',
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.s8,
    paddingHorizontal: spacing.s10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  backText: {
    ...typography.small,
    color: colorSystem.onPrimary,
    fontWeight: '700',
  },
});
