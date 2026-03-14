import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colorSystem, radius, spacing, typography } from '../../design-system';
type TabItem = {
  key: string;
  label: string;
};

type TabsProps = {
  items: TabItem[];
  activeKey: string;
  onChange: (key: string) => void;
};

export function Tabs({ items, activeKey, onChange }: TabsProps) {
  return (
    <View style={styles.row}>
      {items.map((item) => {
        const active = item.key === activeKey;
        return (
          <Pressable
            key={item.key}
            onPress={() => onChange(item.key)}
            style={({ pressed }) => [styles.tab, active && styles.tabActive, pressed && styles.pressed]}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.s8,
    flexWrap: 'wrap',
  },
  tab: {
    paddingHorizontal: spacing.s12,
    paddingVertical: spacing.s8,
    borderRadius: radius.medium,
    borderWidth: 1,
    borderColor: colorSystem.border,
    backgroundColor: colorSystem.surface,
  },
  tabActive: {
    borderColor: colorSystem.primary,
    backgroundColor: colors.primaryTint,
  },
  label: {
    ...typography.small,
    color: colorSystem.textMuted,
    fontWeight: '600',
  },
  labelActive: {
    color: colorSystem.primary,
  },
  pressed: {
    opacity: 0.85,
  },
});
