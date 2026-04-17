import { colors, radius, spacing, typography } from '@restaurante/tokens';
import React from 'react';
import { Text, TextInput, View } from 'react-native';

interface InputProps {
  label?: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  error?: string;
}

export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  error,
}: InputProps): React.JSX.Element {
  return (
    <View style={{ gap: spacing.xs }}>
      {label ? (
        <Text
          style={{ color: colors.neutral[800], fontSize: typography.size.sm, fontWeight: '600' }}
        >
          {label}
        </Text>
      ) : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        secureTextEntry={secureTextEntry}
        style={{
          borderWidth: 1,
          borderColor: error ? colors.danger : colors.neutral[300],
          borderRadius: radius.md,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          backgroundColor: colors.neutral[0],
        }}
      />
      {error ? (
        <Text style={{ color: colors.danger, fontSize: typography.size.xs }}>{error}</Text>
      ) : null}
    </View>
  );
}
