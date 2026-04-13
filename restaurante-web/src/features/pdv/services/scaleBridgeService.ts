import { isFeatureEnabled } from '../../../config/featureFlags';
import { ScaleBridgePort, ScaleBridgeResult, ScaleBridgeStatus } from '../types';

type ScaleSimulatorStatus = 'stable' | 'unstable' | 'tared' | 'zero';

type ScaleSimulatorSnapshot = {
  rawGrams: number;
  netGrams: number;
  tareGrams: number;
  status: ScaleSimulatorStatus;
  toledoString: string;
  updatedAt: string;
};

type ScaleSimulatorApi = {
  getSnapshot: () => ScaleSimulatorSnapshot;
  applyTare?: () => ScaleSimulatorSnapshot;
};

function isDevRuntime(): boolean {
  if (typeof __DEV__ !== 'undefined') {
    return __DEV__;
  }

  return process.env.NODE_ENV !== 'production';
}

function getScaleBridgeBaseUrl(): string {
  return (process.env.EXPO_PUBLIC_SCALE_BRIDGE_URL || '').replace(/\/$/, '');
}

function getScaleBridgeApiKey(): string {
  return process.env.SCALE_BRIDGE_API_KEY || '';
}

function getScaleSimulatorApi(): ScaleSimulatorApi | null {
  if (typeof window === 'undefined' || !isDevRuntime() || !isFeatureEnabled('devSimulators')) {
    return null;
  }

  const simulatorApi = (window as Window & { __DEV_SCALE_SIMULATOR__?: ScaleSimulatorApi }).__DEV_SCALE_SIMULATOR__;
  if (!simulatorApi || typeof simulatorApi.getSnapshot !== 'function') {
    return null;
  }

  return simulatorApi;
}

function mapSimulatorSnapshotToResult(snapshot: ScaleSimulatorSnapshot): ScaleBridgeResult {
  return {
    status: snapshot.status === 'unstable' ? 'unstable' : 'stable',
    message: snapshot.status === 'unstable' ? 'Leitura instavel detectada no simulador local.' : 'Peso estavel capturado no simulador local.',
    reading: {
      weightKg: Number(snapshot.netGrams / 1000),
      isStable: snapshot.status !== 'unstable',
      raw: snapshot.toledoString,
      capturedAt: snapshot.updatedAt,
    },
    source: 'simulator',
  };
}

function getBridgeHeaders(): Record<string, string> {
  const apiKey = getScaleBridgeApiKey();
  if (!apiKey) {
    return {};
  }

  return {
    'x-api-key': apiKey,
  };
}

function mapPayloadToReading(payload: Record<string, unknown>): { weightKg: number; isStable: boolean; raw: string | null } {
  return {
    weightKg: Number(payload.peso_kg ?? payload.weight_kg ?? 0),
    isStable: Boolean(payload.estavel ?? payload.is_stable),
    raw: typeof payload.raw === 'string' ? payload.raw : null,
  };
}

