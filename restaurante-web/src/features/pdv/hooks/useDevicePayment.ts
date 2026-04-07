import { useCallback, useMemo, useState } from 'react';
import { getDevicePaymentStatus, initiateDevicePayment } from '../services/devicePaymentService';
import { DevicePaymentMethod, DevicePaymentResult, DevicePaymentStatus } from '../types';
import { pollDevicePaymentUntilFinal } from './devicePaymentPolling';

interface StartDevicePaymentInput {
  companyId: string;
  comandaNumber: string;
  amount: number;
  paymentMethod: DevicePaymentMethod;
}

function buildIdempotencyKey(companyId: string, comandaNumber: string): string {
  return `${companyId}:${comandaNumber}:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`;
}

const POLLING_INTERVAL_MS = 1500;
const POLLING_TIMEOUT_MS = 60000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function useDevicePayment() {
  const [status, setStatus] = useState<DevicePaymentStatus>('idle');
  const [lastResult, setLastResult] = useState<DevicePaymentResult | null>(null);

  const isProcessing = useMemo(() => status === 'processing', [status]);

  const reset = useCallback(() => {
    setStatus('idle');
    setLastResult(null);
  }, []);

  const startPayment = useCallback(async (input: StartDevicePaymentInput): Promise<DevicePaymentResult> => {
    setStatus('processing');

    try {
      const initialResult = await initiateDevicePayment({
        companyId: input.companyId,
        comandaNumber: input.comandaNumber,
        amount: input.amount,
        paymentMethod: input.paymentMethod,
        idempotencyKey: buildIdempotencyKey(input.companyId, input.comandaNumber),
      });

      setStatus(initialResult.status);
      setLastResult(initialResult);

      const timeoutOrFinalResult = await pollDevicePaymentUntilFinal(initialResult, {
        pollingIntervalMs: POLLING_INTERVAL_MS,
        pollingTimeoutMs: POLLING_TIMEOUT_MS,
        now: Date.now,
        sleep: delay,
        getStatus: (transactionId) => getDevicePaymentStatus(transactionId),
        onUpdate: (statusResult) => {
          setStatus(statusResult.status);
          setLastResult(statusResult);
        },
      });

      if (timeoutOrFinalResult.status !== 'timeout') {
        return timeoutOrFinalResult;
      }

      setStatus(timeoutOrFinalResult.status);
      setLastResult(timeoutOrFinalResult);
      return timeoutOrFinalResult;
    } catch (error) {
      const errorResult: DevicePaymentResult = {
        status: 'error',
        message: error instanceof Error ? error.message : 'Falha ao processar pagamento presencial.',
      };
      setStatus(errorResult.status);
      setLastResult(errorResult);
      return errorResult;
    }
  }, []);

  return {
    status,
    isProcessing,
    lastResult,
    startPayment,
    reset,
  };
}
