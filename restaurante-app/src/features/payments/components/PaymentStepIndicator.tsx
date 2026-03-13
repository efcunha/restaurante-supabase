import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../theme/colors';
import { PaymentStepIndicatorProps } from '../types';

export function PaymentStepIndicator({ activeStep, steps }: PaymentStepIndicatorProps) {
  return (
    <View style={styles.container}>
      {steps.map((label, index) => {
        const isDone = index < activeStep;
        const isActive = index === activeStep;

        return (
          <View key={label} style={styles.stepWrapper}>
            {index > 0 && <View style={[styles.line, (isDone || isActive) && styles.lineDone]} />}
            <View style={[styles.circle, isDone && styles.circleDone, isActive && styles.circleActive]}>
              {isDone ? (
                <Ionicons name="checkmark" size={14} color={colors.white} />
              ) : (
                <Text style={[styles.circleText, isActive && styles.circleTextActive]}>{index + 1}</Text>
              )}
            </View>
            <Text style={[styles.label, isActive && styles.labelActive]}>{label}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  stepWrapper: {
    alignItems: 'center',
    flex: 1,
    position: 'relative',
  },
  line: {
    position: 'absolute',
    top: 13,
    right: '50%',
    left: '-50%',
    height: 2,
    backgroundColor: colors.border,
    zIndex: 0,
  },
  lineDone: {
    backgroundColor: colors.success,
  },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  circleDone: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  circleActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  circleText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.textSecondary,
  },
  circleTextActive: {
    color: colors.white,
  },
  label: {
    fontSize: 11,
    marginTop: 4,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  labelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
});