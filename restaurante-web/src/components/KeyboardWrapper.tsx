import React from 'react';
import { 
  KeyboardAvoidingView, 
  Platform, 
  StyleSheet, 
  TouchableWithoutFeedback,
  View,
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
  const isWeb = Platform.OS === 'web';

  return (
    <KeyboardAvoidingView
      style={[styles.container, style]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0} // Ajuste conforme necessário se houver header customizado
    >
      {isWeb ? (
        <View style={styles.flex}>{children}</View>
      ) : (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.flex}>{children}</View>
        </TouchableWithoutFeedback>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
});
