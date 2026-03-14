import React, { useEffect, useRef } from 'react';
import { Text, StyleSheet, Animated, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

export default function Toast({ visible, message, type = 'success', onHide }) {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  // Colors config
  const config = {
    success: { bg: colors.success, icon: 'checkmark-circle' },
    error: { bg: colors.danger, icon: 'alert-circle' },
    info: { bg: colors.primary, icon: 'information-circle' },
    warning: { bg: colors.warning, icon: 'warning' }
  };

  const currentConfig = config[type] || config.info;

  useEffect(() => {
    if (visible) {
      console.log('[Toast] Showing toast:', message, 'type:', type);
      
      // No web, mostrar imediatamente sem animação para compatibilidade com testes
      if (Platform.OS === 'web') {
        translateY.setValue(50);
        opacity.setValue(1);
        console.log('[Toast] Web: Showing immediately without animation');
      } else {
        // Mobile: usar animação
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
      }

      // Auto hide
      const timer = setTimeout(() => {
        console.log('[Toast] Auto-hiding after 3s');
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
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: Platform.OS !== 'web',
      })
    ]).start(() => {
      if (onHide && visible) onHide();
    });
  };

  if (!visible) return null;

  const ToastContent = (
    <Animated.View 
      accessibilityRole="alert"
      testID="toast-container"
      style={[
      styles.container, 
      { backgroundColor: currentConfig.bg, transform: [{ translateY }], opacity }
    ]}>
      <Ionicons name={currentConfig.icon} size={24} color="#FFF" />
      <Text style={styles.message}>{message}</Text>
      <TouchableOpacity onPress={hide}>
        <Ionicons name="close" size={20} color="rgba(255,255,255,0.8)" />
      </TouchableOpacity>
    </Animated.View>
  );

  if (Platform.OS === 'web') {
    return React.createElement('div', 
      { role: 'status', style: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 9999, pointerEvents: 'none' } },
      ToastContent
    );
  }

  return ToastContent;
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    gap: 12,
  },
  message: {
    flex: 1,
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  }
});

