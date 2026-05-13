import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../../theme/colors';
import { AdminSectionProps } from '../types';

export function AdminSection({ title, children, showDivider = true }: AdminSectionProps) {
  return (
    <>
      {showDivider && <View style={styles.divider} />}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionHeader}>{title}</Text>
        <View style={styles.actionsGrid}>{children}</View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  divider: {
    height: 1,
    backgroundColor: '#C7D3E6',
    marginTop: 4,
    marginBottom: 16,
  },
  sectionCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 12,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 0.4,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
});