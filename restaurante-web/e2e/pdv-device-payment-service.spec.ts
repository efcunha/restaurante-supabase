import { test, expect } from '@playwright/test';
import { enableFeature, disableFeature } from '../src/config/featureFlags';
import { initiateDevicePayment } from '../src/features/pdv/services/devicePaymentService';

test.describe('PDV maquininha service', () => {
  test.beforeEach(() => {
    enableFeature('pdv_enabled');
    enableFeature('pdv_devicePayment_enabled');
    delete process.env.EXPO_PUBLIC_PDV_DEVICE_SIMULATION;
    delete process.env.EXPO_PUBLIC_OPS_BASE_URL;
  });

  test.afterEach(() => {
    disableFeature('pdv_enabled');
    disableFeature('pdv_devicePayment_enabled');
    delete process.env.EXPO_PUBLIC_PDV_DEVICE_SIMULATION;
    delete process.env.EXPO_PUBLIC_OPS_BASE_URL;
  });

  test('TEF-08: endpoint indisponivel na iniciacao retorna erro operacional', async () => {
    process.env.EXPO_PUBLIC_OPS_BASE_URL = 'https://ops.example.com';

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      return {
        ok: false,
        json: async () => ({
          error: 'Servico de pagamento indisponivel no momento.',
        }),
      } as Response;
    }) as typeof fetch;

    try {
      const result = await initiateDevicePayment({
        companyId: 'company-123',
        comandaNumber: '321',
        amount: 25.9,
        paymentMethod: 'cartao_debito',
        idempotencyKey: 'company-123:321:1700000000:nonce',
      });

      expect(result.status).toBe('error');
      expect(result.message).toContain('indisponivel');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('TEF-09: EXPO_PUBLIC_OPS_BASE_URL ausente bloqueia chamada de rede', async () => {
    const originalFetch = globalThis.fetch;
    const fetchSpy = (async () => {
      throw new Error('Nao deveria chamar fetch sem EXPO_PUBLIC_OPS_BASE_URL');
    }) as typeof fetch;
    globalThis.fetch = fetchSpy;

    try {
      const result = await initiateDevicePayment({
        companyId: 'company-123',
        comandaNumber: '321',
        amount: 10,
        paymentMethod: 'cartao_credito',
        idempotencyKey: 'company-123:321:1700000001:nonce',
      });

      expect(result.status).toBe('error');
      expect(result.message).toContain('EXPO_PUBLIC_OPS_BASE_URL');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('TEF-10: feature flag desabilitada bloqueia fluxo de maquininha', async () => {
    process.env.EXPO_PUBLIC_OPS_BASE_URL = 'https://ops.example.com';
    disableFeature('pdv_devicePayment_enabled');

    const originalFetch = globalThis.fetch;
    const fetchSpy = (async () => {
      throw new Error('Nao deveria chamar fetch com flag desabilitada');
    }) as typeof fetch;
    globalThis.fetch = fetchSpy;

    try {
      const result = await initiateDevicePayment({
        companyId: 'company-123',
        comandaNumber: '321',
        amount: 10,
        paymentMethod: 'cartao_credito',
        idempotencyKey: 'company-123:321:1700000002:nonce',
      });

      expect(result.status).toBe('error');
      expect(result.message).toContain('feature flag');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
