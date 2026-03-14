# Phase 11 — Lint Hardening

Date: 2026-03-14
Scope: restaurante-app + restaurante-web
Status: Complete

## Objective

Reduce static-analysis debt in the mirrored admin and payment surfaces without changing business behavior.

Primary targets:
1. Remove dead code left behind by previous refactors
2. Eliminate `no-unused-vars` warnings in high-traffic shell screens
3. Keep `restaurante-app` and `restaurante-web` aligned where screens are mirrored

## Wave 1 — Admin / Payment / Shell Cleanup

**Files changed:**
- `restaurante-app/src/screens/AdminScreen.tsx`
- `restaurante-web/src/screens/AdminScreen.tsx`
- `restaurante-app/src/screens/PagamentoScreen.tsx`
- `restaurante-web/src/screens/PagamentoScreen.tsx`
- `restaurante-app/src/screens/OverflowMenuScreen.tsx`
- `restaurante-web/src/screens/DeliveryScreen.tsx`

### AdminScreen (app + web)

Removed dead code that was no longer reachable from the dashboard:
- unused imports (`Ionicons`, `Text`, `Alert`, `ActivityIndicator`)
- unused stock alert state and helper placeholders
- orphan cleanup helpers (`limparColecao`, `ensureColecaoVazia`, `limparSomenteComandas`)
- unused loading UI for the removed cleanup flow

Result:
- dashboard behavior preserved
- system section still renders the same cards
- mirrored `AdminScreen` files remain structurally aligned

### PagamentoScreen (app + web)

Removed stale payment-flow leftovers:
- unused `activeTab` state
- unused `ordersError` destructure from Supabase query
- unnecessary catch parameter in `handleBack`
- unused `colors` import on web

Result:
- payment flow behavior preserved
- `SplitPaymentModal` flow unchanged
- `ScreenScaffold` shell preserved in both apps

### Overflow / Delivery Shells

`restaurante-app/src/screens/OverflowMenuScreen.tsx`
- removed unused `Platform` and `Roles` imports

`restaurante-web/src/screens/DeliveryScreen.tsx`
- removed unused `useEffect` import
- removed unused `metrics` destructure from performance monitor hook

## Wave 2 — ESLint Tooling Cleanup

**Files changed:**
- `restaurante-app/eslint.config.mjs` *(new)*
- `restaurante-web/eslint.config.mjs` *(new)*
- `restaurante-app/eslint.config.js` *(removed)*
- `restaurante-web/eslint.config.js` *(removed)*
- `restaurante-app/.eslintignore` *(removed)*
- `restaurante-web/.eslintignore` *(removed)*

### Tooling changes

Resolved the remaining repository-level ESLint 9 noise without changing runtime package semantics:
- migrated flat config files from `eslint.config.js` to `eslint.config.mjs`
- moved ignore rules fully into flat config via `ignores`
- removed deprecated `.eslintignore` files
- preserved the previous lint rule set in both projects

Result:
- `npx eslint` no longer emits the deprecated `.eslintignore` warning
- `npx eslint` no longer emits the `MODULE_TYPELESS_PACKAGE_JSON` warning
- no need to add `"type": "module"` to app or web `package.json`, avoiding wider runtime impact

## Wave 3 — NovoPedido Mirror Cleanup

**Files changed:**
- `restaurante-app/src/screens/NovoPedidoScreen.tsx`
- `restaurante-web/src/screens/NovoPedidoScreen.tsx`

### Screen cleanup

Reduced warning noise in the highest-volume ordering screen mirrored across app and web:
- removed unused imports (`InteractionManager`, `PizzaSize`, `PizzaConfig`, `Modal`, `FlatList`, `Keyboard`, `TouchableWithoutFeedback`)
- preserved JSX dependencies that were still active (`Navbar`, `NewOrderHeaderForm`)
- removed unused destructured values from `useNovoPedido` (`tableId`, `waiterId`, `waiters`, `observations`, `setObservations`)
- removed unused `metrics` destructure from `usePerformanceMonitor`
- simplified the `areEspetinhoPropsEqual` comparator by deleting a redundant unused loop
- removed the final unused `useRef` import on web

Result:
- `NovoPedidoScreen` is lint-clean in both `restaurante-app` and `restaurante-web`
- no TypeScript regressions were introduced

## Wave 4 — MFAService Mirror Cleanup

