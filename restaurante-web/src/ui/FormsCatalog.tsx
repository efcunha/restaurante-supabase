import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { spacing, typography } from '../design-system/tokens';
import { webFormScreens } from './formsCatalogData';

export type FormsCatalogProps = {
  onlyScreenName?: string;
};

const groupLabel: Record<string, string> = {
  auth: 'Autenticacao',
  admin: 'Admin',
  operations: 'Operacional',
  delivery: 'Delivery',
  menu: 'Cardapio/Menu',
};

const order = ['auth', 'admin', 'operations', 'delivery', 'menu'];

export function FormsCatalog({ onlyScreenName }: FormsCatalogProps = {}) {
  const source = onlyScreenName
    ? webFormScreens.filter((entry) => entry.name === onlyScreenName)
    : webFormScreens;

  const grouped = order.map((group) => ({
    group,
    items: source.filter((entry) => entry.group === group),
  }));

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>
        {onlyScreenName ? `Formulario - ${onlyScreenName}` : 'Catalogo de Formularios - restaurante-web'}
      </Text>
      <Text style={styles.subtitle}>
        {onlyScreenName
          ? 'Exportacao individual do formulario para Storybook/Figma.'
          : 'Exportacao consolidada para Storybook/Figma com todas as telas que possuem entradas de formulario.'}
      </Text>

      {grouped.map(({ group, items }) => {
        if (items.length === 0) {
          return null;
        }

        return (
          <View key={group} style={styles.section}>
            <Text style={styles.sectionTitle}>{groupLabel[group] ?? group}</Text>
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
    backgroundColor: colors.background,
    gap: spacing[4],
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

export default FormsCatalog;
