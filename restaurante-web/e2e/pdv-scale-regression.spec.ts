import { test, expect } from '@playwright/test';
import { enableFeature, disableFeature } from '../src/config/featureFlags';
import { readStableScaleWeight } from '../src/features/pdv/services/scaleBridgeService';

test.describe('PDV balanca regressao', () => {
  test.beforeEach(() => {
    enableFeature('pdv_enabled');
    enableFeature('pdv_scale_enabled');
    disableFeature('pdv_devicePayment_enabled');
  });

  test.afterEach(() => {
    disableFeature('pdv_enabled');
    disableFeature('pdv_scale_enabled');
    disableFeature('pdv_devicePayment_enabled');
    delete process.env.EXPO_PUBLIC_SCALE_BRIDGE_URL;
  });

  test('leitura de peso estavel continua funcional com fluxo de maquininha desligado', async () => {
    process.env.EXPO_PUBLIC_SCALE_BRIDGE_URL = 'http://scale-bridge.local';

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      return {
        ok: true,
        json: async () => ({
          peso_kg: 1.275,
          estavel: true,
        }),
      } as Response;
    }) as typeof fetch;

    try {
      const result = await readStableScaleWeight(2000);
      expect(result.status).toBe('stable');
      expect(result.reading?.weightKg).toBeCloseTo(1.275, 3);
      expect(result.reading?.isStable).toBe(true);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('timeout de balanca permanece consistente (sem regressao por TEF)', async () => {
    process.env.EXPO_PUBLIC_SCALE_BRIDGE_URL = 'http://scale-bridge.local';

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      throw Object.assign(new Error('aborted'), { name: 'AbortError' });
    }) as typeof fetch;

    try {
      const result = await readStableScaleWeight(10);
      expect(result.status).toBe('timeout');
      expect(result.message).toContain('Timeout');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
