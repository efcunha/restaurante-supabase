import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

const { width } = Dimensions.get('window');

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
      // In
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 50, // Top offset
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start();

      // Auto hide
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
    <Animated.View style={[
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
