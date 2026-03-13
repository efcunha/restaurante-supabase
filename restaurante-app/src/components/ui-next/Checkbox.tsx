import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colorSystem, radius, spacing, typography } from '../../design-system';

type CheckboxProps = {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
};

export function Checkbox({ checked, label, onChange }: CheckboxProps) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={() => onChange(!checked)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={[styles.box, checked && styles.boxChecked]}>
        {checked && <View style={styles.dot} />}
      </View>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s8,
    minHeight: 40,
  },
  pressed: {
    opacity: 0.84,
  },
  box: {
    width: 22,
    height: 22,
    borderWidth: 1,
    borderColor: colorSystem.border,
    borderRadius: radius.small,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colorSystem.surface,
  },
  boxChecked: {
    borderColor: colorSystem.primary,
    backgroundColor: '#E2F4F8',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colorSystem.primary,
  },
  label: {
    ...typography.body,
    color: colorSystem.text,
  },
});