**Files changed:**
- `restaurante-app/src/services/MFAService.ts`
- `restaurante-web/src/services/MFAService.ts`

### Service cleanup

Reduced warning noise in the mirrored MFA service kept disabled during Supabase migration:
- removed dead constants and placeholder type (`MFAEnrollmentData`)
- prefixed intentionally unused arguments with `_` while preserving method signatures
- kept public API shape stable for callers

Result:
- `MFAService.ts` is lint-clean in both app and web
- migration-safe behavior preserved (`throwDisabledError` and placeholders remain)

## Wave 5 — useNovoPedido Mirror Cleanup

**Files changed:**
- `restaurante-app/src/hooks/useNovoPedido.ts`
- `restaurante-web/src/hooks/useNovoPedido.ts`

### Hook cleanup

Reduced warnings in a shared high-traffic business hook:
- removed unused imports (`useFocusEffect`, `OrderService`, `CaixaService`, `PizzaSize`, `Ingredient`)
- removed unused constant `CARDAPIO_CACHE_EXPIRY`
- removed unused setters from state tuples (`setTemperosCaldos`, `setTemperosComidas`, `setVariacoesEspetinho`)

Result:
- `useNovoPedido.ts` is lint-clean in both app and web
- hook behavior and return contract preserved

## Wave 6 — SupabaseOrderService Mirror Cleanup

**Files changed:**
- `restaurante-app/src/services/supabase/SupabaseOrderService.ts`
- `restaurante-web/src/services/supabase/SupabaseOrderService.ts`

### Service cleanup

Reduced warning noise in the mirrored order data service:
- removed unused imports (`RealtimeChannel`, `optimizedSupabaseClient`)
- prefixed intentionally unused args with `_` (`_dateKey`, `_garcomId`, `_periodo`, `_pagamentos`, `_comanda`)
- removed unused fetched variable in transfer operation (`currentOrder`)
- simplified `catch (e)` to `catch` where error payload was ignored

Result:
- `SupabaseOrderService.ts` is lint-clean in both app and web
- runtime behavior preserved

## Wave 7 — AuthContext + errorHandler Mirror Cleanup

**Files changed:**
- `restaurante-app/src/context/AuthContext.tsx`
- `restaurante-web/src/context/AuthContext.tsx`
- `restaurante-app/src/utils/errorHandler.ts`
- `restaurante-web/src/utils/errorHandler.ts`

### Context/utility cleanup

Removed mirrored dead symbols and unused bindings:
- `AuthContext`: removed unused imports (`AsyncStorage`, `Session`) and unused local bindings
- `errorHandler`: removed unused imports from `errors` module and unused `auditService` import; renamed unused context parameter to `_context`

Result:
- all four files are lint-clean
- no TypeScript regressions

## Wave 8 — Comanda + Metrics + Inventory Mirror Cleanup

**Files changed:**
- `restaurante-app/src/hooks/useComandaManagement.js`
- `restaurante-web/src/hooks/useComandaManagement.js`
- `restaurante-app/src/services/OrderFirestoreService.ts`
- `restaurante-web/src/services/OrderFirestoreService.ts`
- `restaurante-app/src/services/SuccessMetricsService.ts`
- `restaurante-web/src/services/SuccessMetricsService.ts`
- `restaurante-app/src/services/supabase/SupabaseInventoryService.ts`
- `restaurante-web/src/services/supabase/SupabaseInventoryService.ts`

### Mirror cleanup

Reduced mirrored warning hotspots across one hook and three services:
- `useComandaManagement`: removed unused refs/imports and unused query error binding; prefixed intentionally unused parameter
- `OrderFirestoreService`: prefixed intentionally unused params and simplified unused catch binding
- `SuccessMetricsService`: removed unused Firestore imports and prefixed intentionally unused method args
- `SupabaseInventoryService`: removed unused loop placeholder variable and prefixed unused args in stub method

Result:
- all 8 files are lint-clean in app and web
- no TypeScript regressions

## Wave 9 — Core Screen/Service Mirror Cleanup

