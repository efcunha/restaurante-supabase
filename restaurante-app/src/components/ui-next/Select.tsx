import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colorSystem, radius, spacing, typography } from '../../design-system';
import { colors } from '../../theme/colors';
type SelectOption = {
  label: string;
  value: string;
};

type SelectProps = {
  value?: string;
  placeholder?: string;
  options: SelectOption[];
  onSelect: (value: string) => void;
};

export function Select({ value, placeholder = 'Selecionar...', options, onSelect }: SelectProps) {
  const selectedLabel = options.find((o) => o.value === value)?.label;

  return (
    <View style={styles.wrapper}>
      <Text style={styles.current}>{selectedLabel || placeholder}</Text>
      <View style={styles.options}>
        {options.map((option) => {
          const isActive = option.value === value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onSelect(option.value)}
              style={({ pressed }) => [styles.option, isActive && styles.optionActive, pressed && styles.optionPressed]}
            >
              <Text style={[styles.optionLabel, isActive && styles.optionLabelActive]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderWidth: 1,
    borderColor: colorSystem.border,
    borderRadius: radius.medium,
    backgroundColor: colorSystem.surface,
    padding: spacing.s12,
    gap: spacing.s8,
  },
  current: {
    ...typography.body,
    color: colorSystem.text,
    fontWeight: '600',
  },
  options: {
    gap: spacing.s8,
  },
  option: {
    borderWidth: 1,
    borderColor: colorSystem.border,
    borderRadius: radius.small,
    paddingVertical: spacing.s8,
    paddingHorizontal: spacing.s12,
  },
  optionActive: {
    borderColor: colorSystem.primary,
    backgroundColor: colors.primaryTint,
  },
  optionPressed: {
    opacity: 0.86,
  },
  optionLabel: {
    ...typography.small,
    color: colorSystem.text,
  },
  optionLabelActive: {
    color: colorSystem.primary,
    fontWeight: '700',
  },
});
