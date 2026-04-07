import { isFeatureEnabled } from '../../../config/featureFlags';
import { ScaleBridgeResult } from '../types';

function getScaleBridgeBaseUrl(): string {
  return (process.env.EXPO_PUBLIC_SCALE_BRIDGE_URL || '').replace(/\/$/, '');
}

export async function readStableScaleWeight(timeoutMs = 5000): Promise<ScaleBridgeResult> {
  if (!isFeatureEnabled('pdv_enabled') || !isFeatureEnabled('pdv_scale_enabled')) {
    return {
      status: 'error',
      message: 'Leitura de balanca desabilitada por feature flag.',
    };
  }

  const bridgeUrl = getScaleBridgeBaseUrl();
  if (!bridgeUrl) {
    return {
      status: 'error',
      message: 'EXPO_PUBLIC_SCALE_BRIDGE_URL nao configurada.',
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${bridgeUrl}/peso/estavel`, {
      method: 'GET',
      signal: controller.signal,
    });

    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      return {
        status: 'error',
        message: typeof payload.error === 'string' ? payload.error : 'Falha ao consultar bridge da balanca.',
      };
    }

    const weightKg = Number(payload.peso_kg ?? payload.weight_kg ?? 0);
    const isStable = Boolean(payload.estavel ?? payload.is_stable);

    return {
      status: isStable ? 'stable' : 'unstable',
      message: isStable ? 'Peso estavel capturado.' : 'Leitura instavel detectada.',
      reading: {
        weightKg,
        isStable,
        capturedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      return {
        status: 'timeout',
        message: 'Timeout ao consultar bridge da balanca.',
      };
    }

    return {
      status: 'error',
      message: 'Erro inesperado na leitura da balanca.',
    };
  } finally {
    clearTimeout(timer);
  }
}
