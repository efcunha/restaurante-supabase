import { useCallback, useMemo, useState } from 'react';
import { readStableScaleWeight } from '../services/scaleBridgeService';
import { ScaleBridgeResult, ScaleReadingStatus } from '../types';

export function useScaleReading() {
  const [status, setStatus] = useState<ScaleReadingStatus>('idle');
  const [lastResult, setLastResult] = useState<ScaleBridgeResult | null>(null);

  const isReading = useMemo(() => status === 'reading', [status]);

  const captureStableWeight = useCallback(async (timeoutMs = 5000): Promise<ScaleBridgeResult> => {
    setStatus('reading');
    const result = await readStableScaleWeight(timeoutMs);
    setStatus(result.status);
    setLastResult(result);
    return result;
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setLastResult(null);
  }, []);

  return {
    status,
    isReading,
    lastResult,
    captureStableWeight,
    reset,
  };
}