**Files changed:**
- `restaurante-app/src/components/SplitPaymentModal.tsx`
- `restaurante-web/src/components/SplitPaymentModal.tsx`
- `restaurante-app/src/screens/ComandaGerenciamentoScreen.tsx`
- `restaurante-web/src/screens/ComandaGerenciamentoScreen.tsx`
- `restaurante-app/src/screens/LoginScreen.tsx`
- `restaurante-web/src/screens/LoginScreen.tsx`
- `restaurante-app/src/screens/PedidoDetalhesModal.tsx`
- `restaurante-web/src/screens/PedidoDetalhesModal.tsx`
- `restaurante-app/src/services/OrderService.ts`
- `restaurante-web/src/services/OrderService.ts`
- `restaurante-app/src/utils/appRestart.js`
- `restaurante-web/src/utils/appRestart.js`

### Mirror cleanup

Reduced warning debt in shared production surfaces used in order/payment/auth flows:
- removed unused React Native imports in `SplitPaymentModal` and `LoginScreen`
- removed dead imports and unused catch bindings in `ComandaGerenciamentoScreen`
- removed unused context bindings and dead formatter in `PedidoDetalhesModal`
- exported legacy fallback `CARDAPIO`, removed dead helper constant, and removed unused callback parameter in `OrderService`
- simplified unused catch bindings in `appRestart`

Result:
- all 12 files are lint-clean in app and web
- no TypeScript regressions

## Wave 10 — Table/Comanda Config Cleanup (+ PDV Web)

**Files changed:**
- `restaurante-app/src/components/TableGraphic.tsx`
- `restaurante-web/src/components/TableGraphic.tsx`
- `restaurante-app/src/screens/ComandaAbertaScreen.tsx`
- `restaurante-web/src/screens/ComandaAbertaScreen.tsx`
- `restaurante-app/src/screens/ConfiguracaoMesasScreen.tsx`
- `restaurante-web/src/screens/ConfiguracaoMesasScreen.tsx`
- `restaurante-web/src/components/PDV/NovoPedidoModal.tsx`

### Cleanup

Reduced no-unused warnings in mirrored table/comanda/config screens and one web-only PDV file:
- `TableGraphic`: removed dead imports and unused radial helper binding
- `ComandaAbertaScreen`: removed unused imports from payment/exit paths
- `ConfiguracaoMesasScreen`: removed unused `Dimensions` binding and unused catch bindings
- `PDV/NovoPedidoModal` (web): removed unused import/state (`Modal`, `getTodayKey`, `orderType` state)

Result:
- all 7 files are lint-clean in their respective targets
- no TypeScript regressions

## Wave 11 — App Test Debt Burn-down

**Files changed:**
- `restaurante-app/src/__tests__/services/OrderCreation.preservation.test.ts`
- `restaurante-app/src/utils/__tests__/validation.test.ts`
- `restaurante-app/src/components/__tests__/PerformanceDashboard.test.tsx`

### Cleanup

Reduced no-unused warning debt in high-volume app test files:
- removed unused local fixture values in preservation tests
- renamed intentionally unused property-test callback args to `_input`
- removed unused imports from validation and dashboard tests
- removed unused test destructuring in dashboard test render path

Result:
- all 3 files are lint-clean
- no TypeScript regressions

## Wave 12 — Mirrored Component Cleanup

**Files changed:**
- `restaurante-app/src/components/BiometricSetupModal.tsx`
- `restaurante-web/src/components/BiometricSetupModal.tsx`
- `restaurante-app/src/components/DraggableTable.tsx`
- `restaurante-web/src/components/DraggableTable.tsx`
- `restaurante-app/src/components/ExecutiveDashboard.tsx`
- `restaurante-web/src/components/ExecutiveDashboard.tsx`
- `restaurante-app/src/components/PerformanceMonitor.tsx`
- `restaurante-web/src/components/PerformanceMonitor.tsx`

### Cleanup

Reduced mirrored no-unused warnings in shared UI/monitoring components:
- removed unused React Native imports in biometric setup
- removed unused `View` import and prefixed optional `scale` prop binding in draggable table
- removed unused type imports in executive dashboard
- removed unused loading destructures in performance monitor

Result:
- all 8 files are lint-clean in app and web
- no TypeScript regressions

## Wave 13 — Web UI/Tela Cleanup

**Files changed:**
- `restaurante-web/src/components/ui/Toast.js`
- `restaurante-web/src/screens/CadastroProdutoScreen.tsx`
- `restaurante-web/src/screens/ConfiguracoesWhatsApp.tsx`
- `restaurante-web/src/screens/EstoqueScreen.tsx`

### Cleanup

