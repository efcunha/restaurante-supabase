import { useEffect, useRef, useState, useCallback } from 'react';
import { InteractionManager } from 'react-native';

interface PerformanceMetrics {
  renderTime: number;
  frameRate: number;
  frameDrops: number;
  listItemCount: number;
  visibleItemCount: number;
  timestamp: number;
}

interface PerformanceMonitorResult {
  metrics: PerformanceMetrics | null;
  startMonitoring: () => void;
  stopMonitoring: () => void;
  logMetrics: () => void;
  isMonitoring: boolean;
}

export const usePerformanceMonitor = (): PerformanceMonitorResult => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const startTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const frameDropsRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(0);
  const rafIdRef = useRef<number | null>(null);

  const measureFrame = useCallback(() => {
    const now = performance.now();
    
    if (lastFrameTimeRef.current > 0) {
      const frameDuration = now - lastFrameTimeRef.current;
      frameCountRef.current++;
      
      // Frame drop if duration > 16.67ms (60 FPS threshold)
      if (frameDuration > 16.67) {
        frameDropsRef.current++;
      }
    }
    
    lastFrameTimeRef.current = now;
    
    if (isMonitoring) {
      rafIdRef.current = requestAnimationFrame(measureFrame);
    }
  }, [isMonitoring]);

  const startMonitoring = useCallback(() => {
    console.log('📊 [Performance] Starting monitoring...');
    setIsMonitoring(true);
    startTimeRef.current = performance.now();
    frameCountRef.current = 0;
    frameDropsRef.current = 0;
    lastFrameTimeRef.current = 0;
    
    // Start measuring frames
    rafIdRef.current = requestAnimationFrame(measureFrame);
  }, [measureFrame]);

  const stopMonitoring = useCallback(() => {
    console.log('📊 [Performance] Stopping monitoring...');
    setIsMonitoring(false);
    
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    
    const endTime = performance.now();
    const duration = endTime - startTimeRef.current;
    const fps = duration > 0 ? (frameCountRef.current / duration) * 1000 : 0;
    
    const newMetrics: PerformanceMetrics = {
      renderTime: duration,
      frameRate: fps,
      frameDrops: frameDropsRef.current,
      listItemCount: 0, // Will be set externally
      visibleItemCount: 0, // Will be set externally
      timestamp: Date.now()
    };
    
    setMetrics(newMetrics);
    
    console.log('📊 [Performance] Metrics collected:', {
      duration: `${duration.toFixed(2)}ms`,
      fps: fps.toFixed(2),
      frameDrops: frameDropsRef.current,
      avgFrameTime: frameCountRef.current > 0 ? (duration / frameCountRef.current).toFixed(2) : 0
    });
  }, []);

  const logMetrics = useCallback(() => {
    if (!metrics) {
      console.log('📊 [Performance] No metrics available');
      return;
    }
    
    console.log('📊 [Performance] Current Metrics:');
    console.log(`  - Render Time: ${metrics.renderTime.toFixed(2)}ms`);
    console.log(`  - Frame Rate: ${metrics.frameRate.toFixed(2)} FPS`);
    console.log(`  - Frame Drops: ${metrics.frameDrops}`);
    console.log(`  - List Items: ${metrics.listItemCount}`);
    console.log(`  - Visible Items: ${metrics.visibleItemCount}`);
  }, [metrics]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  return {
    metrics,
    startMonitoring,
    stopMonitoring,
    logMetrics,
    isMonitoring
  };
};
