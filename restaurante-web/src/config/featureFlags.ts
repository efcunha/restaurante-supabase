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

  // Fase 5: Phase 12 – UI-Next Primitive Migration (rollback guards)
  /** LoginScreen: FormInput + Button from ui-next */
  login_uiNext: boolean;
  /** RegisterCompanyScreen: FormInput + Button from ui-next */
  registerCompany_uiNext: boolean;
  /** NovoPedidoScreen: ProductCard + Button from ui-next */
  novoPedido_uiNext: boolean;
  /** DeliveryScreen (web): ProductCard + Button from ui-next */
  delivery_uiNext: boolean;
  /** PagamentoScreen: Button CTAs from ui-next */
  pagamento_uiNext: boolean;
  /** ComandaGerenciamentoScreen: Card + Button from ui-next */
  comandaGerenciamento_uiNext: boolean;
  /** AdminScreen: Card + Table from ui-next (disabled until wave completes) */
  admin_uiNext: boolean;

  // Fase 6: Billing / Licensing
  /** Master toggle: enables billing enforcement. Off = no LicenseGate, no subscription checks. */
  billing_enabled: boolean;
  /** Show LicenseGate overlay when subscription blocks operation */
  billing_licenseGate: boolean;
  /** Show billing management screen (plan, invoices, Pix regularization) */
  billing_showBillingScreen: boolean;
  /** QA toggle: force operational block locally without changing DB subscription state */
  billing_forceBlock: boolean;

  // Fase 7: PDV (maquininha + balanca)
  /** Master toggle do modulo PDV no restaurante-web */
  pdv_enabled: boolean;
  /** Habilita fluxo de pagamento presencial por maquininha */
  pdv_devicePayment_enabled: boolean;
  /** Habilita leitura de peso via bridge da balanca */
  pdv_scale_enabled: boolean;
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
  usePerformanceMonitoring: false,

  // Fase 5: Phase 12 – UI-Next migration (canary: auth + order flows first)
  login_uiNext: true,
  registerCompany_uiNext: true,
  novoPedido_uiNext: true,
  delivery_uiNext: true,
  pagamento_uiNext: true,
  comandaGerenciamento_uiNext: true,
  admin_uiNext: false,

  // Fase 6: Billing (starts disabled — enable via env or after rollout validation)
  billing_enabled: false,
  billing_licenseGate: false,
  billing_showBillingScreen: false,
  billing_forceBlock: false,

  // Fase 7: PDV (starts disabled)
  pdv_enabled: false,
  pdv_devicePayment_enabled: false,
  pdv_scale_enabled: false,
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

  // Phase 12 UI-next migration guards
  if (process.env.EXPO_PUBLIC_FEATURE_LOGIN_UI_NEXT !== undefined) {
    envFlags.login_uiNext = process.env.EXPO_PUBLIC_FEATURE_LOGIN_UI_NEXT === 'true';
  }

  if (process.env.EXPO_PUBLIC_FEATURE_REGISTER_COMPANY_UI_NEXT !== undefined) {
    envFlags.registerCompany_uiNext = process.env.EXPO_PUBLIC_FEATURE_REGISTER_COMPANY_UI_NEXT === 'true';
  }

  if (process.env.EXPO_PUBLIC_FEATURE_NOVO_PEDIDO_UI_NEXT !== undefined) {
    envFlags.novoPedido_uiNext = process.env.EXPO_PUBLIC_FEATURE_NOVO_PEDIDO_UI_NEXT === 'true';
  }

  if (process.env.EXPO_PUBLIC_FEATURE_DELIVERY_UI_NEXT !== undefined) {
    envFlags.delivery_uiNext = process.env.EXPO_PUBLIC_FEATURE_DELIVERY_UI_NEXT === 'true';
  }

  if (process.env.EXPO_PUBLIC_FEATURE_PAGAMENTO_UI_NEXT !== undefined) {
    envFlags.pagamento_uiNext = process.env.EXPO_PUBLIC_FEATURE_PAGAMENTO_UI_NEXT === 'true';
  }

  if (process.env.EXPO_PUBLIC_FEATURE_COMANDA_GERENCIAMENTO_UI_NEXT !== undefined) {
    envFlags.comandaGerenciamento_uiNext = process.env.EXPO_PUBLIC_FEATURE_COMANDA_GERENCIAMENTO_UI_NEXT === 'true';
  }

  if (process.env.EXPO_PUBLIC_FEATURE_ADMIN_UI_NEXT !== undefined) {
    envFlags.admin_uiNext = process.env.EXPO_PUBLIC_FEATURE_ADMIN_UI_NEXT === 'true';
  }

  // Fase 6: Billing
  if (process.env.EXPO_PUBLIC_FEATURE_BILLING !== undefined) {
    envFlags.billing_enabled = process.env.EXPO_PUBLIC_FEATURE_BILLING === 'true';
  }
  if (process.env.EXPO_PUBLIC_FEATURE_BILLING_LICENSE_GATE !== undefined) {
    envFlags.billing_licenseGate = process.env.EXPO_PUBLIC_FEATURE_BILLING_LICENSE_GATE === 'true';
  }
  if (process.env.EXPO_PUBLIC_FEATURE_BILLING_SCREEN !== undefined) {
    envFlags.billing_showBillingScreen = process.env.EXPO_PUBLIC_FEATURE_BILLING_SCREEN === 'true';
  }
  if (process.env.EXPO_PUBLIC_FEATURE_BILLING_FORCE_BLOCK !== undefined) {
    envFlags.billing_forceBlock = process.env.EXPO_PUBLIC_FEATURE_BILLING_FORCE_BLOCK === 'true';
  }

  // Fase 7: PDV
  if (process.env.EXPO_PUBLIC_FEATURE_PDV_ENABLED !== undefined) {
    envFlags.pdv_enabled = process.env.EXPO_PUBLIC_FEATURE_PDV_ENABLED === 'true';
  }
  if (process.env.EXPO_PUBLIC_FEATURE_PDV_DEVICE_PAYMENT !== undefined) {
    envFlags.pdv_devicePayment_enabled = process.env.EXPO_PUBLIC_FEATURE_PDV_DEVICE_PAYMENT === 'true';
  }
  if (process.env.EXPO_PUBLIC_FEATURE_PDV_SCALE !== undefined) {
    envFlags.pdv_scale_enabled = process.env.EXPO_PUBLIC_FEATURE_PDV_SCALE === 'true';
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
