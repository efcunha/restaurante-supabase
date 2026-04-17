import { colors, radius, spacing } from '@restaurante/tokens';
import React from 'react';
import { Modal as NativeModal, Pressable, View } from 'react-native';

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function Modal({ visible, onClose, children }: ModalProps): React.JSX.Element {
  return (
    <NativeModal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.4)',
          justifyContent: 'center',
          padding: spacing.xl,
        }}
      >
        <View
          style={{
            backgroundColor: colors.neutral[0],
            borderRadius: radius.lg,
            padding: spacing.lg,
          }}
        >
          {children}
        </View>
      </Pressable>
    </NativeModal>
  );
}
