import { useCallback, useMemo, useRef, useEffect } from 'react';

/**
 * Custom hooks for performance optimization
 * Provides memoization utilities for expensive computations and callbacks
 */

/**
 * useStableCallback - Creates a stable callback reference that doesn't change between renders
 * Useful for callbacks passed to memoized child components
 * 
 * @param callback - The callback function to stabilize
 * @returns A stable callback reference
 */
export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T
): T {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback((...args: any[]) => {
    return callbackRef.current(...args);
  }, []) as T;
}

/**
 * useMemoizedArray - Memoizes an array to prevent unnecessary re-renders
 * Only returns a new array reference if the contents actually changed
 * 
 * @param array - The array to memoize
 * @param deps - Dependencies for the memoization
 * @returns Memoized array
 */
export function useMemoizedArray<T>(
  array: T[],
  deps: React.DependencyList = []
): T[] {
  return useMemo(() => array, deps);
}

/**
 * useMemoizedObject - Memoizes an object to prevent unnecessary re-renders
 * Only returns a new object reference if the contents actually changed
 * 
 * @param obj - The object to memoize
 * @param deps - Dependencies for the memoization
 * @returns Memoized object
 */
export function useMemoizedObject<T extends Record<string, any>>(
  obj: T,
  deps: React.DependencyList = []
): T {
  return useMemo(() => obj, deps);
}

/**
 * useExpensiveComputation - Memoizes expensive computations
 * 
 * @param computeFn - The expensive computation function
 * @param deps - Dependencies that trigger recomputation
 * @returns The computed value
 */
export function useExpensiveComputation<T>(
  computeFn: () => T,
  deps: React.DependencyList
): T {
  return useMemo(() => {
    const startTime = performance.now();
    const result = computeFn();
    const endTime = performance.now();
    
    if (endTime - startTime > 16) {
      console.warn(
        `Expensive computation took ${(endTime - startTime).toFixed(2)}ms`,
        { deps }
      );
    }
    
    return result;
  }, deps);
}

/**
 * useDebouncedValue - Returns a debounced version of the value
 * Useful for expensive operations triggered by user input
 * 
 * @param value - The value to debounce
 * @param delay - Debounce delay in milliseconds
 * @returns Debounced value
 */
export function useDebouncedValue<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * useThrottledCallback - Creates a throttled version of a callback
 * Limits how often the callback can be invoked
 * 
 * @param callback - The callback to throttle
 * @param delay - Throttle delay in milliseconds
 * @returns Throttled callback
 */
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300
): T {
  const lastRun = useRef(Date.now());

  return useCallback(
    (...args: any[]) => {
      const now = Date.now();
      if (now - lastRun.current >= delay) {
        lastRun.current = now;
        return callback(...args);
      }
    },
    [callback, delay]
  ) as T;
}

// Re-export useState for convenience
export { useState } from 'react';
