import { BackHandler, Alert } from 'react-native';
import { signOut } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../config/firebaseConfig';

export const exitApp = () => {
  Alert.alert(
    'Sair',
    'Deseja realmente sair do aplicativo?',
    [
      { text: 'Cancelar', style: 'cancel' },
      { 
        text: 'Sair', 
        onPress: async () => {
          try {
            // Limpar TUDO antes de fechar
            await signOut(auth);
            await AsyncStorage.clear();
          } catch (error) {
            // Ignorar erros
          }
          // Fechar app
          BackHandler.exitApp();
        }, 
        style: 'destructive' 
      }
    ]
  );
};
