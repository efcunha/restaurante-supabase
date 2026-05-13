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
  /** AboutScreen */
  about_uiNext: boolean;
  /** AdicionaisConfigModal */
  adicionaisConfigModal_uiNext: boolean;
  /** BillingScreen */
  billing_uiNext: boolean;
  /** CadastroProdutoScreen */
  cadastroProduto_uiNext: boolean;
  /** CaixaAberturaScreen */
  caixaAbertura_uiNext: boolean;
  /** CaixaFechamentoScreen */
  caixaFechamento_uiNext: boolean;
  /** CaixaHistoricoScreen */
  caixaHistorico_uiNext: boolean;
  /** CaixaOperacoesScreen */
  caixaOperacoes_uiNext: boolean;
  /** CancellationReportScreen */
  cancellationReport_uiNext: boolean;
  /** CashFlowScreen */
  cashFlow_uiNext: boolean;
  /** ComandaAbertaScreen */
  comandaAberta_uiNext: boolean;
  /** ComandaVisualizacaoAdminScreen */
  comandaVisualizacaoAdmin_uiNext: boolean;
  /** ConfiguracaoEstoqueScreen */
  configuracaoEstoque_uiNext: boolean;
  /** ConfiguracaoMesasScreen */
  configuracaoMesas_uiNext: boolean;
  /** ConfiguracoesWhatsApp */
  configuracoesWhatsApp_uiNext: boolean;
  /** CozinhaScreen */
  cozinha_uiNext: boolean;
  /** DeliveryOcorrenciasScreen */
  deliveryOcorrencias_uiNext: boolean;
  /** EditarEmpresaScreen */
  editarEmpresa_uiNext: boolean;
  /** EstoqueScreen */
  estoque_uiNext: boolean;
  /** ExtrasConfigScreen */
  extrasConfig_uiNext: boolean;
  /** FinancialConfigScreen */
  financialConfig_uiNext: boolean;
  /** FinancialDashboardScreen */
  financialDashboard_uiNext: boolean;
  /** FuncionariosScreen */
  funcionarios_uiNext: boolean;
  /** GerenciarCardapioScreen */
  gerenciarCardapio_uiNext: boolean;
  /** GerenciarFornecedoresScreen */
  gerenciarFornecedores_uiNext: boolean;
  /** MapaMesasScreen */
  mapaMesas_uiNext: boolean;
  /** MenuSettings */
  menuSettings_uiNext: boolean;
  /** MontagemScreen */
  montagem_uiNext: boolean;
  /** OperationalSettingsScreen */
  operationalSettings_uiNext: boolean;
  /** OverflowMenuScreen (app only) */
  overflowMenu_uiNext: boolean;
  /** PedidoDetalhesModal */
  pedidoDetalhesModal_uiNext: boolean;
  /** PedidosProntosScreen */
  pedidosProntos_uiNext: boolean;
  /** PerformanceDashboardScreen */
  performanceDashboard_uiNext: boolean;
  /** PrinterConfigScreen */
  printerConfig_uiNext: boolean;
  /** ProductForm */
  productForm_uiNext: boolean;
  /** ProductList */
  productList_uiNext: boolean;
  /** PublicMenuScreen */
  publicMenu_uiNext: boolean;
  /** ReservasScreen */
  reservas_uiNext: boolean;
  /** ResetPasswordScreen */
  resetPassword_uiNext: boolean;
  /** RotasDeliveryScreen */
  rotasDelivery_uiNext: boolean;
  /** StockManager */
  stockManager_uiNext: boolean;
  /** UpdateCardapioScreen */
  updateCardapio_uiNext: boolean;
  /** VariationManager */
  variationManager_uiNext: boolean;

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
  /** Habilita registro manual de recebimento por maquininha externa (sem TEF) */
  pdv_externalPos_enabled: boolean;
  /** Habilita semântica isolada do fluxo self-service por peso */
  pdv_selfServiceScale_enabled: boolean;
  /** Habilita simuladores locais de TEF e balanca para homologacao manual */
  devSimulators: boolean;
}

type FeatureFlagsTestApi = {
  enable: (feature: keyof FeatureFlags) => void;
  disable: (feature: keyof FeatureFlags) => void;
  getAll: () => FeatureFlags;
};

