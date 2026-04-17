import { getStorybookScenario } from './storybookScenario.js';

function makePendingPromise() {
  return new Promise(() => undefined);
}

export const CompanySettingsService = {
  async getSettings() {
    if (getStorybookScenario() === 'loading') {
      return makePendingPromise();
    }

    if (getStorybookScenario() === 'error') {
      throw new Error('Falha simulada ao carregar configuracoes.');
    }

    if (getStorybookScenario() === 'empty') {
      return {};
    }

    return { businessDayCutoff: 6 };
  },
  async updateSettings() {
    if (getStorybookScenario() === 'loading') {
      return makePendingPromise();
    }

    if (getStorybookScenario() === 'error') {
      throw new Error('Falha simulada ao salvar configuracoes.');
    }

    return { success: true };
  },
};

export default { CompanySettingsService };
