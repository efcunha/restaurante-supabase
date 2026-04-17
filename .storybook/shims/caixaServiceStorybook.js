import { getStorybookScenario } from './storybookScenario.js';

function makePendingPromise() {
  return new Promise(() => undefined);
}

async function resolveCaixaAction(errorMessage) {
  if (getStorybookScenario() === 'loading') {
    return makePendingPromise();
  }

  if (getStorybookScenario() === 'error') {
    throw new Error(errorMessage);
  }

  return { success: true };
}

const CaixaService = {
  async abrirCaixa() {
    return resolveCaixaAction('Falha simulada ao abrir caixa.');
  },
  async registrarReforco() {
    return resolveCaixaAction('Falha simulada ao registrar reforco.');
  },
  async registrarSangria() {
    return resolveCaixaAction('Falha simulada ao registrar sangria.');
  },
};

export default CaixaService;
