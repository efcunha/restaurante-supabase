import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card } from './Card';
import { colorSystem, spacing, typography } from '../../design-system';
import { colors } from '../../theme/colors';
type ProductCardProps = {
  name: string;
  description?: string;
  priceLabel: string;
  category?: string;
  onPress?: () => void;
  testID?: string;
};

export function ProductCard({ name, description, priceLabel, category, onPress, testID }: ProductCardProps) {
  const content = (
    <Card elevated="low" style={styles.card}>
      <View style={styles.header}>
        {!!category && <Text style={styles.category}>{category}</Text>}
        <Text style={styles.price}>{priceLabel}</Text>
      </View>
      <Text style={styles.name}>{name}</Text>
      {!!description && <Text style={styles.description}>{description}</Text>}
    </Card>
  );

  if (!onPress) return content;

  return (
    <Pressable testID={testID} onPress={onPress} style={({ pressed }) => [pressed && styles.pressed]}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.s8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  category: {
    ...typography.small,
    color: colorSystem.primary,
    backgroundColor: colors.primaryTint,
    paddingHorizontal: spacing.s8,
    paddingVertical: spacing.s4,
    borderRadius: 999,
  },
  price: {
    ...typography.headingM,
    color: colorSystem.secondary,
  },
  name: {
    ...typography.headingM,
    color: colorSystem.text,
  },
  description: {
    ...typography.body,
    color: colorSystem.textMuted,
  },
  pressed: {
    opacity: 0.9,
  },
});
