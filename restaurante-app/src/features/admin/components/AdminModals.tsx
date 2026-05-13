import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
      {children}
    </Modal>
  );
}

export function AdminCaixaModal({
  visible,
  onClose,
  title,
  icon = 'wallet-outline',
  children,
}: AdminCaixaModalProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
      hardwareAccelerated
    >
      <View style={styles.modalRoot}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
          <View style={styles.headerLeft} />
          <View style={styles.headerCenter}>
            <View style={styles.headerTitleRow}>
              <Ionicons name={icon} size={24} color={colors.white} style={styles.headerIcon} />
              <Text style={styles.headerTitle}>{title}</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.backButton} onPress={onClose}>
              <Ionicons name="arrow-back-outline" size={24} color={colors.white} />
            </TouchableOpacity>
          </View>
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
  header: {
    backgroundColor: colors.primary,
    paddingBottom: 15,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    zIndex: 10,
    elevation: 8,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  headerLeft: { flex: 1 },
  headerCenter: { flex: 2, alignItems: 'center', justifyContent: 'center' },
  headerRight: { flex: 1, alignItems: 'flex-end', justifyContent: 'center' },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center' },
  headerIcon: { marginRight: 6 },
  backButton: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, backgroundColor: colors.logoutBg },
  headerTitle: { color: colors.white, fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
});