Reduced no-unused warning debt in web-only UI/screen files:
- `Toast`: removed unused `View`/`Dimensions` imports and dead width binding
- `CadastroProdutoScreen`: removed unused auth import/destructuring bindings
- `ConfiguracoesWhatsApp`: removed unused `ConnectionStateResponse` import and unused catch binding
- `EstoqueScreen`: removed unused `Modal` and dead `getUnitType` import/binding

Result:
- all 4 files are lint-clean
- no TypeScript regressions

## Wave 14 — Mirrored Map/Register/Menu Cleanup

**Files changed:**
- `restaurante-app/src/screens/MapaMesasScreen.tsx`
- `restaurante-web/src/screens/MapaMesasScreen.tsx`
- `restaurante-app/src/screens/RegisterCompanyScreen.tsx`
- `restaurante-web/src/screens/RegisterCompanyScreen.tsx`
- `restaurante-app/src/screens/admin/menu/ProductForm.tsx`
- `restaurante-web/src/screens/admin/menu/ProductForm.tsx`
- `restaurante-app/src/screens/admin/menu/types.ts`
- `restaurante-web/src/screens/admin/menu/types.ts`

### Cleanup

Reduced mirrored no-unused warnings in shared map/register/admin menu surfaces:
- `MapaMesasScreen`: removed unused `useNavigation` and `Environment` imports
- `RegisterCompanyScreen`: removed unused `register` and `inputMaxWidth` bindings
- `admin/menu/ProductForm`: removed unused product type imports
- `admin/menu/types`: removed unused `Ingredient` and `PizzaSize` type imports

Result:
- all 8 files are lint-clean in app and web
- no TypeScript regressions

## Wave 15 — Mirrored Services Cleanup

**Files changed:**
- `restaurante-app/src/services/BiometricAuthService.ts`
- `restaurante-web/src/services/BiometricAuthService.ts`
- `restaurante-app/src/services/OrderListenerService.ts`
- `restaurante-web/src/services/OrderListenerService.ts`
- `restaurante-app/src/services/PagamentosService.ts`
- `restaurante-web/src/services/PagamentosService.ts`
- `restaurante-app/src/services/TableService.ts`
- `restaurante-web/src/services/TableService.ts`

### Cleanup

Reduced mirrored no-unused warning debt in core services:
- `BiometricAuthService`: removed unused token validation binding and simplified unused catch binding
- `OrderListenerService`: prefixed unused realtime payload args (`_payload`)
- `PagamentosService`: removed unused `Comanda` import and dead `dataHealed` assignment
- `TableService`: removed unused offline/retry helper imports

Result:
- all 8 files are lint-clean in app and web
- no TypeScript regressions

## Wave 16 — Mirrored Optimization/Helper Cleanup

**Files changed:**
- `restaurante-app/src/services/optimization/ConnectionPoolManager.ts`
- `restaurante-web/src/services/optimization/ConnectionPoolManager.ts`
- `restaurante-app/src/services/optimization/PerformanceMonitorService.ts`
- `restaurante-web/src/services/optimization/PerformanceMonitorService.ts`
- `restaurante-app/src/services/optimization/RequestDeduplicationExamples.ts`
- `restaurante-web/src/services/optimization/RequestDeduplicationExamples.ts`
- `restaurante-app/src/utils/fieldMigrationHelpers.ts`
- `restaurante-web/src/utils/fieldMigrationHelpers.ts`

### Cleanup

Reduced mirrored no-unused warnings in optimization and migration utility paths:
- `ConnectionPoolManager`: removed unused pooled connection binding and simplified unused catch binding
- `PerformanceMonitorService`: removed unused `QueryPerformanceLog` import and dead `dbStats` binding
- `RequestDeduplicationExamples`: removed unused `Deduplicate` import and prefixed unused arg (`_comandaNumber`)
- `fieldMigrationHelpers`: replaced unused destructuring with explicit deprecated-field deletion

Result:
- all 8 files are lint-clean in app and web
- no TypeScript regressions

## Wave 17 — App UI/Screens Quick Win Cleanup

**Files changed:**
- `restaurante-app/src/components/ui/Toast.js`
- `restaurante-app/src/screens/CadastroProdutoScreen.tsx`
- `restaurante-app/src/screens/EstoqueScreen.tsx`

### Cleanup

Applied app-side equivalents of prior web-only cleanup:
- `Toast`: removed unused `View`/`Dimensions` imports and dead width binding
- `CadastroProdutoScreen`: removed unused auth import and dead responsive destructures
- `EstoqueScreen`: removed unused `Modal` import and dead unit-type helper binding

