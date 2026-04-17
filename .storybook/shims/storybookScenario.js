const DEFAULT_COMPANY = {
  id: 'company-storybook',
  name: 'Restaurante Storybook',
  document_type: 'cnpj',
  document: '12345678000190',
  contact_name: 'Storybook Admin',
  contact_phone: '11999887766',
  address: 'Rua das Flores, 100',
  city: 'Sao Paulo',
  state: 'SP',
  zip_code: '01310100',
};

const state = {
  scenario: 'default',
};

function makePendingPromise() {
  return new Promise(() => undefined);
}

export function setStorybookScenario(nextScenario) {
  state.scenario = nextScenario;
}

export function getStorybookScenario() {
  return state.scenario;
}

export function getMockCompany() {
  return { ...DEFAULT_COMPANY };
}

export function resolveAsyncResult(resultFactory) {
  if (state.scenario === 'loading') {
    return makePendingPromise();
  }

  if (state.scenario === 'error') {
    return Promise.resolve({ data: null, error: { message: 'Falha simulada no Storybook.' } });
  }

  return Promise.resolve(resultFactory());
}
