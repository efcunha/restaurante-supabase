import { Alert, BackHandler } from 'react-native';

export const confirmLogout = (onLogout: () => void) => {
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
