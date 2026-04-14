import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/ui-next/Button';
import { borderRadius, designColors, fontSizes, fontWeights, spacing } from '../design-system';

type ConfirmActionDialogProps = {
  visible: boolean;
  title: string;
  message: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmActionDialog({
  visible,
  title,
  message,
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmActionDialogProps) {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onCancel}
      accessibilityViewIsModal
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} accessibilityRole="button" />
        <View style={styles.dialog} accessibilityRole="alertdialog" accessibilityLabel={title}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            <Button label="Cancelar" onPress={onCancel} variant="ghost" />
            <Button label="Confirmar" onPress={onConfirm} variant={danger ? 'danger' : 'primary'} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
    backgroundColor: designColors.surface.overlay,
  },
  dialog: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: designColors.surface.card,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    gap: spacing[3],
  },
  title: {
    color: designColors.text.primary,
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.semibold,
  },
  message: {
    color: designColors.text.secondary,
    fontSize: fontSizes.base,
    fontWeight: fontWeights.regular,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing[2],
  },
});
