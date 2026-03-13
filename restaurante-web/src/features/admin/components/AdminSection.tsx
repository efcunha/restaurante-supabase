import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../../theme/colors';
import { AdminSectionProps } from '../types';

export function AdminSection({ title, children, showDivider = true }: AdminSectionProps) {
  return (
    <>
      {showDivider && <View style={styles.divider} />}
      <Text style={styles.sectionHeader}>{title}</Text>
      {children}
    </>
  );
}

const styles = StyleSheet.create({
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 16,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.6,
    marginBottom: 12,
  },
});