import React from 'react';
import { 
  KeyboardAvoidingView, 
  Platform, 
  StyleSheet, 
  Pressable, 
  Keyboard, 
  ViewStyle,
  StyleProp
} from 'react-native';

interface KeyboardWrapperProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  withScroll?: boolean; // Opção futura se quisermos embutir ScrollView aqui
}

export default function KeyboardWrapper({ children, style }: KeyboardWrapperProps) {
  return (
    <KeyboardAvoidingView
      style={[styles.container, style]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0} // Ajuste conforme necessário se houver header customizado
    >
      <Pressable onPress={Keyboard.dismiss} style={{ flex: 1 }}>
        {children}
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
