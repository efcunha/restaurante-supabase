import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

interface AdminHeaderProps {
  userName?: string;
  onLogout: () => void;
  paddingTop?: number;
}

export default function AdminHeader({ userName, onLogout, paddingTop = 50 }: AdminHeaderProps) {
  return (
    <View style={[styles.header, { paddingTop }]}>
      <View style={styles.headerLeft}>
        {!!userName && (
          <View>
            <Text style={styles.userInfoLabel}>Ola,</Text>
            <Text style={styles.userInfo}>{userName}</Text>
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
        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
          <Ionicons name="log-out-outline" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.primary,
    paddingBottom: 15,
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
    fontSize: 10,
  },
  userInfo: {
    color: colors.secondary,
    fontSize: 12,
    fontWeight: '600',
  },
  logoutBtn: {
    padding: 5,
  },
});
