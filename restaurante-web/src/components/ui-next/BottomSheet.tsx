import React, { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colorSystem, radius, shadows, spacing } from '../../design-system';

type BottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
};

export function BottomSheet({ visible, onClose, children }: BottomSheetProps) {
  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={styles.sheet}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colorSystem.overlay,
    justifyContent: 'flex-end',
    zIndex: 120,
  },
  sheet: {
    backgroundColor: colorSystem.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.s16,
    minHeight: 180,
    ...shadows.floating,
  },
});
