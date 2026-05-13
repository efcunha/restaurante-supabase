import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { Button } from '../components/ui-next/Button';
import { borderRadius, borderWidth, fontSizes, fontWeights, spacing } from '../design-system';
import { colors } from '../theme/colors';

export type StateViewState = 'loading' | 'empty' | 'error' | 'ready' | 'success';

type StateViewProps = {
  state: StateViewState;
  message?: string;
  errorMessage?: string | null;
  details?: string;
  onRetry?: () => void;
  skeletonRows?: number;
  loadingComponent?: React.ReactNode;
  children?: React.ReactNode;
  style?: ViewStyle;
};

export function StateView({
  state,
  message,
  errorMessage,
  details,
  onRetry,
  skeletonRows = 4,
  loadingComponent,
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

  if (state === 'ready' || state === 'success') {
    return <>{children}</>;
  }

  if (state === 'loading') {
    return (
      <View
        style={[styles.container, style]}
        accessibilityLabel="Carregando dados"
      >
        {loadingComponent ? (
          loadingComponent
        ) : (
          Array.from({ length: Math.max(1, skeletonRows) }).map((_, index) => (
            <Animated.View
              key={`skeleton-${index}`}
              style={[styles.skeletonRow, { opacity: pulse }]}
            />
          ))
        )}
      </View>
    );
  }

  if (state === 'error') {
    return (
      <View
        style={[styles.container, style]}
        accessibilityLabel="Erro ao carregar dados"
      >
        <Text style={styles.message}>{errorMessage ?? message ?? 'Nao foi possivel carregar os dados.'}</Text>
        {!!details && <Text style={styles.details}>{details}</Text>}
        {!!onRetry && (
          <Button label="Tentar novamente" onPress={onRetry} variant="secondary" />
        )}
      </View>
    );
  }

  return (
    <View
      style={[styles.container, style]}
      accessibilityLabel="Nenhum dado encontrado"
    >
      <Text style={styles.message}>{message ?? 'Nenhum registro encontrado.'}</Text>
      {!!details && <Text style={styles.details}>{details}</Text>}
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
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.white,
    padding: spacing[4],
    gap: spacing[3],
  },
  message: {
    color: colors.textSecondary,
    fontSize: fontSizes.base,
    fontWeight: fontWeights.medium,
  },
  details: {
    color: colors.textSecondary,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.regular,
  },
  linkButton: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing[2],
  },
  linkLabel: {
    color: colors.primary,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
  },
  skeletonRow: {
    height: 16,
    borderRadius: borderRadius.md,
    backgroundColor: '#E3E8EE',
  },
});
