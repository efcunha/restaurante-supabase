import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colorSystem, typography } from '../../design-system';

type AvatarProps = {
  name: string;
  size?: number;
};

export function Avatar({ name, size = 40 }: AvatarProps) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={styles.text}>{initials || '?'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    backgroundColor: '#E2F4F8',
    borderWidth: 1,
    borderColor: colorSystem.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    ...typography.small,
    color: colorSystem.primary,
    fontWeight: '700',
  },
});
