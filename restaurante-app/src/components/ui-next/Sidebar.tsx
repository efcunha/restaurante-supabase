import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colorSystem, spacing, typography } from '../../design-system';
import { colors } from '../../theme/colors';
type SidebarItem = {
  id: string;
  label: string;
  onPress: () => void;
  isActive?: boolean;
};

type SidebarProps = {
  title: string;
  items: SidebarItem[];
};

export function Sidebar({ title, items }: SidebarProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <ScrollView contentContainerStyle={styles.list}>
        {items.map((item) => (
          <Pressable
            key={item.id}
            onPress={item.onPress}
            style={({ pressed }) => [
              styles.item,
              item.isActive && styles.itemActive,
              pressed && styles.itemPressed,
            ]}
          >
            <Text style={[styles.itemLabel, item.isActive && styles.itemLabelActive]}>{item.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 270,
    backgroundColor: colorSystem.surface,
    borderRightWidth: 1,
    borderRightColor: colorSystem.border,
    paddingVertical: spacing.s16,
    paddingHorizontal: spacing.s12,
  },
  title: {
    ...typography.headingM,
    color: colorSystem.secondary,
    marginBottom: spacing.s16,
    paddingHorizontal: spacing.s8,
  },
  list: {
    gap: spacing.s8,
  },
  item: {
    borderRadius: 12,
    paddingHorizontal: spacing.s12,
    paddingVertical: spacing.s12,
  },
  itemActive: {
    backgroundColor: colors.primaryTint,
  },
  itemPressed: {
    opacity: 0.85,
  },
  itemLabel: {
    ...typography.body,
    color: colorSystem.textMuted,
    fontWeight: '600',
  },
  itemLabelActive: {
    color: colorSystem.primary,
  },
});
