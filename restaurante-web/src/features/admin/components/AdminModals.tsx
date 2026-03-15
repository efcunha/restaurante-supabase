import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../../../theme/colors';
import { AdminSlideModalProps, AdminCaixaModalProps, BaseAdminModalProps } from '../types';

export function AdminSlideModal({
  visible,
  onClose,
  children,
  statusBarTranslucent,
  hardwareAccelerated,
}: AdminSlideModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent={statusBarTranslucent}
      hardwareAccelerated={hardwareAccelerated}
    >
      <View style={styles.modalRoot}>{children}</View>
    </Modal>
  );
}

export function AdminBareModal({ visible, onClose, children }: BaseAdminModalProps) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalRoot}>{children}</View>
    </Modal>
  );
}

export function AdminCaixaModal({
  visible,
  onClose,
  title,
  children,
  headerStyle,
  closeButtonStyle,
  titleStyle,
}: AdminCaixaModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
      hardwareAccelerated
    >
      <View style={styles.modalRoot}>
        <View style={headerStyle}>
          <TouchableOpacity onPress={onClose}>
            <Text style={closeButtonStyle}>← Voltar</Text>
          </TouchableOpacity>
          <Text style={titleStyle}>{title}</Text>
        </View>
        {children}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    backgroundColor: colors.background,
  },
});