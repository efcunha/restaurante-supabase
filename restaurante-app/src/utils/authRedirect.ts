import { Platform } from 'react-native';

const PASSWORD_RESET_PATH = 'reset-password';
const APP_SCHEME = 'restaurante';

export function getPasswordResetRedirectUrl() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.origin}/${PASSWORD_RESET_PATH}`;
  }

  return `${APP_SCHEME}://${PASSWORD_RESET_PATH}`;
}