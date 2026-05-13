import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { Button } from '../components/ui-next/Button';
import { borderRadius, borderWidth, designColors, fontSizes, fontWeights, spacing } from '../design-system';

export type StateViewState = 'loading' | 'empty' | 'error' | 'ready';

type StateViewProps = {
  state: StateViewState;
  message?: string;
  onRetry?: () => void;
  skeletonRows?: number;
  children?: React.ReactNode;
  style?: ViewStyle;
};

export function StateView({
  state,
  message,
  onRetry,
  skeletonRows = 4,
  children,
  style,
}: StateViewProps) {
  const pulse = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    if (state !== 'loading') {
      pulse.stopAnimation();
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.45, duration: 650, useNativeDriver: true }),
      ]),
    );

    loop.start();
    return () => {
      loop.stop();
    };
  }, [pulse, state]);

  if (state === 'ready') {
    return <>{children}</>;
  }

  if (state === 'loading') {
    return (
      <View style={[styles.container, style]} accessibilityRole="status" accessibilityLabel="Carregando dados">
        {Array.from({ length: Math.max(1, skeletonRows) }).map((_, index) => (
          <Animated.View key={`skeleton-${index}`} style={[styles.skeletonRow, { opacity: pulse }]} />
        ))}
      </View>
    );
  }

  if (state === 'error') {
    return (
      <View style={[styles.container, style]} accessibilityRole="alert" accessibilityLabel="Erro ao carregar dados">
        <Text style={styles.message}>{message ?? 'Nao foi possivel carregar os dados.'}</Text>
        {!!onRetry && (
          <Button label="Tentar novamente" onPress={onRetry} variant="secondary" />
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, style]} accessibilityRole="summary" accessibilityLabel="Nenhum dado encontrado">
      <Text style={styles.message}>{message ?? 'Nenhum registro encontrado.'}</Text>
      {!!onRetry && (
        <Pressable onPress={onRetry} accessibilityRole="button" style={styles.linkButton}>
          <Text style={styles.linkLabel}>Atualizar</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: borderWidth.default,
    borderColor: designColors.border.subtle,
    borderRadius: borderRadius.lg,
    backgroundColor: designColors.surface.card,
    padding: spacing[4],
    gap: spacing[3],
  },
  message: {
    color: designColors.text.secondary,
    fontSize: fontSizes.base,
    fontWeight: fontWeights.medium,
  },
  linkButton: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing[2],
  },
  linkLabel: {
    color: designColors.primary[700],
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
  },
  skeletonRow: {
    height: 16,
    borderRadius: borderRadius.md,
    backgroundColor: designColors.neutral[200],
  },
});
