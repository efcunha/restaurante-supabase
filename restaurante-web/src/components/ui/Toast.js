import React, { useEffect, useRef } from 'react';
import { Text, StyleSheet, Animated, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
// ─── Web: Componente HTML puro para compatibilidade total com Playwright ───────
function ToastWeb({ visible, message, type = 'success', onHide }) {
  const config = {
    success: { bg: colors.success },
    error: { bg: colors.danger },
    info: { bg: colors.primary },
    warning: { bg: colors.warning },
  };
  const bg = (config[type] || config.info).bg;

  useEffect(() => {
    if (visible) {
      console.log('[Toast][Web] Showing toast:', message);
      const timer = setTimeout(() => {
        console.log('[Toast][Web] Auto-hiding');
        if (onHide) onHide();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!visible) return null;

  // Renderiza div nativo - sem Animated, sem opacity=0, visível imediatamente
  return React.createElement(
    'div',
    {
      role: 'status',
      'data-testid': 'toast-container',
      style: {
        position: 'fixed',
        top: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        backgroundColor: bg,
        color: colors.white,
        padding: '16px 24px',
        borderRadius: 12,
        fontSize: 16,
        fontWeight: '600',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        minWidth: 200,
        maxWidth: 500,
        pointerEvents: 'all',
      },
    },
    React.createElement('span', null, message)
  );
}

// ─── Mobile: Componente animado original ──────────────────────────────────────
export default function Toast({ visible, message, type = 'success', onHide }) {
  // No web, usa componente HTML puro
  if (Platform.OS === 'web') {
    return React.createElement(ToastWeb, { visible, message, type, onHide });
  }

  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const config = {
    success: { bg: colors.success, icon: 'checkmark-circle' },
    error: { bg: colors.danger, icon: 'alert-circle' },
    info: { bg: colors.primary, icon: 'information-circle' },
    warning: { bg: colors.warning, icon: 'warning' }
  };

  const currentConfig = config[type] || config.info;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 50,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start();

      const timer = setTimeout(() => {
        hide();
      }, 3000);

      return () => clearTimeout(timer);
    } else {
      hide();
    }
  }, [visible]);

  const hide = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start(() => {
      if (onHide && visible) onHide();
    });
  };

  if (!visible) return null;

  return (
    <Animated.View
      accessibilityRole="alert"
      testID="toast-container"
      style={[
        styles.container,
        { backgroundColor: currentConfig.bg, transform: [{ translateY }], opacity }
      ]}
    >
      <Ionicons name={currentConfig.icon} size={24} color={colors.white} />
      <Text style={styles.message}>{message}</Text>
      <TouchableOpacity onPress={hide}>
        <Ionicons name="close" size={20} color="rgba(255,255,255,0.8)" />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    gap: 12,
  },
  message: {
    flex: 1,
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  }
});
