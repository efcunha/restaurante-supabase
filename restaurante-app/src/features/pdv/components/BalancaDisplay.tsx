import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ScaleBridgeResult, ScaleReadingStatus } from '../types';
import { colors } from '../../../theme/colors';

interface BalancaDisplayProps {
  status: ScaleReadingStatus;
  lastResult: ScaleBridgeResult | null;
  isReading: boolean;
  isPolling: boolean;
  onCaptureCurrentWeight: () => void;
  onCaptureStableWeight: () => void;
  onStartPolling: () => void;
  onStopPolling: () => void;
  onApplyTare: () => void;
  onUseManualFallback: () => void;
}

function getStatusLabel(status: ScaleReadingStatus): string {
  switch (status) {
    case 'not_initialized':
      return 'Nao inicializada';
    case 'connecting':
      return 'Conectando';
    case 'ready':
      return 'Pronta';
    case 'reading':
      return 'Lendo peso';
    case 'stable':
      return 'Leitura estavel';
    case 'unstable':
      return 'Leitura instavel';
    case 'timeout':
      return 'Timeout';
    case 'unavailable':
      return 'Indisponivel';
    case 'error':
      return 'Erro';
    default:
      return 'Aguardando';
  }
}

export function BalancaDisplay({
  status,
  lastResult,
  isReading,
  isPolling,
  onCaptureCurrentWeight,
  onCaptureStableWeight,
  onStartPolling,
  onStopPolling,
  onApplyTare,
  onUseManualFallback,
}: BalancaDisplayProps) {
  const reading = lastResult?.reading;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Balanca</Text>
      <Text style={styles.status}>Status: {getStatusLabel(status)}</Text>

      {reading ? (
        <View style={styles.readingBox}>
          <Text style={styles.weight}>{reading.weightKg.toFixed(3)} kg</Text>
          <Text style={styles.readingMeta}>{reading.isStable ? 'Estavel' : 'Instavel'}</Text>
        </View>
      ) : (
        <Text style={styles.readingMeta}>Sem leitura recente</Text>
      )}

      {isReading && (
        <View style={styles.spinnerRow}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.spinnerText}>Consultando bridge...</Text>
        </View>
      )}

      {!!lastResult?.message && <Text style={styles.message}>{lastResult.message}</Text>}

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={onCaptureCurrentWeight}>
          <Text style={styles.actionBtnText}>Ler peso</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={onCaptureStableWeight}>
          <Text style={styles.actionBtnText}>Peso estavel</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.secondaryBtn} onPress={isPolling ? onStopPolling : onStartPolling}>
          <Text style={styles.secondaryBtnText}>{isPolling ? 'Parar polling' : 'Iniciar polling'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={onApplyTare}>
          <Text style={styles.secondaryBtnText}>Tarar</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.fallbackBtn} onPress={onUseManualFallback}>
        <Text style={styles.fallbackBtnText}>Usar fallback manual</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    backgroundColor: colors.white,
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  status: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  readingBox: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 10,
    padding: 10,
  },
  weight: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  readingMeta: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  spinnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  spinnerText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  message: {
    fontSize: 13,
    color: colors.text,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  actionBtnText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  secondaryBtnText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  fallbackBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.warning,
    paddingVertical: 10,
    alignItems: 'center',
  },
  fallbackBtnText: {
    color: colors.warning,
    fontSize: 13,
    fontWeight: '700',
  },
});