async function requestBridge(path: string, timeoutMs: number, method: 'GET' | 'POST' = 'GET'): Promise<Response> {
  const bridgeUrl = getScaleBridgeBaseUrl();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(`${bridgeUrl}${path}`, {
      method,
      headers: getBridgeHeaders(),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function readScaleWeight(timeoutMs = 3000): Promise<ScaleBridgeResult> {
  if (!isFeatureEnabled('pdv_enabled') || !isFeatureEnabled('pdv_scale_enabled')) {
    return {
      status: 'error',
      message: 'Leitura de balanca desabilitada por feature flag.',
    };
  }

  const simulatorApi = getScaleSimulatorApi();
  if (simulatorApi) {
    return mapSimulatorSnapshotToResult(simulatorApi.getSnapshot());
  }

  const bridgeUrl = getScaleBridgeBaseUrl();
  if (!bridgeUrl) {
    return {
      status: 'error',
      message: 'EXPO_PUBLIC_SCALE_BRIDGE_URL nao configurada.',
    };
  }

  try {
    const response = await requestBridge('/peso', timeoutMs);
    if (response.status === 204) {
      return {
        status: 'unavailable',
        message: 'Bridge sem leitura disponivel no momento.',
      };
    }

    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      return {
        status: response.status === 503 ? 'unavailable' : 'error',
        message: typeof payload.error === 'string' ? payload.error : 'Falha ao consultar bridge da balanca.',
      };
    }

    const reading = mapPayloadToReading(payload);
    return {
      status: reading.isStable ? 'stable' : 'unstable',
      message: reading.isStable ? 'Leitura de peso recebida.' : 'Leitura instavel detectada.',
      reading: {
        weightKg: reading.weightKg,
        isStable: reading.isStable,
        raw: reading.raw,
        capturedAt: new Date().toISOString(),
      },
      source: 'automatic',
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
  }
}

export async function readStableScaleWeight(timeoutMs = 5000): Promise<ScaleBridgeResult> {
  if (!isFeatureEnabled('pdv_enabled') || !isFeatureEnabled('pdv_scale_enabled')) {
    return {
      status: 'error',
      message: 'Leitura de balanca desabilitada por feature flag.',
    };
  }

  const simulatorApi = getScaleSimulatorApi();
  if (simulatorApi) {
    return mapSimulatorSnapshotToResult(simulatorApi.getSnapshot());
  }

  const bridgeUrl = getScaleBridgeBaseUrl();
  if (!bridgeUrl) {
    return {
      status: 'error',
      message: 'EXPO_PUBLIC_SCALE_BRIDGE_URL nao configurada.',
    };
  }

  try {
    const response = await requestBridge('/peso/estavel', timeoutMs);

    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      return {
        status: response.status === 408 ? 'timeout' : response.status === 503 ? 'unavailable' : 'error',
        message: typeof payload.error === 'string' ? payload.error : 'Falha ao consultar bridge da balanca.',
      };
    }

    const reading = mapPayloadToReading(payload);

    return {
      status: reading.isStable ? 'stable' : 'unstable',
      message: reading.isStable ? 'Peso estavel capturado.' : 'Leitura instavel detectada.',
      reading: {
        weightKg: reading.weightKg,
        isStable: reading.isStable,
        raw: reading.raw,
        capturedAt: new Date().toISOString(),
      },
      source: 'automatic',
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
  }
}

export async function getScaleStatus(timeoutMs = 3000): Promise<ScaleBridgeStatus> {
  const simulatorApi = getScaleSimulatorApi();
  if (simulatorApi) {
    const snapshot = simulatorApi.getSnapshot();
    return {
      serialOpen: true,
      port: 'SIMULATOR',
      baud: 9600,
      protocol: 'toledo-simulator',
      lastReading: snapshot.toledoString,
      error: null,
      timestamp: snapshot.updatedAt,
    };
  }

  const bridgeUrl = getScaleBridgeBaseUrl();
  if (!bridgeUrl) {
    return {
      serialOpen: false,
      error: 'EXPO_PUBLIC_SCALE_BRIDGE_URL nao configurada.',
      timestamp: new Date().toISOString(),
    };
  }

  try {
    const response = await requestBridge('/status', timeoutMs);
    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;

    if (!response.ok) {
      return {
        serialOpen: false,
        error: typeof payload.error === 'string' ? payload.error : 'Falha ao consultar status da balanca.',
        timestamp: new Date().toISOString(),
      };
    }

    return {
      serialOpen: Boolean(payload.serial_aberta),
      port: typeof payload.porta === 'string' ? payload.porta : undefined,
      baud: typeof payload.baud === 'number' ? payload.baud : undefined,
      protocol: typeof payload.protocolo === 'string' ? payload.protocolo : undefined,
      lastReading: typeof payload.ultima_leitura === 'string' ? payload.ultima_leitura : null,
      error: typeof payload.erro === 'string' ? payload.erro : null,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      serialOpen: false,
      error: (error as Error).name === 'AbortError'
        ? 'Timeout ao consultar status da balanca.'
        : 'Erro inesperado ao consultar status da balanca.',
      timestamp: new Date().toISOString(),
    };
  }
}

export async function tareScale(timeoutMs = 3000): Promise<ScaleBridgeResult> {
  if (!isFeatureEnabled('pdv_enabled') || !isFeatureEnabled('pdv_scale_enabled')) {
    return {
      status: 'error',
      message: 'Leitura de balanca desabilitada por feature flag.',
    };
  }

  const simulatorApi = getScaleSimulatorApi();
  if (simulatorApi?.applyTare) {
    const snapshot = simulatorApi.applyTare();
    return {
      status: 'ready',
      message: 'Tara aplicada no simulador local.',
      reading: {
        weightKg: Number(snapshot.netGrams / 1000),
        isStable: true,
        raw: snapshot.toledoString,
        capturedAt: snapshot.updatedAt,
      },
      source: 'simulator',
    };
  }

  const bridgeUrl = getScaleBridgeBaseUrl();
  if (!bridgeUrl) {
    return {
      status: 'error',
      message: 'EXPO_PUBLIC_SCALE_BRIDGE_URL nao configurada.',
    };
  }

  try {
    const response = await requestBridge('/tara', timeoutMs, 'POST');
    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;

    if (!response.ok) {
      return {
        status: response.status === 503 ? 'unavailable' : 'error',
        message: typeof payload.error === 'string' ? payload.error : 'Falha ao enviar comando de tara.',
      };
    }

    return {
      status: 'ready',
      message: typeof payload.mensagem === 'string' ? payload.mensagem : 'Comando de tara enviado.',
      source: 'automatic',
    };
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      return {
        status: 'timeout',
        message: 'Timeout ao enviar comando de tara.',
      };
    }

    return {
      status: 'error',
      message: 'Erro inesperado ao enviar comando de tara.',
    };
  }
}

export async function listScalePorts(timeoutMs = 3000): Promise<ScaleBridgePort[]> {
  if (getScaleSimulatorApi()) {
    return [
      {
        path: 'SIMULATOR',
        manufacturer: 'restaurante-web',
        serialNumber: 'dev-scale-simulator',
        vendorId: 'SIM',
        productId: 'BALANCA',
      },
    ];
  }

  const bridgeUrl = getScaleBridgeBaseUrl();
  if (!bridgeUrl) {
    return [];
  }

  try {
    const response = await requestBridge('/portas', timeoutMs);
    const payload = (await response.json().catch(() => [])) as unknown;
    if (!response.ok || !Array.isArray(payload)) {
      return [];
    }

    return payload
      .filter((entry): entry is Record<string, unknown> => Boolean(entry && typeof entry === 'object'))
      .map((entry) => ({
        path: typeof entry.path === 'string' ? entry.path : '',
        manufacturer: typeof entry.manufacturer === 'string' ? entry.manufacturer : undefined,
        serialNumber: typeof entry.serialNumber === 'string' ? entry.serialNumber : undefined,
        vendorId: typeof entry.vendorId === 'string' ? entry.vendorId : undefined,
        productId: typeof entry.productId === 'string' ? entry.productId : undefined,
      }))
      .filter((entry) => entry.path.length > 0);
  } catch {
    return [];
  }
}
