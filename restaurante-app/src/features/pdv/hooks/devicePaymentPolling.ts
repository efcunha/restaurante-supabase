import { DevicePaymentResult, DevicePaymentStatus } from '../types';

interface DevicePaymentPollingOptions {
  pollingIntervalMs: number;
  pollingTimeoutMs: number;
  now: () => number;
  sleep: (ms: number) => Promise<void>;
  getStatus: (transactionId: string) => Promise<DevicePaymentResult>;
  onUpdate?: (result: DevicePaymentResult) => void;
}

function isFinalStatus(status: DevicePaymentStatus): boolean {
  return status === 'approved' || status === 'declined' || status === 'error' || status === 'timeout';
}

export async function pollDevicePaymentUntilFinal(
  initialResult: DevicePaymentResult,
  options: DevicePaymentPollingOptions,
): Promise<DevicePaymentResult> {
  if (isFinalStatus(initialResult.status) || !initialResult.transactionId) {
    return initialResult;
  }

  const startedAt = options.now();
  let latestResult = initialResult;

  while (options.now() - startedAt < options.pollingTimeoutMs) {
    await options.sleep(options.pollingIntervalMs);

    const statusResult = await options.getStatus(initialResult.transactionId);
    latestResult = statusResult;
    options.onUpdate?.(statusResult);

    if (isFinalStatus(statusResult.status)) {
      return statusResult;
    }
  }

  return {
    status: 'timeout',
    transactionId: initialResult.transactionId,
    providerPaymentId: latestResult.providerPaymentId,
    message: 'Tempo limite para confirmar pagamento na maquininha. Verifique o status e tente novamente.',
  };
}
