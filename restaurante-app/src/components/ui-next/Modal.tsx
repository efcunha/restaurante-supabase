import React, { ReactNode } from 'react';
import { Modal as RNModal, Pressable, StyleSheet, View } from 'react-native';
import { colorSystem, radius, shadows, spacing } from '../../design-system';

type ModalProps = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
};

export function Modal({ visible, onClose, children }: ModalProps) {
  return (
    <RNModal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.container}>{children}</View>
      </View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colorSystem.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.s16,
  },
  container: {
    width: '100%',
    maxWidth: 520,
    borderRadius: radius.large,
    backgroundColor: colorSystem.surface,
    padding: spacing.s16,
    ...shadows.floating,
  },
});
