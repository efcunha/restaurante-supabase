import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
interface AdminHeaderProps {
  userName?: string;
  paddingTop?: number;
}

export default function AdminHeader({ userName, paddingTop }: AdminHeaderProps) {
  const resolvedPaddingTop = paddingTop ?? (Platform.OS === 'web' ? 16 : 50);

  return (
    <View style={[styles.header, { paddingTop: resolvedPaddingTop }]}>
      <View style={styles.headerLeft} />
      <View style={styles.headerCenter}>
        <View style={styles.headerTitleRow}>
          <Ionicons name="shield-checkmark-outline" size={24} color={colors.white} style={styles.headerIcon} />
          <Text style={styles.headerTitle}>Admin</Text>
        </View>
        {!!userName && <Text style={styles.userInfo} numberOfLines={1} ellipsizeMode="tail">Operador: {userName}</Text>}
      </View>
      <View style={styles.headerRight} />
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
    fontSize: 12,
    fontWeight: '600',
    maxWidth: 360,
    marginTop: 4,
    textAlign: 'center',
  },
});