Result:
- all 3 files are lint-clean in app
- no TypeScript regressions

## Wave 18 — Mirrored Components/Hooks Quick Wins

**Files changed:**
- `restaurante-app/src/components/ErrorBoundary.tsx`
- `restaurante-web/src/components/ErrorBoundary.tsx`
- `restaurante-app/src/components/EstatisticasGarcom.js`
- `restaurante-web/src/components/EstatisticasGarcom.js`
- `restaurante-app/src/components/OfflineQueueManager.js`
- `restaurante-web/src/components/OfflineQueueManager.js`
- `restaurante-app/src/components/OptimizedImage.tsx`
- `restaurante-web/src/components/OptimizedImage.tsx`
- `restaurante-app/src/hooks/usePerformanceMetrics.ts`
- `restaurante-web/src/hooks/usePerformanceMetrics.ts`
- `restaurante-app/src/hooks/usePerformanceMonitor.ts`
- `restaurante-web/src/hooks/usePerformanceMonitor.ts`

### Cleanup

Reduced mirrored no-unused warnings in shared components and monitoring hooks:
- `ErrorBoundary`: removed unused `Alert` imports
- `EstatisticasGarcom`: removed unused `comandas` destructure
- `OfflineQueueManager`: removed unused `React` default import
- `OptimizedImage`: prefixed unused optional prop binding (`_lazyThreshold`)
- `usePerformanceMetrics`: prefixed unused parameter (`_limit`)
- `usePerformanceMonitor`: removed unused `InteractionManager` import

Result:
- all 12 files are lint-clean in app and web
- no TypeScript regressions

## Wave 19 — App Test Hotspot Cleanup

**Files changed:**
- `restaurante-app/src/components/__tests__/DraggableTable.test.tsx`
- `restaurante-app/src/components/__tests__/BiometricSetupModal.test.tsx`
- `restaurante-app/src/components/__tests__/ErrorBoundary.test.tsx`
- `restaurante-app/src/components/__tests__/LazyLoadWrapper.test.tsx`
- `restaurante-app/src/components/__tests__/OptimizedImage.test.tsx`
- `restaurante-app/src/components/__tests__/PerformanceMonitor.test.tsx`

### Cleanup

Reduced concentrated no-unused warning debt in app test hotspots:
- removed unused imports (`fireEvent`, `PanResponder`, `Animated`, `act`, `Button`, `Suspense`, `View`, `waitFor`)
- removed unused render destructures (`getAllByText`, `getByRole`, `getByTestId`)
- kept test behavior/assertions unchanged

Result:
- all 6 files are lint-clean in app
- no TypeScript regressions

## Wave 20 — Web Quick Wins Batch

**Files changed:**
- `restaurante-web/src/components/FinancialCharts.js`
- `restaurante-web/src/components/TransferModal.tsx`
- `restaurante-web/src/components/comandas/AddItemsModal.js`
- `restaurante-web/src/context/OrderContext.tsx`
- `restaurante-web/src/screens/CaixaAberturaScreen.tsx`
- `restaurante-web/src/screens/ConfiguracaoEstoqueScreen.tsx`

### Cleanup

Reduced no-unused warnings in web-only quick-win files:
- `FinancialCharts`: removed unused `Platform` import
- `TransferModal`: removed unused `Keyboard` import
- `AddItemsModal`: prefixed intentionally unused argument (`_type`)
- `OrderContext`: removed unused `Alert` import
- `CaixaAberturaScreen`: removed unused `inputMaxWidth` binding
- `ConfiguracaoEstoqueScreen`: simplified unused catch binding

Result:
- all 6 files are lint-clean in web
- no TypeScript regressions

## Wave 21 — Web Screen/Menu Quick Wins

**Files changed:**
- `restaurante-web/src/screens/CozinhaScreen.tsx`
- `restaurante-web/src/screens/FuncionariosScreen.tsx`
- `restaurante-web/src/screens/GerenciarFornecedoresScreen.tsx`
- `restaurante-web/src/screens/MontagemScreen.tsx`
- `restaurante-web/src/screens/PrinterConfigScreen.tsx`
- `restaurante-web/src/screens/ReservasScreen.tsx`
- `restaurante-web/src/screens/admin/menu/MenuSettings.tsx`
- `restaurante-web/src/screens/admin/menu/StockManager.tsx`

