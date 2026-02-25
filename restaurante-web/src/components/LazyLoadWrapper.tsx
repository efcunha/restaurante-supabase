import React, { Suspense, ComponentType } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';

/**
 * LazyLoadWrapper - Wrapper component for lazy-loaded screens
 * 
 * Provides a loading indicator while the lazy-loaded component is being fetched
 * Handles errors gracefully with an error boundary
 */

interface LazyLoadWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  loadingText?: string;
}

/**
 * Default loading component shown while lazy component loads
 */
const DefaultLoadingFallback: React.FC<{ loadingText?: string }> = ({ loadingText }) => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#8B2F2F" />
    {loadingText && <Text style={styles.loadingText}>{loadingText}</Text>}
  </View>
);

/**
 * LazyLoadWrapper component
 * Wraps lazy-loaded components with Suspense and loading state
 */
export const LazyLoadWrapper: React.FC<LazyLoadWrapperProps> = ({
  children,
  fallback,
  loadingText = 'Carregando...',
}) => {
  return (
    <Suspense
      fallback={fallback || <DefaultLoadingFallback loadingText={loadingText} />}
    >
      {children}
    </Suspense>
  );
};

/**
 * Error boundary for lazy-loaded components
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class LazyLoadErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('LazyLoad Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Erro ao carregar</Text>
          <Text style={styles.errorText}>
            Não foi possível carregar esta tela. Por favor, tente novamente.
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

/**
 * Helper function to create a lazy-loaded screen with wrapper
 * 
 * @param importFn - Dynamic import function for the component
 * @param loadingText - Optional loading text to display
 * @returns Wrapped lazy component
 * 
 * @example
 * const LazyOrdersScreen = createLazyScreen(
 *   () => import('../screens/OrdersScreen'),
 *   'Carregando pedidos...'
 * );
 */
export function createLazyScreen<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  loadingText?: string
): React.FC {
  const LazyComponent = React.lazy(importFn);

  return (props: any) => (
    <LazyLoadErrorBoundary>
      <LazyLoadWrapper loadingText={loadingText}>
        <LazyComponent {...props} />
      </LazyLoadWrapper>
    </LazyLoadErrorBoundary>
  );
}

/**
 * Preload a lazy component
 * Useful for preloading screens that will likely be needed soon
 * 
 * @param importFn - Dynamic import function for the component
 * 
 * @example
 * // Preload a screen when hovering over a navigation button
 * onMouseEnter={() => preloadLazyComponent(() => import('../screens/OrdersScreen'))}
 */
export function preloadLazyComponent(
  importFn: () => Promise<{ default: ComponentType<any> }>
): void {
  importFn().catch(err => {
    console.warn('Failed to preload component:', err);
  });
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F1E8',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8B2F2F',
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F1E8',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#8B2F2F',
    marginBottom: 12,
  },
  errorText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

export default LazyLoadWrapper;
