import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colorSystem, radius, spacing, typography } from '../../design-system';

type SortDir = 'asc' | 'desc';

type TableColumn<T> = {
  key: keyof T;
  title: string;
  width?: number;
  sortable?: boolean;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
};

type TableProps<T> = {
  columns: TableColumn<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  emptyLabel?: string;
  loading?: boolean;
  sortable?: boolean;
  onSort?: (key: keyof T, dir: SortDir) => void;
};

export function Table<T extends Record<string, unknown>>({
  columns,
  rows,
  rowKey,
  emptyLabel = 'Sem dados para exibir',
  loading = false,
  sortable = false,
  onSort,
}: TableProps<T>) {
  const [sortKey, setSortKey] = useState<keyof T | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const handleSort = (col: TableColumn<T>) => {
    if (!sortable && !col.sortable) return;
    const nextDir: SortDir = sortKey === col.key && sortDir === 'asc' ? 'desc' : 'asc';
    setSortKey(col.key);
    setSortDir(nextDir);
    onSort?.(col.key, nextDir);
  };

  const isSortable = (col: TableColumn<T>) => sortable || col.sortable;

  return (
    <View style={styles.wrapper}>
      {/* Cabecalho */}
      <View style={styles.headerRow}>
        {columns.map((column) => (
          <TouchableOpacity
            key={String(column.key)}
            style={[styles.headerCell, column.width ? { width: column.width } : null]}
            onPress={() => handleSort(column)}
            disabled={!isSortable(column)}
            activeOpacity={isSortable(column) ? 0.6 : 1}
            accessibilityRole="button"
            accessibilityLabel={`Ordenar por ${column.title}`}
          >
            <Text style={styles.headerCellText}>{column.title}</Text>
            {isSortable(column) && (
              <Ionicons
                name={
                  sortKey === column.key
                    ? sortDir === 'asc'
                      ? 'chevron-up'
                      : 'chevron-down'
                    : 'swap-vertical'
                }
                size={13}
                color={sortKey === column.key ? colorSystem.primary : colorSystem.textMuted}
                style={styles.sortIcon}
              />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Estado: carregando */}
      {loading && (
        <View style={styles.stateContainer}>
          <ActivityIndicator size="small" color={colorSystem.primary} />
          <Text style={styles.stateText}>Carregando...</Text>
        </View>
      )}

      {/* Estado: vazio */}
      {!loading && rows.length === 0 && (
        <View style={styles.stateContainer}>
          <Ionicons name="document-outline" size={32} color={colorSystem.textMuted} />
          <Text style={styles.stateText}>{emptyLabel}</Text>
        </View>
      )}

      {/* Linhas */}
      {!loading && rows.map((row, index) => (
        <View key={rowKey(row, index)} style={[styles.dataRow, index % 2 === 0 ? styles.dataRowEven : null]}>
          {columns.map((column) => {
            const value = row[column.key];
            return (
              <View key={String(column.key)} style={[styles.dataCell, column.width ? { width: column.width } : null]}>
                {column.render ? (
                  column.render(value, row)
                ) : (
                  <Text style={styles.dataText}>{String(value ?? '')}</Text>
                )}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderWidth: 1,
    borderColor: colorSystem.border,
    borderRadius: radius.large,
    backgroundColor: colorSystem.surface,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#EDF3FC',
    borderBottomWidth: 1,
    borderBottomColor: colorSystem.border,
  },
  headerCell: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.s12,
    paddingHorizontal: spacing.s12,
    minWidth: 140,
    gap: spacing.s4,
  },
  headerCellText: {
    ...typography.small,
    color: colorSystem.secondary,
    fontWeight: '700',
  },
  sortIcon: {
    marginLeft: spacing.s4,
  },
  dataRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F9',
  },
  dataRowEven: {
    backgroundColor: '#FAFBFE',
  },
  dataCell: {
    minWidth: 140,
    paddingVertical: spacing.s12,
    paddingHorizontal: spacing.s12,
    justifyContent: 'center',
  },
  dataText: {
    ...typography.body,
    color: colorSystem.text,
  },
  stateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.s32,
    gap: spacing.s8,
  },
  stateText: {
    ...typography.body,
    color: colorSystem.textMuted,
  },
});