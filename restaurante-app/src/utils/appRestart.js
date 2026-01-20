import { Platform, Alert, BackHandler } from 'react-native';

/**
 * Força reinicialização completa do app
 * Solução definitiva para problemas de logout/tela branca
 */
export const forceAppRestart = async () => {
  try {
    if (Platform.OS === 'android') {
      // Método 1: Tentar usar expo-updates
      try {
        const { Updates } = require('expo-updates');
        await Updates.reloadAsync();
        return;
      } catch (updateError) {
        console.log('expo-updates não disponível, usando método alternativo');
      }
      
      // Método 2: Fechar app no Android
      try {
        BackHandler.exitApp();
        return;
      } catch (backError) {
        console.log('BackHandler.exitApp falhou');
      }
      
      // Método 3: Tentar RNRestart se disponível
      try {
        const RNRestart = require('react-native-restart');
        RNRestart.Restart();
        return;
      } catch (restartError) {
        console.log('react-native-restart não disponível');
      }
    }
    
    // Fallback: Mostrar alerta para reiniciar manualmente
    Alert.alert(
      'Reiniciar App', 
      'Por favor, feche e abra o app novamente para completar o logout.',
      [{ text: 'OK' }]
    );
    
  } catch (error) {
    console.error('Erro ao reiniciar app:', error);
    Alert.alert(
      'Reiniciar App', 
      'Por favor, feche e abra o app novamente.',
      [{ text: 'OK' }]
    );
  }
};

/**
 * Logout com reinicialização forçada
 * Garante que o app volte ao estado inicial
 */
export const logoutWithRestart = async (firebaseSignOut) => {
  try {
    // 1. Fazer signOut do Firebase primeiro
    await firebaseSignOut();
    
    // 2. Aguardar um pouco para garantir que o signOut foi processado
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 3. Forçar reinicialização completa
    await forceAppRestart();
    
  } catch (error) {
    console.error('Erro no logout com restart:', error);
    // Mesmo com erro, tentar reiniciar
    await forceAppRestart();
  }
};
