import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

interface CaixaMenuModalProps {
  visible: boolean;
  onClose: () => void;
  onOpenAbertura: () => void;
  onOpenOperacoes: () => void;
  onOpenFechamento: () => void;
  onOpenHistorico: () => void;
}

export default function CaixaMenuModal({
  visible,
  onClose,
  onOpenAbertura,
  onOpenOperacoes,
  onOpenFechamento,
  onOpenHistorico,
}: CaixaMenuModalProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={styles.caixaMenuContainer}>
          <View style={styles.caixaMenuHeader}>
            <Text style={styles.caixaMenuTitle}>💰 Caixa</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.caixaMenuClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.caixaMenuContent}>
            <TouchableOpacity
              style={styles.caixaMenuItem}
              onPress={() => { onClose(); onOpenAbertura(); }}
            >
              <Text style={styles.caixaMenuIcon}>💼</Text>
              <Text style={styles.caixaMenuText}>Abrir Caixa</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.caixaMenuItem}
              onPress={() => { onClose(); onOpenOperacoes(); }}
            >
              <Text style={styles.caixaMenuIcon}>💵</Text>
              <Text style={styles.caixaMenuText}>Sangria / Reforço</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.caixaMenuItem}
              onPress={() => { onClose(); onOpenFechamento(); }}
            >
              <Text style={styles.caixaMenuIcon}>🔒</Text>
              <Text style={styles.caixaMenuText}>Fechar Caixa</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.caixaMenuItem}
              onPress={() => { onClose(); onOpenHistorico(); }}
            >
              <Text style={styles.caixaMenuIcon}>📊</Text>
              <Text style={styles.caixaMenuText}>Histórico</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  caixaMenuContainer: {
    backgroundColor: colors.white,
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  caixaMenuHeader: {
    backgroundColor: colors.primary,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  caixaMenuTitle: {
    color: colors.white,
    fontSize: 24,
    fontWeight: '700',
  },
  caixaMenuClose: {
    color: colors.white,
    fontSize: 28,
    fontWeight: '300',
  },
  caixaMenuContent: {
    padding: 10,
  },
  caixaMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    marginVertical: 5,
    backgroundColor: colors.warningSurface,
    borderRadius: 15,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 2,
  },
  caixaMenuIcon: {
    fontSize: 32,
    marginRight: 15,
  },
  caixaMenuText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
});
