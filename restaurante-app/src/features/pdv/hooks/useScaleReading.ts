import { useCallback, useMemo, useRef, useState } from 'react';
import { readScaleWeight, readStableScaleWeight, tareScale } from '../services/scaleBridgeService';
import { ScaleBridgeResult, ScaleReadingStatus } from '../types';

export function useScaleReading() {
  const [status, setStatus] = useState<ScaleReadingStatus>('not_initialized');
  const [lastResult, setLastResult] = useState<ScaleBridgeResult | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollingInFlightRef = useRef(false);

  const isReading = useMemo(() => status === 'reading', [status]);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
      setIsPolling(false);
    }
    if (status === 'reading') {
      setStatus('ready');
    }
  }, [status]);

  const captureCurrentWeight = useCallback(async (timeoutMs = 3000): Promise<ScaleBridgeResult> => {
    setStatus('reading');
    const result = await readScaleWeight(timeoutMs);
    setStatus(result.status);
    setLastResult(result);
    return result;
  }, []);

  const captureStableWeight = useCallback(async (timeoutMs = 5000): Promise<ScaleBridgeResult> => {
    setStatus('reading');
    const result = await readStableScaleWeight(timeoutMs);
    setStatus(result.status);
    setLastResult(result);
    return result;
  }, []);

  const applyTare = useCallback(async (timeoutMs = 3000): Promise<ScaleBridgeResult> => {
    const result = await tareScale(timeoutMs);
    setStatus(result.status);
    setLastResult(result);
    return result;
  }, []);

  const startPolling = useCallback((intervalMs = 1000, timeoutMs = 3000) => {
    if (pollTimerRef.current) {
      return;
    }

    setStatus('connecting');
    setIsPolling(true);
    pollTimerRef.current = setInterval(async () => {
      if (pollingInFlightRef.current) {
        return;
      }

      pollingInFlightRef.current = true;
      try {
        const result = await readScaleWeight(timeoutMs);
        setStatus(result.status);
        setLastResult(result);
      } finally {
        pollingInFlightRef.current = false;
      }
    }, intervalMs);
  }, []);

  const reset = useCallback(() => {
    stopPolling();
    setStatus('not_initialized');
    setLastResult(null);
  }, [stopPolling]);

  const dispose = useCallback(() => {
    stopPolling();
  }, [stopPolling]);

  return {
    status,
    isReading,
    isPolling,
    lastResult,
    captureCurrentWeight,
    captureStableWeight,
    applyTare,
    startPolling,
    stopPolling,
    reset,
    dispose,
  };
}
