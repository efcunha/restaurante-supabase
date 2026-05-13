import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colorSystem, radius, spacing, typography } from '../../design-system';

type PaginationProps = {
  page: number;
  totalPages: number;
  onPageChange: (nextPage: number) => void;
};

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <View style={styles.row}>
      <Pressable disabled={!canPrev} onPress={() => onPageChange(page - 1)} style={[styles.btn, !canPrev && styles.disabled]}>
        <Text style={styles.btnText}>Anterior</Text>
      </Pressable>
      <Text style={styles.info}>{page} / {totalPages}</Text>
      <Pressable disabled={!canNext} onPress={() => onPageChange(page + 1)} style={[styles.btn, !canNext && styles.disabled]}>
        <Text style={styles.btnText}>Proxima</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.s12,
  },
  btn: {
    borderWidth: 1,
    borderColor: colorSystem.border,
    borderRadius: radius.small,
    backgroundColor: colorSystem.surface,
    paddingHorizontal: spacing.s12,
    paddingVertical: spacing.s8,
  },
  btnText: {
    ...typography.small,
    color: colorSystem.text,
    fontWeight: '700',
  },
  info: {
    ...typography.small,
    color: colorSystem.textMuted,
  },
  disabled: {
    opacity: 0.45,
  },
});
