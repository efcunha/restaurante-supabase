/**
 * State Update Batching Utilities
 * 
 * React 18+ automatically batches state updates in event handlers, but manual batching
 * may be needed for updates in async functions, timeouts, or native event handlers.
 * 
 * This file provides utilities and examples for optimizing state updates.
 */

import { unstable_batchedUpdates } from 'react-native';

/**
 * Batch multiple state updates together
 * 
 * React 18 automatically batches updates in event handlers, but for async operations
 * or native events, you may need to manually batch updates.
 * 
 * @param callback - Function containing state updates to batch
 * 
 * @example
 * batchStateUpdates(() => {
 *   setName('John');
 *   setAge(30);
 *   setEmail('john@example.com');
 * });
 */
export function batchStateUpdates(callback: () => void): void {
  unstable_batchedUpdates(callback);
}

/**
 * Batch async state updates
 * 
 * Use this for batching state updates that occur after async operations
 * 
 * @param callback - Async function containing state updates
 * 
 * @example
 * await batchAsyncStateUpdates(async () => {
 *   const data = await fetchData();
 *   setData(data);
 *   setLoading(false);
 *   setError(null);
 * });
 */
export async function batchAsyncStateUpdates<T>(
  callback: () => Promise<T>
): Promise<T> {
  const result = await callback();
  return result;
}

/**
 * Debounced state updater
 * 
 * Creates a debounced version of a state setter function
 * Useful for expensive state updates triggered by user input
 * 
 * @param setter - State setter function
 * @param delay - Debounce delay in milliseconds
 * @returns Debounced setter function
 * 
 * @example
 * const [searchTerm, setSearchTerm] = useState('');
 * const debouncedSetSearchTerm = createDebouncedSetter(setSearchTerm, 300);
 * 
 * <TextInput onChangeText={debouncedSetSearchTerm} />
 */
export function createDebouncedSetter<T>(
  setter: (value: T) => void,
  delay: number = 300
): (value: T) => void {
  let timeoutId: NodeJS.Timeout;

  return (value: T) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      setter(value);
    }, delay);
  };
}

/**
 * Throttled state updater
 * 
 * Creates a throttled version of a state setter function
 * Limits how often the state can be updated
 * 
 * @param setter - State setter function
 * @param delay - Throttle delay in milliseconds
 * @returns Throttled setter function
 * 
 * @example
 * const [scrollPosition, setScrollPosition] = useState(0);
 * const throttledSetScrollPosition = createThrottledSetter(setScrollPosition, 100);
 * 
 * <ScrollView onScroll={(e) => throttledSetScrollPosition(e.nativeEvent.contentOffset.y)} />
 */
export function createThrottledSetter<T>(
  setter: (value: T) => void,
  delay: number = 300
): (value: T) => void {
  let lastRun = 0;
  let timeoutId: NodeJS.Timeout;

  return (value: T) => {
    const now = Date.now();

    if (now - lastRun >= delay) {
      setter(value);
      lastRun = now;
    } else {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setter(value);
        lastRun = Date.now();
      }, delay - (now - lastRun));
    }
  };
}

/**
 * Batch multiple state updates with a single render
 * 
 * Collects multiple state updates and applies them all at once
 * Useful for complex state updates from multiple sources
 * 
 * @example
 * const batcher = new StateBatcher();
 * 
 * batcher.add(() => setName('John'));
 * batcher.add(() => setAge(30));
 * batcher.add(() => setEmail('john@example.com'));
 * 
 * batcher.flush(); // All updates applied in one render
 */
export class StateBatcher {
  private updates: Array<() => void> = [];
  private flushTimeout: NodeJS.Timeout | null = null;

  /**
   * Add a state update to the batch
   */
  add(update: () => void): void {
    this.updates.push(update);
  }

  /**
   * Flush all pending updates
   */
  flush(): void {
    if (this.updates.length === 0) return;

    batchStateUpdates(() => {
      this.updates.forEach(update => update());
      this.updates = [];
    });

    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
      this.flushTimeout = null;
    }
  }

  /**
   * Auto-flush after a delay
   */
  autoFlush(delay: number = 16): void {
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
    }

    this.flushTimeout = setTimeout(() => {
      this.flush();
    }, delay);
  }

  /**
   * Clear all pending updates without flushing
   */
  clear(): void {
    this.updates = [];
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
      this.flushTimeout = null;
    }
  }
}

/**
 * Example: Batching updates in async operations
 */
export async function exampleAsyncBatching(
  setData: (data: any) => void,
  setLoading: (loading: boolean) => void,
  setError: (error: string | null) => void
) {
  try {
    setLoading(true);
    
    const response = await fetch('https://api.example.com/data');
    const data = await response.json();
    
    // Batch the state updates after async operation
    batchStateUpdates(() => {
      setData(data);
      setLoading(false);
      setError(null);
    });
  } catch (error) {
    batchStateUpdates(() => {
      setLoading(false);
      setError(error instanceof Error ? error.message : 'Unknown error');
    });
  }
}

/**
 * Example: Batching updates in setTimeout
 */
export function exampleTimeoutBatching(
  setCount: (count: number | ((prev: number) => number)) => void,
  setMessage: (message: string) => void
) {
  setTimeout(() => {
    // Without batching, these would cause 2 renders
    // With batching, only 1 render occurs
    batchStateUpdates(() => {
      setCount(prev => prev + 1);
      setMessage('Count updated');
    });
  }, 1000);
}

/**
 * Example: Batching updates from native events
 */
export function exampleNativeEventBatching(
  setX: (x: number) => void,
  setY: (y: number) => void,
  setTimestamp: (timestamp: number) => void
) {
  // Native events may not be automatically batched
  const handleNativeEvent = (event: any) => {
    batchStateUpdates(() => {
      setX(event.x);
      setY(event.y);
      setTimestamp(Date.now());
    });
  };

  return handleNativeEvent;
}

/**
 * React 18 Automatic Batching
 * 
 * React 18 automatically batches state updates in:
 * - Event handlers (onClick, onChange, etc.)
 * - React lifecycle methods
 * - React hooks
 * 
 * Manual batching is still needed for:
 * - setTimeout/setInterval callbacks
 * - Native event handlers
 * - Async operations (fetch, promises)
 * - Third-party library callbacks
 * 
 * Example of automatic batching (React 18+):
 * 
 * function handleClick() {
 *   setCount(c => c + 1);
 *   setFlag(f => !f);
 *   // Only one render, automatically batched
 * }
 * 
 * Example requiring manual batching:
 * 
 * function handleClick() {
 *   setTimeout(() => {
 *     batchStateUpdates(() => {
 *       setCount(c => c + 1);
 *       setFlag(f => !f);
 *       // Only one render with manual batching
 *     });
 *   }, 1000);
 * }
 */

/**
 * Performance Tips:
 * 
 * 1. Use functional updates for state based on previous state
 *    setCount(c => c + 1) instead of setCount(count + 1)
 * 
 * 2. Batch related state updates together
 *    Reduces number of renders and improves performance
 * 
 * 3. Use useReducer for complex state logic
 *    Automatically batches all state updates in a single dispatch
 * 
 * 4. Debounce expensive state updates
 *    Use createDebouncedSetter for user input
 * 
 * 5. Throttle high-frequency updates
 *    Use createThrottledSetter for scroll/animation events
 */
