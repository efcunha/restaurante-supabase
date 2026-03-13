import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from './Card';
import { colorSystem, spacing, typography } from '../../design-system';

type RestaurantCardProps = {
  name: string;
  subtitle?: string;
  eta?: string;
  rating?: string;
  status?: string;
};

export function RestaurantCard({ name, subtitle, eta, rating, status }: RestaurantCardProps) {
  return (
    <Card elevated="medium" style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.name}>{name}</Text>
        {!!status && <Text style={styles.status}>{status}</Text>}
      </View>
      {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      <View style={styles.metaRow}>
        {!!rating && <Text style={styles.meta}>Avaliacao {rating}</Text>}
        {!!eta && <Text style={styles.meta}>ETA {eta}</Text>}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.s8,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    ...typography.headingM,
    color: colorSystem.text,
    flex: 1,
    marginRight: spacing.s8,
  },
  subtitle: {
    ...typography.body,
    color: colorSystem.textMuted,
  },
  status: {
    ...typography.small,
    color: colorSystem.success,
    backgroundColor: '#E8F7EE',
    borderRadius: 999,
    paddingHorizontal: spacing.s8,
    paddingVertical: spacing.s4,
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.s12,
    flexWrap: 'wrap',
  },
  meta: {
    ...typography.small,
    color: colorSystem.secondary,
  },
});
