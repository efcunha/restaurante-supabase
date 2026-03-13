import React from 'react';
import { StyleSheet, Text, TextInput, View, ViewStyle } from 'react-native';
import { colorSystem, radius, spacing, typography } from '../../design-system';

type FormInputProps = {
  label: string;
  value: string;
  placeholder?: string;
  onChangeText: (value: string) => void;
  error?: string;
  helperText?: string;
  secureTextEntry?: boolean;
  style?: ViewStyle;
};

export function FormInput({
  label,
  value,
  placeholder,
  onChangeText,
  error,
  helperText,
  secureTextEntry,
  style,
}: FormInputProps) {
  return (
    <View style={style}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colorSystem.textMuted}
        secureTextEntry={secureTextEntry}
        style={[styles.input, !!error && styles.inputError]}
      />
      {!!error && <Text style={styles.errorText}>{error}</Text>}
      {!error && !!helperText && <Text style={styles.helperText}>{helperText}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    ...typography.small,
    color: colorSystem.text,
    marginBottom: spacing.s8,
  },
  input: {
    ...typography.body,
    color: colorSystem.text,
    backgroundColor: colorSystem.surface,
    borderWidth: 1,
    borderColor: colorSystem.border,
    borderRadius: radius.medium,
    paddingHorizontal: spacing.s12,
    paddingVertical: spacing.s12,
  },
  inputError: {
    borderColor: colorSystem.error,
  },
  helperText: {
    ...typography.small,
    color: colorSystem.textMuted,
    marginTop: spacing.s8,
  },
  errorText: {
    ...typography.small,
    color: colorSystem.error,
    marginTop: spacing.s8,
  },
});
