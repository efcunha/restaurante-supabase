import React, { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colorSystem, radius, shadows, spacing } from '../../design-system';

type DrawerProps = {
  visible: boolean;
  side?: 'left' | 'right';
  width?: number;
  onClose: () => void;
  children: ReactNode;
};

export function Drawer({ visible, side = 'left', width = 300, onClose, children }: DrawerProps) {
  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={[styles.panel, side === 'right' ? styles.right : styles.left, { width }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colorSystem.overlay,
    zIndex: 120,
  },
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: colorSystem.surface,
    padding: spacing.s16,
    borderRadius: radius.large,
    ...shadows.floating,
  },
  left: {
    left: 0,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },
  right: {
    right: 0,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
});
