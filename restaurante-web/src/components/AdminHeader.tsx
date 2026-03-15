import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
interface AdminHeaderProps {
  userName?: string;
  onLogout: () => void;
  paddingTop?: number;
}

export default function AdminHeader({ userName, onLogout, paddingTop }: AdminHeaderProps) {
  const resolvedPaddingTop = paddingTop ?? (Platform.OS === 'web' ? 16 : 50);

  return (
    <View style={[styles.header, { paddingTop: resolvedPaddingTop }]}>
      <View style={styles.headerLeft}>
        {!!userName && (
          <View>
              <Text style={styles.userInfoLabel}>Olá,</Text>
              <Text style={styles.userInfo} numberOfLines={1} ellipsizeMode="tail">{userName}</Text>
          </View>
        )}
      </View>
      <View style={styles.headerCenter}>
        <View style={styles.headerTitleRow}>
          <Ionicons name="shield-checkmark-outline" size={24} color={colors.white} style={styles.headerIcon} />
          <Text style={styles.headerTitle}>Admin</Text>
        </View>
      </View>
      <View style={styles.headerRight}>
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={onLogout}
          accessibilityRole="button"
          accessibilityLabel="Sair da conta"
        >
          <Ionicons name="log-out-outline" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.primary,
    minHeight: 92,
    paddingBottom: Platform.OS === 'web' ? 12 : 15,
    paddingHorizontal: 20,
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
    shadowRadius: 4.65,
  },
  headerLeft: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRight: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    marginRight: 8,
  },
  headerTitle: {
    color: colors.white,
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  userInfoLabel: {
    color: colors.primaryContrastMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  userInfo: {
    color: colors.userInfo,
    fontSize: 14,
    fontWeight: '700',
    maxWidth: 260,
  },
  logoutBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.logoutBg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
});
