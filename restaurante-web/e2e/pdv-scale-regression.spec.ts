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
    disableFeature('devSimulators');
    Reflect.deleteProperty(process.env, 'EXPO_PUBLIC_SCALE_BRIDGE_URL');
    Reflect.deleteProperty(globalThis, 'window');
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

  test('BAL-06: leitura instavel retorna status unstable sem confirmar peso', async () => {
    process.env.EXPO_PUBLIC_SCALE_BRIDGE_URL = 'http://scale-bridge.local';

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      return {
        ok: true,
        json: async () => ({
          peso_kg: 0.842,
          estavel: false,
        }),
      } as Response;
    }) as typeof fetch;

    try {
      const result = await readStableScaleWeight(2000);
      expect(result.status).toBe('unstable');
      expect(result.reading?.weightKg).toBeCloseTo(0.842, 3);
      expect(result.reading?.isStable).toBe(false);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('BAL-07: erro inesperado do bridge retorna status error', async () => {
    process.env.EXPO_PUBLIC_SCALE_BRIDGE_URL = 'http://scale-bridge.local';

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      throw new Error('Bridge failure');
    }) as typeof fetch;

    try {
      const result = await readStableScaleWeight(2000);
      expect(result.status).toBe('error');
      expect(result.message).toContain('Erro inesperado');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('BAL-08: feature flag de balanca desligada bloqueia chamada ao bridge', async () => {
    process.env.EXPO_PUBLIC_SCALE_BRIDGE_URL = 'http://scale-bridge.local';
    disableFeature('pdv_scale_enabled');

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      throw new Error('Nao deveria chamar bridge com flag desligada');
    }) as typeof fetch;

    try {
      const result = await readStableScaleWeight(2000);
      expect(result.status).toBe('error');
      expect(result.message).toContain('feature flag');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('BAL-01 DEV: simulador local atende leitura estavel sem bridge configurado', async () => {
    enableFeature('devSimulators');

    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        __DEV_SCALE_SIMULATOR__: {
          getSnapshot: () => ({
            rawGrams: 1250,
            netGrams: 1250,
            tareGrams: 0,
            status: 'stable',
            toledoString: 'P:  1.250kg\r\n',
            updatedAt: new Date().toISOString(),
          }),
          applyTare: () => ({
            rawGrams: 1250,
            netGrams: 1250,
            tareGrams: 0,
            status: 'stable',
            toledoString: 'P:  1.250kg\r\n',
            updatedAt: new Date().toISOString(),
          }),
        },
      },
    });

    const result = await readStableScaleWeight(2000);
    expect(result.status).toBe('stable');
    expect(result.source).toBe('simulator');
    expect(result.reading?.weightKg).toBeCloseTo(1.25, 3);
    expect(result.reading?.raw).toContain('1.250kg');
  });
});
