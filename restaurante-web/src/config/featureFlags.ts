/**
 * Feature Flags Configuration
 * 
 * Controla rollout gradual de novas features durante modernização
 */

export interface FeatureFlags {
  // Fase 1: Security Hardening
  useCustomClaims: boolean;           // Req 1: Custom claims para otimização de security rules
  useOptimizedListeners: boolean;     // Req 6: Listeners otimizados com debouncing
  useCacheLayer: boolean;             // Req 7: Cache inteligente
  useServerAggregations: boolean;     // Req 21: Agregações server-side
  requireMFA: boolean;                // Req 18: MFA obrigatório para roles privilegiadas
  
  // Fase 2: Performance Optimization
  usePagination: boolean;             // Req 12: Paginação cursor-based
  useRetryLogic: boolean;             // Req 16: Retry logic com idempotência
  useArchival: boolean;               // Req 17: Arquivamento de pedidos antigos
  
  // Fase 3: Data Normalization
  useNormalizedFields: boolean;       // Req 15: Campos consolidados
  useServerDateKey: boolean;          // Req 14: DateKey calculado server-side
  
  // Fase 4: Advanced Features
  useBiometricAuth: boolean;          // Req 19: Autenticação biométrica
  usePerformanceMonitoring: boolean;  // Req 27: Monitoramento de performance
}

/**
 * Feature flags padrão
 * Todas as features começam desabilitadas para rollout gradual
 */
const defaultFlags: FeatureFlags = {
  // Fase 1
  useCustomClaims: false,
  useOptimizedListeners: false,
  useCacheLayer: false,
  useServerAggregations: false,
  requireMFA: false,
  
  // Fase 2
  usePagination: false,
  useRetryLogic: false,
  useArchival: false,
  
  // Fase 3
  useNormalizedFields: false,
  useServerDateKey: false,
  
  // Fase 4
  useBiometricAuth: false,
  usePerformanceMonitoring: false
};

/**
 * Carrega feature flags de environment variables
 * Permite override via EXPO_PUBLIC_FEATURE_* env vars
 */
function loadFeatureFlagsFromEnv(): Partial<FeatureFlags> {
  const envFlags: Partial<FeatureFlags> = {};
  
  // Custom Claims
  if (process.env.EXPO_PUBLIC_FEATURE_CUSTOM_CLAIMS !== undefined) {
    envFlags.useCustomClaims = process.env.EXPO_PUBLIC_FEATURE_CUSTOM_CLAIMS === 'true';
  }
  
  // Optimized Listeners
  if (process.env.EXPO_PUBLIC_FEATURE_OPTIMIZED_LISTENERS !== undefined) {
    envFlags.useOptimizedListeners = process.env.EXPO_PUBLIC_FEATURE_OPTIMIZED_LISTENERS === 'true';
  }
  
  // Cache Layer
  if (process.env.EXPO_PUBLIC_FEATURE_CACHE_LAYER !== undefined) {
    envFlags.useCacheLayer = process.env.EXPO_PUBLIC_FEATURE_CACHE_LAYER === 'true';
  }
  
  // Server Aggregations
  if (process.env.EXPO_PUBLIC_FEATURE_SERVER_AGGREGATIONS !== undefined) {
    envFlags.useServerAggregations = process.env.EXPO_PUBLIC_FEATURE_SERVER_AGGREGATIONS === 'true';
  }
  
  // MFA
  if (process.env.EXPO_PUBLIC_FEATURE_REQUIRE_MFA !== undefined) {
    envFlags.requireMFA = process.env.EXPO_PUBLIC_FEATURE_REQUIRE_MFA === 'true';
  }
  
  // Pagination
  if (process.env.EXPO_PUBLIC_FEATURE_PAGINATION !== undefined) {
    envFlags.usePagination = process.env.EXPO_PUBLIC_FEATURE_PAGINATION === 'true';
  }
  
  // Retry Logic
  if (process.env.EXPO_PUBLIC_FEATURE_RETRY_LOGIC !== undefined) {
    envFlags.useRetryLogic = process.env.EXPO_PUBLIC_FEATURE_RETRY_LOGIC === 'true';
  }
  
  // Archival
  if (process.env.EXPO_PUBLIC_FEATURE_ARCHIVAL !== undefined) {
    envFlags.useArchival = process.env.EXPO_PUBLIC_FEATURE_ARCHIVAL === 'true';
  }
  
  // Normalized Fields
  if (process.env.EXPO_PUBLIC_FEATURE_NORMALIZED_FIELDS !== undefined) {
    envFlags.useNormalizedFields = process.env.EXPO_PUBLIC_FEATURE_NORMALIZED_FIELDS === 'true';
  }
  
  // Server DateKey
  if (process.env.EXPO_PUBLIC_FEATURE_SERVER_DATEKEY !== undefined) {
    envFlags.useServerDateKey = process.env.EXPO_PUBLIC_FEATURE_SERVER_DATEKEY === 'true';
  }
  
  // Biometric Auth
  if (process.env.EXPO_PUBLIC_FEATURE_BIOMETRIC_AUTH !== undefined) {
    envFlags.useBiometricAuth = process.env.EXPO_PUBLIC_FEATURE_BIOMETRIC_AUTH === 'true';
  }
  
  // Performance Monitoring
  if (process.env.EXPO_PUBLIC_FEATURE_PERFORMANCE_MONITORING !== undefined) {
    envFlags.usePerformanceMonitoring = process.env.EXPO_PUBLIC_FEATURE_PERFORMANCE_MONITORING === 'true';
  }
  
  return envFlags;
}

/**
 * Feature flags ativos
 * Combina defaults com overrides de environment
 */
export const featureFlags: FeatureFlags = {
  ...defaultFlags,
  ...loadFeatureFlagsFromEnv()
};

/**
 * Verifica se uma feature está habilitada
 */
export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  return featureFlags[feature];
}

/**
 * Habilita uma feature (útil para testes)
 */
export function enableFeature(feature: keyof FeatureFlags): void {
  featureFlags[feature] = true;
}

/**
 * Desabilita uma feature (útil para rollback)
 */
export function disableFeature(feature: keyof FeatureFlags): void {
  featureFlags[feature] = false;
}

/**
 * Log de feature flags ativos (útil para debugging)
 */
export function logFeatureFlags(): void {
  console.log('[FeatureFlags] Estado atual:');
  Object.entries(featureFlags).forEach(([key, value]) => {
    if (value) {
      console.log(`  ✅ ${key}: ${value}`);
    }
  });
}
