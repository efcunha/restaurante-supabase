import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { colorSystem, spacing, typography, shadows } from '../design-system';

/**
 * Header compartilhado para todas as telas
 * Exibe nome do usuário logado e botão de sair
 */
export default function ScreenHeader({ title, onBack = null }) {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: Math.max(insets.top, spacing.s16) }]}>
      {onBack && (
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Voltar</Text>
        </TouchableOpacity>
      )}

      <View style={styles.headerCenter}>
        <Text style={styles.headerTitle}>{title}</Text>
        {user?.nome && (
          <Text style={styles.userInfo}>{user.nome}</Text>
        )}
      </View>

      <TouchableOpacity onPress={logout} style={styles.sairBtn}>
        <Text style={styles.sairBtnText}>Sair</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colorSystem.primary,
    paddingBottom: spacing.s12,
    paddingHorizontal: spacing.s16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadows.medium,
  },
  backBtn: {
    paddingVertical: spacing.s8,
    paddingRight: spacing.s8,
  },
  backBtnText: {
    ...typography.body,
    color: colorSystem.onPrimary,
    fontWeight: '600',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.s8,
  },
  headerTitle: {
    ...typography.headingM,
    color: colorSystem.onPrimary,
    fontWeight: 'bold',
  },
  userInfo: {
    ...typography.small,
    color: colorSystem.onPrimary,
    marginTop: spacing.s4,
    fontWeight: '600',
    opacity: 0.9,
  },
  sairBtn: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: spacing.s12,
    paddingVertical: spacing.s8,
    borderRadius: 8,
  },
  sairBtnText: {
    ...typography.small,
    color: colorSystem.onPrimary,
    fontWeight: '600',
  },
});
