import React from 'react';
import { getStorybookScenario } from './storybookScenario.js';

function makePendingPromise() {
  return new Promise(() => undefined);
}

export function useAuth() {
  const scenario = getStorybookScenario();

  return {
    user: {
      uid: 'storybook-user',
      id: 'storybook-user',
      nome: 'Storybook Admin',
      email: 'storybook@restaurante.local',
      funcao: 'admin',
      companyId: 'company-storybook',
    },
    role: 'admin',
    loading: false,
    login: async () => {
      if (scenario === 'loading') {
        return makePendingPromise();
      }

      if (scenario === 'error') {
        throw new Error('Credenciais invalidas para Storybook.');
      }

      return true;
    },
    logout: async () => undefined,
    register: async () => ({ success: true }),
    sessionKey: 1,
    hasPermission: () => true,
    Permissions: {},
    refreshCustomClaims: async () => undefined,
    getCustomClaims: () => null,
    mfaResolver: null,
    setMfaResolver: () => undefined,
    loginWithBiometric: async () => {
      if (scenario === 'error') {
        return { success: false, error: 'Biometria indisponivel no Storybook.' };
      }

      if (scenario === 'loading') {
        return makePendingPromise();
      }

      return { success: true };
    },
    biometricAvailable: true,
    biometricType: 'Biometria',
    isPasswordRecovery: false,
    clearPasswordRecovery: async () => undefined,
    initError: null,
    debugLog: [],
  };
}

export function AuthProvider({ children }) {
  return React.createElement(React.Fragment, null, children);
}

export default {
  useAuth,
  AuthProvider,
};
