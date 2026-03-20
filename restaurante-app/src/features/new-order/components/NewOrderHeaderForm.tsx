import React, { memo } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colorSystem, radius, spacing, typography } from '../../../design-system';
import { NewOrderHeaderFormProps } from '../types';

export const NewOrderHeaderForm = memo(function NewOrderHeaderForm({
  clientName,
  onClientNameChange,
  mesa,
  onMesaChange,
  onRefresh,
  isRefreshing,
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

        <View style={styles.refreshColumn}>
          <Text style={styles.label}>Atualizar</Text>
          <TouchableOpacity
            accessibilityLabel="Atualizar cardápio"
            disabled={isRefreshing}
            onPress={onRefresh}
            style={[styles.refreshButton, isRefreshing ? styles.refreshButtonDisabled : null]}
          >
            {isRefreshing ? (
              <ActivityIndicator color={colorSystem.primary} size="small" />
            ) : (
              <Ionicons color={colorSystem.primary} name="refresh" size={18} />
            )}
          </TouchableOpacity>
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
  refreshColumn: {
    width: 56,
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
    paddingVertical: spacing.s8,
  },
  refreshButton: {
    alignItems: 'center',
    backgroundColor: colorSystem.surface,
    borderColor: colorSystem.border,
    borderRadius: radius.medium,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
  },
  refreshButtonDisabled: {
    opacity: 0.7,
  },
});