### Cleanup

Reduced no-unused warnings in web screen/admin menu files:
- removed unused imports (`Alert`, `Ionicons`, `OrderService`, `ActivityIndicator`, `Ingredient`)
- simplified unused catch binding in supplier delete flow
- prefixed unused navigation prop binding (`_navigation`)

Result:
- all 8 files are lint-clean in web
- no TypeScript regressions

## Wave 22 — Web Final Services/Utils Burn-down

**Files changed:**
- `restaurante-web/src/services/CacheLayerService.ts`
- `restaurante-web/src/services/CaixaService.ts`
- `restaurante-web/src/services/InventoryService.ts`
- `restaurante-web/src/services/LoggerService.ts`
- `restaurante-web/src/services/PDFService.ts`
- `restaurante-web/src/services/PaginationService.ts`
- `restaurante-web/src/services/PathNormalizationService.ts`
- `restaurante-web/src/services/QueryOptimizerService.ts`
- `restaurante-web/src/services/RateLimiterService.ts`
- `restaurante-web/src/services/RetryService.ts`
- `restaurante-web/src/services/UnifiedQueryService.ts`
- `restaurante-web/src/services/optimization/CursorPaginationService.ts`
- `restaurante-web/src/services/optimization/QueryOptimizerService.ts`
- `restaurante-web/src/services/optimization/RequestDeduplicator.ts`
- `restaurante-web/src/utils/cursorValidation.ts`
- `restaurante-web/src/utils/errorHandling.js`
- `restaurante-web/src/utils/firestoreConverter.ts`

### Cleanup

Eliminated all remaining web no-unused warnings in services and utilities:
- removed unused imports/types/interfaces and dead local bindings
- prefixed intentionally unused args (`_rowsReturned`, `_ttl`, `_rowId`)
- simplified unused catch bindings
- removed unused local HTML fragment in `PDFService`

Result:
- all 17 files are lint-clean in web
- no TypeScript regressions

## Wave 23 — App Quick Wins (Screen/Context/Component)

**Files changed:**
- `restaurante-app/src/components/TransferModal.tsx`
- `restaurante-app/src/components/comandas/AddItemsModal.js`
- `restaurante-app/src/context/OrderContext.tsx`
- `restaurante-app/src/screens/CaixaAberturaScreen.tsx`
- `restaurante-app/src/screens/ConfiguracaoEstoqueScreen.tsx`
- `restaurante-app/src/screens/CozinhaScreen.tsx`
- `restaurante-app/src/screens/FuncionariosScreen.tsx`
- `restaurante-app/src/screens/GerenciarFornecedoresScreen.tsx`
- `restaurante-app/src/screens/PrinterConfigScreen.tsx`
- `restaurante-app/src/screens/admin/menu/MenuSettings.tsx`
- `restaurante-app/src/screens/admin/menu/StockManager.tsx`

### Cleanup

Applied mirrored no-unused cleanup on app-side quick-win files:
- removed unused imports (`Keyboard`, `Alert`, `Ionicons`, `ActivityIndicator`, `Ingredient`)
- removed unused responsive binding (`inputMaxWidth`)
- simplified unused catch binding
- prefixed intentionally unused argument (`_type`)

Result:
- all 11 files are lint-clean in app
- no TypeScript regressions

## Wave 24 — App Final Burn-down (Tests + Services/Utils)