declare global {
  interface Window {
    __E2E_FEATURE_FLAGS__?: FeatureFlagsTestApi;
  }
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
  about_uiNext: false,
  adicionaisConfigModal_uiNext: false,
  billing_uiNext: false,
  cadastroProduto_uiNext: false,
  caixaAbertura_uiNext: false,
  caixaFechamento_uiNext: false,
  caixaHistorico_uiNext: false,
  caixaOperacoes_uiNext: false,
  cancellationReport_uiNext: false,
  cashFlow_uiNext: false,
  comandaAberta_uiNext: false,
  comandaVisualizacaoAdmin_uiNext: false,
  configuracaoEstoque_uiNext: false,
  configuracaoMesas_uiNext: false,
  configuracoesWhatsApp_uiNext: false,
  cozinha_uiNext: false,
  deliveryOcorrencias_uiNext: false,
  editarEmpresa_uiNext: false,
  estoque_uiNext: false,
  extrasConfig_uiNext: false,
  financialConfig_uiNext: false,
  financialDashboard_uiNext: false,
  funcionarios_uiNext: false,
  gerenciarCardapio_uiNext: false,
  gerenciarFornecedores_uiNext: false,
  mapaMesas_uiNext: false,
  menuSettings_uiNext: false,
  montagem_uiNext: false,
  operationalSettings_uiNext: false,
  overflowMenu_uiNext: false,
  pedidoDetalhesModal_uiNext: false,
  pedidosProntos_uiNext: false,
  performanceDashboard_uiNext: false,
  printerConfig_uiNext: false,
  productForm_uiNext: false,
  productList_uiNext: false,
  publicMenu_uiNext: false,
  reservas_uiNext: false,
  resetPassword_uiNext: true,
  rotasDelivery_uiNext: false,
  stockManager_uiNext: false,
  updateCardapio_uiNext: false,
  variationManager_uiNext: false,

  // Fase 6: Billing (starts disabled — enable via env or after rollout validation)
  billing_enabled: false,
  billing_licenseGate: false,
  billing_showBillingScreen: false,
  billing_forceBlock: false,

  // Fase 7: PDV (starts disabled)
  pdv_enabled: false,
  pdv_devicePayment_enabled: false,
  pdv_scale_enabled: false,
  pdv_externalPos_enabled: false,
  pdv_selfServiceScale_enabled: false,
  devSimulators: false,
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

  if (process.env.EXPO_PUBLIC_FEATURE_ABOUT_UI_NEXT !== undefined) {
    envFlags.about_uiNext = process.env.EXPO_PUBLIC_FEATURE_ABOUT_UI_NEXT === 'true';
  }
  if (process.env.EXPO_PUBLIC_FEATURE_ADICIONAIS_CONFIG_MODAL_UI_NEXT !== undefined) {
    envFlags.adicionaisConfigModal_uiNext = process.env.EXPO_PUBLIC_FEATURE_ADICIONAIS_CONFIG_MODAL_UI_NEXT === 'true';
  }
  if (process.env.EXPO_PUBLIC_FEATURE_BILLING_UI_NEXT !== undefined) {
    envFlags.billing_uiNext = process.env.EXPO_PUBLIC_FEATURE_BILLING_UI_NEXT === 'true';
  }
  if (process.env.EXPO_PUBLIC_FEATURE_CADASTRO_PRODUTO_UI_NEXT !== undefined) {
    envFlags.cadastroProduto_uiNext = process.env.EXPO_PUBLIC_FEATURE_CADASTRO_PRODUTO_UI_NEXT === 'true';
  }
  if (process.env.EXPO_PUBLIC_FEATURE_CAIXA_ABERTURA_UI_NEXT !== undefined) {
    envFlags.caixaAbertura_uiNext = process.env.EXPO_PUBLIC_FEATURE_CAIXA_ABERTURA_UI_NEXT === 'true';
  }
  if (process.env.EXPO_PUBLIC_FEATURE_CAIXA_FECHAMENTO_UI_NEXT !== undefined) {
    envFlags.caixaFechamento_uiNext = process.env.EXPO_PUBLIC_FEATURE_CAIXA_FECHAMENTO_UI_NEXT === 'true';
  }
  if (process.env.EXPO_PUBLIC_FEATURE_CAIXA_HISTORICO_UI_NEXT !== undefined) {
    envFlags.caixaHistorico_uiNext = process.env.EXPO_PUBLIC_FEATURE_CAIXA_HISTORICO_UI_NEXT === 'true';
  }
  if (process.env.EXPO_PUBLIC_FEATURE_CAIXA_OPERACOES_UI_NEXT !== undefined) {
    envFlags.caixaOperacoes_uiNext = process.env.EXPO_PUBLIC_FEATURE_CAIXA_OPERACOES_UI_NEXT === 'true';
  }
  if (process.env.EXPO_PUBLIC_FEATURE_CANCELLATION_REPORT_UI_NEXT !== undefined) {
    envFlags.cancellationReport_uiNext = process.env.EXPO_PUBLIC_FEATURE_CANCELLATION_REPORT_UI_NEXT === 'true';
  }
  if (process.env.EXPO_PUBLIC_FEATURE_CASH_FLOW_UI_NEXT !== undefined) {
    envFlags.cashFlow_uiNext = process.env.EXPO_PUBLIC_FEATURE_CASH_FLOW_UI_NEXT === 'true';
  }
  if (process.env.EXPO_PUBLIC_FEATURE_COMANDA_ABERTA_UI_NEXT !== undefined) {
    envFlags.comandaAberta_uiNext = process.env.EXPO_PUBLIC_FEATURE_COMANDA_ABERTA_UI_NEXT === 'true';
  }
  if (process.env.EXPO_PUBLIC_FEATURE_COMANDA_VISUALIZACAO_ADMIN_UI_NEXT !== undefined) {
    envFlags.comandaVisualizacaoAdmin_uiNext = process.env.EXPO_PUBLIC_FEATURE_COMANDA_VISUALIZACAO_ADMIN_UI_NEXT === 'true';
  }
  if (process.env.EXPO_PUBLIC_FEATURE_CONFIGURACAO_ESTOQUE_UI_NEXT !== undefined) {
    envFlags.configuracaoEstoque_uiNext = process.env.EXPO_PUBLIC_FEATURE_CONFIGURACAO_ESTOQUE_UI_NEXT === 'true';
  }
  if (process.env.EXPO_PUBLIC_FEATURE_CONFIGURACAO_MESAS_UI_NEXT !== undefined) {
    envFlags.configuracaoMesas_uiNext = process.env.EXPO_PUBLIC_FEATURE_CONFIGURACAO_MESAS_UI_NEXT === 'true';
  }
  if (process.env.EXPO_PUBLIC_FEATURE_CONFIGURACOES_WHATSAPP_UI_NEXT !== undefined) {
    envFlags.configuracoesWhatsApp_uiNext = process.env.EXPO_PUBLIC_FEATURE_CONFIGURACOES_WHATSAPP_UI_NEXT === 'true';
  }
  if (process.env.EXPO_PUBLIC_FEATURE_COZINHA_UI_NEXT !== undefined) {
    envFlags.cozinha_uiNext = process.env.EXPO_PUBLIC_FEATURE_COZINHA_UI_NEXT === 'true';
  }
  if (process.env.EXPO_PUBLIC_FEATURE_DELIVERY_OCORRENCIAS_UI_NEXT !== undefined) {
    envFlags.deliveryOcorrencias_uiNext = process.env.EXPO_PUBLIC_FEATURE_DELIVERY_OCORRENCIAS_UI_NEXT === 'true';
  }
  if (process.env.EXPO_PUBLIC_FEATURE_EDITAR_EMPRESA_UI_NEXT !== undefined) {
    envFlags.editarEmpresa_uiNext = process.env.EXPO_PUBLIC_FEATURE_EDITAR_EMPRESA_UI_NEXT === 'true';
  }
  if (process.env.EXPO_PUBLIC_FEATURE_ESTOQUE_UI_NEXT !== undefined) {
    envFlags.estoque_uiNext = process.env.EXPO_PUBLIC_FEATURE_ESTOQUE_UI_NEXT === 'true';
  }
  if (process.env.EXPO_PUBLIC_FEATURE_EXTRAS_CONFIG_UI_NEXT !== undefined) {
    envFlags.extrasConfig_uiNext = process.env.EXPO_PUBLIC_FEATURE_EXTRAS_CONFIG_UI_NEXT === 'true';
  }
  if (process.env.EXPO_PUBLIC_FEATURE_FINANCIAL_CONFIG_UI_NEXT !== undefined) {
    envFlags.financialConfig_uiNext = process.env.EXPO_PUBLIC_FEATURE_FINANCIAL_CONFIG_UI_NEXT === 'true';
  }
  if (process.env.EXPO_PUBLIC_FEATURE_FINANCIAL_DASHBOARD_UI_NEXT !== undefined) {
    envFlags.financialDashboard_uiNext = process.env.EXPO_PUBLIC_FEATURE_FINANCIAL_DASHBOARD_UI_NEXT === 'true';
  }
  if (process.env.EXPO_PUBLIC_FEATURE_FUNCIONARIOS_UI_NEXT !== undefined) {
    envFlags.funcionarios_uiNext = process.env.EXPO_PUBLIC_FEATURE_FUNCIONARIOS_UI_NEXT === 'true';
  }
  if (process.env.EXPO_PUBLIC_FEATURE_GERENCIAR_CARDAPIO_UI_NEXT !== undefined) {
    envFlags.gerenciarCardapio_uiNext = process.env.EXPO_PUBLIC_FEATURE_GERENCIAR_CARDAPIO_UI_NEXT === 'true';
  }
  if (process.env.EXPO_PUBLIC_FEATURE_GERENCIAR_FORNECEDORES_UI_NEXT !== undefined) {
    envFlags.gerenciarFornecedores_uiNext = process.env.EXPO_PUBLIC_FEATURE_GERENCIAR_FORNECEDORES_UI_NEXT === 'true';
  }
  if (process.env.EXPO_PUBLIC_FEATURE_MAPA_MESAS_UI_NEXT !== undefined) {
    envFlags.mapaMesas_uiNext = process.env.EXPO_PUBLIC_FEATURE_MAPA_MESAS_UI_NEXT === 'true';
  }
  if (process.env.EXPO_PUBLIC_FEATURE_MENU_SETTINGS_UI_NEXT !== undefined) {
    envFlags.menuSettings_uiNext = process.env.EXPO_PUBLIC_FEATURE_MENU_SETTINGS_UI_NEXT === 'true';
  }
  if (process.env.EXPO_PUBLIC_FEATURE_MONTAGEM_UI_NEXT !== undefined) {
    envFlags.montagem_uiNext = process.env.EXPO_PUBLIC_FEATURE_MONTAGEM_UI_NEXT === 'true';
  }
  if (process.env.EXPO_PUBLIC_FEATURE_OPERATIONAL_SETTINGS_UI_NEXT !== undefined) {
    envFlags.operationalSettings_uiNext = process.env.EXPO_PUBLIC_FEATURE_OPERATIONAL_SETTINGS_UI_NEXT === 'true';
  }
  if (process.env.EXPO_PUBLIC_FEATURE_OVERFLOW_MENU_UI_NEXT !== undefined) {
    envFlags.overflowMenu_uiNext = process.env.EXPO_PUBLIC_FEATURE_OVERFLOW_MENU_UI_NEXT === 'true';
  }
  if (process.env.EXPO_PUBLIC_FEATURE_PEDIDO_DETALHES_MODAL_UI_NEXT !== undefined) {
    envFlags.pedidoDetalhesModal_uiNext = process.env.EXPO_PUBLIC_FEATURE_PEDIDO_DETALHES_MODAL_UI_NEXT === 'true';
  }
  if (process.env.EXPO_PUBLIC_FEATURE_PEDIDOS_PRONTOS_UI_NEXT !== undefined) {
    envFlags.pedidosProntos_uiNext = process.env.EXPO_PUBLIC_FEATURE_PEDIDOS_PRONTOS_UI_NEXT === 'true';
  }
  if (process.env.EXPO_PUBLIC_FEATURE_PERFORMANCE_DASHBOARD_UI_NEXT !== undefined) {
    envFlags.performanceDashboard_uiNext = process.env.EXPO_PUBLIC_FEATURE_PERFORMANCE_DASHBOARD_UI_NEXT === 'true';
  }
  if (process.env.EXPO_PUBLIC_FEATURE_PRINTER_CONFIG_UI_NEXT !== undefined) {
    envFlags.printerConfig_uiNext = process.env.EXPO_PUBLIC_FEATURE_PRINTER_CONFIG_UI_NEXT === 'true';
  }
  if (process.env.EXPO_PUBLIC_FEATURE_PRODUCT_FORM_UI_NEXT !== undefined) {
    envFlags.productForm_uiNext = process.env.EXPO_PUBLIC_FEATURE_PRODUCT_FORM_UI_NEXT === 'true';
  }
  if (process.env.EXPO_PUBLIC_FEATURE_PRODUCT_LIST_UI_NEXT !== undefined) {
    envFlags.productList_uiNext = process.env.EXPO_PUBLIC_FEATURE_PRODUCT_LIST_UI_NEXT === 'true';
  }
  if (process.env.EXPO_PUBLIC_FEATURE_PUBLIC_MENU_UI_NEXT !== undefined) {
    envFlags.publicMenu_uiNext = process.env.EXPO_PUBLIC_FEATURE_PUBLIC_MENU_UI_NEXT === 'true';
  }
  if (process.env.EXPO_PUBLIC_FEATURE_RESERVAS_UI_NEXT !== undefined) {
    envFlags.reservas_uiNext = process.env.EXPO_PUBLIC_FEATURE_RESERVAS_UI_NEXT === 'true';
  }
  if (process.env.EXPO_PUBLIC_FEATURE_RESET_PASSWORD_UI_NEXT !== undefined) {
    envFlags.resetPassword_uiNext = process.env.EXPO_PUBLIC_FEATURE_RESET_PASSWORD_UI_NEXT === 'true';
  }
  if (process.env.EXPO_PUBLIC_FEATURE_ROTAS_DELIVERY_UI_NEXT !== undefined) {
    envFlags.rotasDelivery_uiNext = process.env.EXPO_PUBLIC_FEATURE_ROTAS_DELIVERY_UI_NEXT === 'true';
  }
  if (process.env.EXPO_PUBLIC_FEATURE_STOCK_MANAGER_UI_NEXT !== undefined) {
    envFlags.stockManager_uiNext = process.env.EXPO_PUBLIC_FEATURE_STOCK_MANAGER_UI_NEXT === 'true';
  }
  if (process.env.EXPO_PUBLIC_FEATURE_UPDATE_CARDAPIO_UI_NEXT !== undefined) {
    envFlags.updateCardapio_uiNext = process.env.EXPO_PUBLIC_FEATURE_UPDATE_CARDAPIO_UI_NEXT === 'true';
  }
  if (process.env.EXPO_PUBLIC_FEATURE_VARIATION_MANAGER_UI_NEXT !== undefined) {
    envFlags.variationManager_uiNext = process.env.EXPO_PUBLIC_FEATURE_VARIATION_MANAGER_UI_NEXT === 'true';
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
  if (process.env.EXPO_PUBLIC_FEATURE_PDV_SCALE_ENABLED !== undefined) {
    envFlags.pdv_scale_enabled = process.env.EXPO_PUBLIC_FEATURE_PDV_SCALE_ENABLED === 'true';
  }
  if (process.env.EXPO_PUBLIC_FEATURE_BALANCA !== undefined) {
    envFlags.pdv_scale_enabled = process.env.EXPO_PUBLIC_FEATURE_BALANCA === 'true';
  }
  if (process.env.EXPO_PUBLIC_FEATURE_PDV_EXTERNAL_POS !== undefined) {
    envFlags.pdv_externalPos_enabled = process.env.EXPO_PUBLIC_FEATURE_PDV_EXTERNAL_POS === 'true';
  }
  if (process.env.EXPO_PUBLIC_FEATURE_PDV_SELF_SERVICE_SCALE !== undefined) {
    envFlags.pdv_selfServiceScale_enabled = process.env.EXPO_PUBLIC_FEATURE_PDV_SELF_SERVICE_SCALE === 'true';
  }
  if (process.env.EXPO_PUBLIC_FEATURE_DEV_SIMULATORS !== undefined) {
    envFlags.devSimulators = process.env.EXPO_PUBLIC_FEATURE_DEV_SIMULATORS === 'true';
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

if (typeof window !== 'undefined' && typeof __DEV__ !== 'undefined' && __DEV__) {
  window.__E2E_FEATURE_FLAGS__ = {
    enable: enableFeature,
    disable: disableFeature,
    getAll: () => ({ ...featureFlags }),
  };
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
