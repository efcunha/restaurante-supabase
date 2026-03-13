import React, { memo } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colorSystem, radius, spacing, typography } from '../../../design-system';
import { NewOrderHeaderFormProps } from '../types';

export const NewOrderHeaderForm = memo(function NewOrderHeaderForm({
  clientName,
  onClientNameChange,
  mesa,
  onMesaChange,
}: NewOrderHeaderFormProps) {
  return (
    <View style={styles.container}>
      <View style={styles.fieldsRow}>
        <View style={styles.clientFieldColumn}>
          <Text style={styles.label}>Nome do Cliente:</Text>
          <TextInput
            style={styles.input}
            placeholder="Digite o nome"
            value={clientName}
            onChangeText={onClientNameChange}
            placeholderTextColor={colorSystem.textMuted}
          />
        </View>

        <View style={styles.mesaFieldColumn}>
          <Text style={styles.label}>Mesa:</Text>
          <TextInput
            style={styles.input}
            placeholder="Nº"
            value={mesa}
            onChangeText={onMesaChange}
            placeholderTextColor={colorSystem.textMuted}
            keyboardType="numeric"
          />
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.s16,
  },
  fieldsRow: {
    flexDirection: 'row',
    marginBottom: spacing.s8,
  },
  clientFieldColumn: {
    flex: 1,
    marginRight: spacing.s12,
  },
  mesaFieldColumn: {
    width: 80,
  },
  label: {
    ...typography.body,
    fontWeight: '700',
    color: colorSystem.text,
    marginBottom: spacing.s4,
  },
  input: {
    backgroundColor: colorSystem.surface,
    borderRadius: radius.medium,
    borderWidth: 1,
    borderColor: colorSystem.border,
    color: colorSystem.text,
    fontSize: 15,
    minHeight: 44,
    paddingHorizontal: spacing.s12,
    paddingVertical: spacing.s10,
  },
});