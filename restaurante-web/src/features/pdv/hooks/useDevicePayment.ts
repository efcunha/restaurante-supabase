import { useCallback, useMemo, useState } from 'react';
import { initiateDevicePayment } from '../services/devicePaymentService';
import { DevicePaymentMethod, DevicePaymentResult, DevicePaymentStatus } from '../types';

interface StartDevicePaymentInput {
  companyId: string;
  comandaNumber: string;
  amount: number;
  paymentMethod: DevicePaymentMethod;
}

function buildIdempotencyKey(companyId: string, comandaNumber: string): string {
  return `${companyId}:${comandaNumber}:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`;
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

    const result = await initiateDevicePayment({
      companyId: input.companyId,
      comandaNumber: input.comandaNumber,
      amount: input.amount,
      paymentMethod: input.paymentMethod,
      idempotencyKey: buildIdempotencyKey(input.companyId, input.comandaNumber),
    });

    setStatus(result.status);
    setLastResult(result);
    return result;
  }, []);

  return {
    status,
    isProcessing,
    lastResult,
    startPayment,
    reset,
  };
}
