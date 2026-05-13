import React, { memo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../../../theme/colors';
import { PaymentMode } from '../types';

interface PaymentModeSelectorProps {
  mode: PaymentMode;
  onChangeMode: (mode: PaymentMode) => void;
  showExternal: boolean;
  useUiNext?: boolean;
}

interface ModeOption {
  key: PaymentMode;
  label: string;
}

export const PaymentModeSelector = memo(function PaymentModeSelector({
  mode,
  onChangeMode,
  showExternal,
  useUiNext: _useUiNext = true,
}: PaymentModeSelectorProps) {
  const options: ModeOption[] = [{ key: 'normal', label: 'Normal' }];
  if (showExternal) options.push({ key: 'external_pos', label: 'Maquininha Externa' });

  if (options.length <= 1) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Modo de recebimento:</Text>
      <View style={styles.row}>
        {options.map((opt) => {
          const isActive = mode === opt.key;
          return (
            <TouchableOpacity
              key={opt.key}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => onChangeMode(opt.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 6,
    fontWeight: '500',
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  tabActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  tabTextActive: {
    color: '#FFF',
  },
});
