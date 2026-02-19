import { Alert, BackHandler, Platform } from 'react-native';

export const confirmLogout = (onLogout: () => void) => {
  if (Platform.OS === 'web') {
    if (window.confirm('Deseja realmente sair?')) {
      if (onLogout) {
        onLogout();
      }
    }
    return;
  }

  Alert.alert(
    'Sair',
    'Deseja realmente sair?',
    [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        onPress: () => {
          if (onLogout) {
            onLogout();
          }
        },
        style: 'destructive'
      }
    ]
  );
};

export const exitApp = () => {
    BackHandler.exitApp();
};