**Files changed:**
- `restaurante-app/src/__tests__/integration/ComandasService.integration.test.ts`
- `restaurante-app/src/components/__tests__/AdminToolsModal.test.tsx`
- `restaurante-app/src/components/__tests__/BackgroundPattern.test.tsx`
- `restaurante-app/src/components/__tests__/EstatisticasGarcom.test.tsx`
- `restaurante-app/src/components/__tests__/ExecutiveDashboard.test.tsx`
- `restaurante-app/src/components/__tests__/OfflineQueueManager.test.tsx`
- `restaurante-app/src/components/__tests__/OptimizedFlatList.test.tsx`
- `restaurante-app/src/components/__tests__/PhonePreview.test.tsx`
- `restaurante-app/src/components/__tests__/PizzaBuilderModal.test.tsx`
- `restaurante-app/src/components/__tests__/ScreenHeader.test.tsx`
- `restaurante-app/src/context/__tests__/AuthContext.test.tsx`
- `restaurante-app/src/context/__tests__/OrderContext.test.tsx`
- `restaurante-app/src/hooks/__tests__/useComandaManagement.test.ts`
- `restaurante-app/src/hooks/__tests__/useNovoPedido.test.ts`
- `restaurante-app/src/services/CacheLayerService.ts`
- `restaurante-app/src/services/CaixaService.ts`
- `restaurante-app/src/services/InventoryService.ts`
- `restaurante-app/src/services/LoggerService.ts`
- `restaurante-app/src/services/PDFService.ts`
- `restaurante-app/src/services/PaginationService.ts`
- `restaurante-app/src/services/PathNormalizationService.ts`
- `restaurante-app/src/services/QueryOptimizerService.ts`
- `restaurante-app/src/services/RateLimiterService.ts`
- `restaurante-app/src/services/RetryService.ts`
- `restaurante-app/src/services/UnifiedQueryService.ts`
- `restaurante-app/src/services/optimization/CursorPaginationService.ts`
- `restaurante-app/src/services/optimization/QueryOptimizerService.ts`
- `restaurante-app/src/services/optimization/RequestDeduplicator.ts`
- `restaurante-app/src/utils/cursorValidation.ts`
- `restaurante-app/src/utils/errorHandling.js`
- `restaurante-app/src/utils/firestoreConverter.ts`

### Cleanup

Final no-unused cleanup pass in app warnings backlog:
- removed unused imports, locals, and destructured bindings in tests
- simplified unused catch bindings and removed dead locals in services/utils
- prefixed intentionally unused parameters (`_rowsReturned`, `_ttl`, `_rowId`)

Result:
- all 31 targeted warnings removed
- app and web now lint-clean with no warnings
- no TypeScript regressions

## Validation

