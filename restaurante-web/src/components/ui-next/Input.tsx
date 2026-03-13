import React from 'react';
import { StyleSheet, TextInput, TextInputProps, ViewStyle } from 'react-native';
import { colorSystem, radius, spacing, typography } from '../../design-system';

type InputProps = TextInputProps & {
  hasError?: boolean;
  containerStyle?: ViewStyle;
};

export function Input({ hasError = false, style, containerStyle, ...props }: InputProps) {
  return (
    <TextInput
      {...props}
      placeholderTextColor={colorSystem.textMuted}
      style={[styles.input, hasError && styles.inputError, containerStyle, style]}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    ...typography.body,
    color: colorSystem.text,
    backgroundColor: colorSystem.surface,
    borderWidth: 1,
    borderColor: colorSystem.border,
    borderRadius: radius.medium,
    paddingHorizontal: spacing.s12,
    paddingVertical: spacing.s12,
    minHeight: 44,
  },
  inputError: {
    borderColor: colorSystem.error,
  },
});
