import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { spacing, typography } from '../../design-system/tokens';
import { colors } from '../../theme/colors';
import { webScreenEntries } from './screensRegistry.generated';

export type ScreensCatalogProps = {
  onlyScreenName?: string;
};

const groupsOrder = ['auth', 'admin', 'admin-menu', 'finance', 'delivery', 'operations', 'other'] as const;

const groupLabel: Record<(typeof groupsOrder)[number], string> = {
  auth: 'Auth',
  admin: 'Admin',
  'admin-menu': 'Admin Menu',
  finance: 'Financeiro',
  delivery: 'Delivery',
  operations: 'Operacional',
  other: 'Outros',
};

export function ScreensCatalog({ onlyScreenName }: ScreensCatalogProps = {}) {
  const source = onlyScreenName
    ? webScreenEntries.filter((entry) => entry.name === onlyScreenName)
    : webScreenEntries;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>
        {onlyScreenName ? `Tela - ${onlyScreenName}` : 'Catalogo de Telas - restaurante-web'}
      </Text>
      <Text style={styles.subtitle}>
        {onlyScreenName
          ? 'Exportacao individual da tela para desenvolvimento visual no Storybook/Figma.'
          : 'Exportacao consolidada de todas as telas para desenvolvimento e melhorias continuas.'}
      </Text>

      {groupsOrder.map((group) => {
        const items = source.filter((entry) => entry.group === group);
        if (items.length === 0) {
          return null;
        }

        return (
          <View key={group} style={styles.section}>
            <Text style={styles.sectionTitle}>{groupLabel[group]}</Text>
            {items.map((item) => (
              <View key={item.path} style={styles.row}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.path}>{item.path}</Text>
              </View>
            ))}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing[6],
    gap: spacing[4],
    backgroundColor: colors.background,
  },
  title: {
    color: colors.text,
    ...typography.headingM,
  },
  subtitle: {
    color: colors.textSecondary,
    ...typography.body,
  },
  section: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[4],
    gap: spacing[2],
  },
  sectionTitle: {
    color: colors.primary,
    ...typography.body,
    fontWeight: '700',
  },
  row: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing[2],
    gap: 4,
  },
  name: {
    color: colors.text,
    ...typography.body,
    fontWeight: '700',
  },
  path: {
    color: colors.textSecondary,
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 16,
  },
});

export default ScreensCatalog;
