import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colorSystem, radius, spacing, typography } from '../../design-system';

type TableColumn<T> = {
  key: keyof T;
  title: string;
  width?: number;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
};

type TableProps<T> = {
  columns: TableColumn<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  emptyLabel?: string;
};

export function Table<T extends Record<string, unknown>>({
  columns,
  rows,
  rowKey,
  emptyLabel = 'Sem dados para exibir',
}: TableProps<T>) {
  return (
    <ScrollView horizontal style={styles.wrapper} contentContainerStyle={styles.content}>
      <View>
        <View style={styles.headerRow}>
          {columns.map((column) => (
            <Text key={String(column.key)} style={[styles.headerCell, column.width ? { width: column.width } : null]}>
              {column.title}
            </Text>
          ))}
        </View>
        {rows.length === 0 && <Text style={styles.empty}>{emptyLabel}</Text>}
        {rows.map((row, index) => (
          <View key={rowKey(row, index)} style={styles.dataRow}>
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderWidth: 1,
    borderColor: colorSystem.border,
    borderRadius: radius.large,
    backgroundColor: colorSystem.surface,
  },
  content: {
    minWidth: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#EDF3FC',
    borderBottomWidth: 1,
    borderBottomColor: colorSystem.border,
  },
  headerCell: {
    ...typography.small,
    color: colorSystem.secondary,
    fontWeight: '700',
    paddingVertical: spacing.s12,
    paddingHorizontal: spacing.s12,
    minWidth: 140,
  },
  dataRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F9',
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
  empty: {
    ...typography.body,
    color: colorSystem.textMuted,
    padding: spacing.s16,
  },
});