- `npx eslint` re-run on all edited files: no file-level lint warnings remained in the touched files
- `npx eslint src/screens/AdminScreen.tsx` runs cleanly in `restaurante-app` and `restaurante-web` without tooling warnings
- `npx eslint src/screens/NovoPedidoScreen.tsx` runs cleanly in `restaurante-app` and `restaurante-web`
- `npx eslint src/services/MFAService.ts` runs cleanly in `restaurante-app` and `restaurante-web`
- `npx eslint src/hooks/useNovoPedido.ts` runs cleanly in `restaurante-app` and `restaurante-web`
- `npx eslint src/services/supabase/SupabaseOrderService.ts` runs cleanly in `restaurante-app` and `restaurante-web`
- `npx eslint src/context/AuthContext.tsx src/utils/errorHandler.ts` runs cleanly in `restaurante-app` and `restaurante-web`
- `npx eslint src/hooks/useComandaManagement.js src/services/OrderFirestoreService.ts src/services/SuccessMetricsService.ts src/services/supabase/SupabaseInventoryService.ts` runs cleanly in `restaurante-app` and `restaurante-web`
- `npx eslint src/screens/ComandaGerenciamentoScreen.tsx src/screens/LoginScreen.tsx src/screens/PedidoDetalhesModal.tsx src/services/OrderService.ts src/utils/appRestart.js src/components/SplitPaymentModal.tsx` runs cleanly in `restaurante-app` and `restaurante-web`
- `npx eslint src/components/TableGraphic.tsx src/screens/ComandaAbertaScreen.tsx src/screens/ConfiguracaoMesasScreen.tsx` runs cleanly in `restaurante-app`
- `npx eslint src/components/TableGraphic.tsx src/screens/ComandaAbertaScreen.tsx src/screens/ConfiguracaoMesasScreen.tsx src/components/PDV/NovoPedidoModal.tsx` runs cleanly in `restaurante-web`
- `npx eslint src/__tests__/services/OrderCreation.preservation.test.ts src/utils/__tests__/validation.test.ts src/components/__tests__/PerformanceDashboard.test.tsx` runs cleanly in `restaurante-app`
- `npx eslint src/components/BiometricSetupModal.tsx src/components/DraggableTable.tsx src/components/ExecutiveDashboard.tsx src/components/PerformanceMonitor.tsx` runs cleanly in `restaurante-app` and `restaurante-web`
- `npx eslint src/components/ui/Toast.js src/screens/CadastroProdutoScreen.tsx src/screens/ConfiguracoesWhatsApp.tsx src/screens/EstoqueScreen.tsx` runs cleanly in `restaurante-web`
- `npx eslint src/screens/MapaMesasScreen.tsx src/screens/RegisterCompanyScreen.tsx src/screens/admin/menu/ProductForm.tsx src/screens/admin/menu/types.ts` runs cleanly in `restaurante-app` and `restaurante-web`
- `npx eslint src/services/BiometricAuthService.ts src/services/OrderListenerService.ts src/services/PagamentosService.ts src/services/TableService.ts` runs cleanly in `restaurante-app` and `restaurante-web`
- `npx eslint src/services/optimization/ConnectionPoolManager.ts src/services/optimization/PerformanceMonitorService.ts src/services/optimization/RequestDeduplicationExamples.ts src/utils/fieldMigrationHelpers.ts` runs cleanly in `restaurante-app` and `restaurante-web`
- `npx eslint src/components/ui/Toast.js src/screens/CadastroProdutoScreen.tsx src/screens/EstoqueScreen.tsx` runs cleanly in `restaurante-app`
- `npx eslint src/components/ErrorBoundary.tsx src/components/EstatisticasGarcom.js src/components/OfflineQueueManager.js src/components/OptimizedImage.tsx src/hooks/usePerformanceMetrics.ts src/hooks/usePerformanceMonitor.ts` runs cleanly in `restaurante-app` and `restaurante-web`
- `npx eslint src/components/__tests__/DraggableTable.test.tsx src/components/__tests__/BiometricSetupModal.test.tsx src/components/__tests__/ErrorBoundary.test.tsx src/components/__tests__/LazyLoadWrapper.test.tsx src/components/__tests__/OptimizedImage.test.tsx src/components/__tests__/PerformanceMonitor.test.tsx` runs cleanly in `restaurante-app`
- `npx eslint src/components/FinancialCharts.js src/components/TransferModal.tsx src/components/comandas/AddItemsModal.js src/context/OrderContext.tsx src/screens/CaixaAberturaScreen.tsx src/screens/ConfiguracaoEstoqueScreen.tsx` runs cleanly in `restaurante-web`
- `npx eslint src/screens/CozinhaScreen.tsx src/screens/FuncionariosScreen.tsx src/screens/GerenciarFornecedoresScreen.tsx src/screens/MontagemScreen.tsx src/screens/PrinterConfigScreen.tsx src/screens/ReservasScreen.tsx src/screens/admin/menu/MenuSettings.tsx src/screens/admin/menu/StockManager.tsx` runs cleanly in `restaurante-web`
- `npx eslint src/services/CacheLayerService.ts src/services/CaixaService.ts src/services/InventoryService.ts src/services/LoggerService.ts src/services/PDFService.ts src/services/PaginationService.ts src/services/PathNormalizationService.ts src/services/QueryOptimizerService.ts src/services/RateLimiterService.ts src/services/RetryService.ts src/services/UnifiedQueryService.ts src/services/optimization/CursorPaginationService.ts src/services/optimization/QueryOptimizerService.ts src/services/optimization/RequestDeduplicator.ts src/utils/cursorValidation.ts src/utils/errorHandling.js src/utils/firestoreConverter.ts` runs cleanly in `restaurante-web`
- `npx eslint src/components/TransferModal.tsx src/components/comandas/AddItemsModal.js src/context/OrderContext.tsx src/screens/CaixaAberturaScreen.tsx src/screens/ConfiguracaoEstoqueScreen.tsx src/screens/CozinhaScreen.tsx src/screens/FuncionariosScreen.tsx src/screens/GerenciarFornecedoresScreen.tsx src/screens/PrinterConfigScreen.tsx src/screens/admin/menu/MenuSettings.tsx src/screens/admin/menu/StockManager.tsx` runs cleanly in `restaurante-app`
- `npx eslint src/**/*.{js,jsx,ts,tsx}` runs cleanly in `restaurante-app` and `restaurante-web` (0 warnings / 0 errors)
- `npx tsc --noEmit` passed in `restaurante-app`
- `npx tsc --noEmit` passed in `restaurante-web`

## Results

| Metric | Before | After |
|--------|--------|-------|
| App lint warnings | 246 | 0 |
| Web lint warnings | 199 | 0 |
| Total lint warnings | 445 | 0 |

Net reduction: **445 warnings removed**.

## Remaining Follow-up

The remaining work is now code-level lint burn-down only. The repository-level ESLint setup noise was resolved in this phase.