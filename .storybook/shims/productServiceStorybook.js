import { getStorybookScenario } from './storybookScenario.js';

function makePendingPromise() {
  return new Promise(() => undefined);
}

export async function criarProduto() {
  if (getStorybookScenario() === 'loading') {
    return makePendingPromise();
  }

  if (getStorybookScenario() === 'error') {
    return { success: false, error: 'Falha simulada ao cadastrar produto.' };
  }

  return { success: true };
}

export default { criarProduto };
