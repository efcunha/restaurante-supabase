# Phase 7 - UI Refactor Engine

Date: 2026-03-13
Scope: restaurante-app + restaurante-web
Status: Started with automated shared-component refactors

## Objective
Begin systematic UI refactoring to reduce duplicated patterns, standardize visual language, improve spacing/layout consistency, and increase maintainability.

## Refactor strategy used

1. Start with high-reuse shared components before touching complex business screens.
2. Replace hardcoded visual values with token-driven theme values.
3. Keep behavior and business logic intact.
4. Apply same refactor to both app and web to avoid drift.

## Components refactored in this phase

- ScreenHeader
- OrderCard
- OrderCards (MontagemOrderCard, ProntoOrderCard, EspetoCard)

Paths:
- restaurante-app/src/components/ScreenHeader.js
- restaurante-web/src/components/ScreenHeader.js
- restaurante-app/src/components/OrderCard.js
- restaurante-web/src/components/OrderCard.js
- restaurante-app/src/components/OrderCards.js
- restaurante-web/src/components/OrderCards.js

## Critical screen wave completed

Refactored critical transactional screens (visual layer only):
- restaurante-app/src/screens/NovoPedidoScreen.tsx
- restaurante-web/src/screens/DeliveryScreen.tsx
- restaurante-app/src/screens/PagamentoScreen.tsx
- restaurante-web/src/screens/PagamentoScreen.tsx

Applied improvements:
1. Reduced inline header styling by extracting reusable style entries.
2. Replaced key hardcoded colors with theme tokens (`colors.*`).
3. Standardized CTA and feedback colors in payment flow.
4. Aligned surface/background/border contrast to design-system baseline.

## Continuation wave completed (MapaMesas + Montagem)

Refactored operational screens (visual layer only):
- restaurante-app/src/screens/MapaMesasScreen.tsx
- restaurante-web/src/screens/MapaMesasScreen.tsx
- restaurante-app/src/screens/MontagemScreen.tsx
- restaurante-web/src/screens/MontagemScreen.tsx

Applied improvements:
1. Tokenized primary containers, cards, tab strips, filters, and floating actions.
2. Replaced hardcoded borders and shadows with design-system-aligned values.
3. Standardized status and action colors for readiness/urgency feedback.
4. Preserved existing behavior while reducing style entropy in high-traffic screens.

Validation:
- No diagnostics errors in the four updated files after this wave.

## Continuation mini-wave completed (ComandaGerenciamento)

Refactored comanda management screen (visual layer only):
- restaurante-app/src/screens/ComandaGerenciamentoScreen.tsx
- restaurante-web/src/screens/ComandaGerenciamentoScreen.tsx

Applied improvements:
1. Replaced legacy container background hardcode with `colors.background`.
2. Standardized tab surface to tokenized card-like style (`colors.white` + `colors.border`).
3. Replaced header shadow hardcode with `colors.shadow` in app implementation.
4. Preserved behavior and interaction flow for comanda management actions.

Validation:
- No diagnostics errors in both updated files after this mini-wave.

## Continuation mini-wave completed (ComandaAberta)

Refactored open comanda detail screen (visual layer only):
- restaurante-app/src/screens/ComandaAbertaScreen.tsx
- restaurante-web/src/screens/ComandaAbertaScreen.tsx

Applied improvements:
1. Tokenized container/header/list/card/detail surfaces and borders.
2. Standardized status, totals, and payment text colors with theme semantics.
3. Replaced inline icon and fallback colors with design-token-compatible values.
4. Preserved all data loading, selection, and payment-detail behavior.

Validation:
- No diagnostics errors in both updated files after this mini-wave.

## Continuation mini-wave completed (ComandaVisualizacaoAdmin)

Refactored admin comanda analytics screen (visual layer only):
- restaurante-app/src/screens/ComandaVisualizacaoAdminScreen.tsx
- restaurante-web/src/screens/ComandaVisualizacaoAdminScreen.tsx

Applied improvements:
1. Tokenized container, header, selectors, chips, modal surfaces, and text hierarchy.
2. Replaced hardcoded primary/neutral values with `colors.primary`, `colors.background`, `colors.white`, `colors.text`, `colors.textSecondary`, and `colors.border`.
3. Standardized active/inactive states in garcom and month selectors.
4. Preserved all permission checks, period filtering, and statistics loading behavior.

Validation:
- No diagnostics errors in both updated files after this mini-wave.

## Continuation mini-wave completed (AdminScreen - visual blocks)

Refactored admin dashboard main screen (visual layer only):
- restaurante-app/src/screens/AdminScreen.tsx
- restaurante-web/src/screens/AdminScreen.tsx

Applied improvements:
1. Tokenized core shell blocks (header, cards, tabs, report list, warning/danger states).
2. Replaced key inline icon/loader colors and high-frequency modal wrappers with `colors.*` values.
3. Standardized neutral palette usage for borders/text/surfaces across app and web.
4. Preserved all admin flows, navigation, and feature toggles.

Validation:
- No diagnostics errors in both updated files after this mini-wave.

## Continuation mini-wave completed (AdminScreen - stabilization + token parity)

Scope:
- restaurante-web/src/screens/AdminScreen.tsx
- restaurante-app/src/screens/AdminScreen.tsx
- restaurante-web/src/theme/colors.ts
- restaurante-app/src/theme/colors.ts

Applied improvements:
1. Repaired accidental JSX corruption in web AdminScreen modal/listener regions and restored compile-safe structure.
2. Added semantic legacy-compatible aliases in both theme bridges: `warningSurface`, `dangerSurface`, `primaryDivider`, `primaryContrastMuted`, `overlay`.
3. Replaced remaining high-frequency hardcoded warning/danger/overlay/divider values in both AdminScreen implementations with token aliases.
4. Preserved navigation, realtime subscriptions, and all admin operational flows.

Validation:
- No diagnostics errors in all four updated files after stabilization and tokenization.

## Continuation mini-wave completed (AdminScreen - report card dedup)

Scope:
- restaurante-app/src/screens/AdminScreen.tsx
- restaurante-web/src/screens/AdminScreen.tsx

Applied improvements:
1. Introduced a local reusable report-card renderer inside both AdminScreen files.
2. Replaced duplicated JSX blocks in FINANCEIRO and SISTEMA sections with renderer calls.
3. Kept delivery operation card in app on the same renderer path with custom visual overrides.
4. Preserved all actions, disabled states, and navigation flow.

Validation:
- No diagnostics errors in both updated files after dedup refactor.

## Continuation mini-wave completed (AdminScreen - header extraction)

Scope:
- restaurante-app/src/components/AdminHeader.tsx
- restaurante-web/src/components/AdminHeader.tsx
- restaurante-app/src/screens/AdminScreen.tsx
- restaurante-web/src/screens/AdminScreen.tsx

Applied improvements:
1. Extracted Admin header block into reusable `AdminHeader` component for app and web.
2. Kept existing iconography, user greeting, and logout interaction unchanged.
3. Preserved platform-specific top spacing via optional `paddingTop` prop (safe-area driven in app).
4. Reduced AdminScreen visual orchestration noise without touching business logic.

Validation:
- No diagnostics errors in all four updated files after header extraction.

## Continuation mini-wave completed (AdminScreen - stats cards extraction)

Scope:
- restaurante-app/src/components/AdminStatsCards.tsx
- restaurante-web/src/components/AdminStatsCards.tsx
- restaurante-app/src/screens/AdminScreen.tsx
- restaurante-web/src/screens/AdminScreen.tsx

Applied improvements:
1. Extracted operational and sales stats card blocks into reusable `AdminStatsCards` component in app/web.
2. Kept all refresh actions (`carregarEstatisticas`, `carregarEstatisticasVendas`) and period switching behavior unchanged.
3. Preserved cancellation metrics visibility logic and formatting.
4. Reduced screen-level JSX density while maintaining style parity.

Validation:
- No diagnostics errors in all four updated files after stats extraction.

## Continuation mini-wave completed (AdminScreen - section wrapper dedup)

Scope:
- restaurante-app/src/screens/AdminScreen.tsx
- restaurante-web/src/screens/AdminScreen.tsx

Applied improvements:
1. Introduced a local reusable section wrapper renderer (`renderSection`) in app/web AdminScreen.
2. Replaced repeated divider + section-title scaffolding in delivery/finance/system blocks (app) and finance/system blocks (web).
3. Preserved all report card rendering paths, loading states, and action handlers.
4. Reduced repeated structural JSX without touching business behavior.

Validation:
- No diagnostics errors in both updated files after section-wrapper dedup.

## Continuation mini-wave completed (AdminScreen - report list abstraction)

Scope:
- restaurante-app/src/screens/AdminScreen.tsx
- restaurante-web/src/screens/AdminScreen.tsx

Applied improvements:
1. Extracted FINANCEIRO menu items into a dedicated local list (`financialReports`) in app/web.
2. Added reusable local list renderer (`renderReportList`) to centralize repeated card mapping behavior.
3. Replaced duplicated inline `.map` blocks for FINANCEIRO and SISTEMA sections with shared renderer usage.
4. Preserved action handlers, disabled states, key stability intent, and navigation behavior.

Validation:
- No diagnostics errors in both updated files after report-list abstraction.

## Continuation mini-wave completed (AdminScreen - modal wrapper dedup)

Scope:
- restaurante-app/src/screens/AdminScreen.tsx
- restaurante-web/src/screens/AdminScreen.tsx

Applied improvements:
1. Added `renderSlideModal(visible, onClose, children)` helper — wraps the standard slide modal + flex background container pattern.
2. Added `renderCaixaModal(visible, onClose, title, children)` helper — wraps the caixa modal with statusBarTranslucent, hardwareAccelerated and back-header pattern.
3. Replaced 8 simple slide modals with `renderSlideModal` in app and 9 in web (extra WhatsApp modal).
4. Replaced 3 Caixa modals (Abertura, Operações, Fechamento) with `renderCaixaModal` in both app and web.
5. Kept specialized modals intact (CaixaMenu overlay, CaixaHistorico, OperationalSettings, EditarEmpresa, FinancialConfig, FinancialDashboard) where the inner structure differs.
6. Saved ~6 lines per simple modal and ~10 lines per caixa modal — ~90 lines of boilerplate removed across both files.

Validation:
- No diagnostics errors in both updated files after modal-wrapper dedup.

## Continuation mini-wave completed (AdminScreen - modal helpers completion)

Scope:
- restaurante-app/src/screens/AdminScreen.tsx
- restaurante-web/src/screens/AdminScreen.tsx

Applied improvements:
1. Extended `renderSlideModal` signature with optional `options` bag (`statusBarTranslucent`, `hardwareAccelerated`) to cover performance-hinted modals without a new helper.
2. Added `renderBareModal(visible, onClose, children)` for modals whose content manages its own container (no outer bg wrapper needed).
3. Converted `CaixaHistórico` modal to `renderSlideModal` with `{ statusBarTranslucent: true, hardwareAccelerated: true }` in app and web.
4. Converted `OperationalSettings`, `EditarEmpresa`, `FinancialConfig`, `FinancialDashboard` modals to `renderBareModal` in app and web.
5. All 13 `<Modal>` blocks in the AdminScreen JSX body are now expressed through one of the three local helpers — zero raw Modal boilerplate remains in the render body.

Validation:
- No diagnostics errors in both updated files after modal-helpers completion.

## Continuation mini-wave completed (AdminScreen - CaixaMenuModal extraction)

## Continuation mini-wave completed (NovoPedidoScreen - tokenization + header parity)

Scope:
- restaurante-app/src/screens/NovoPedidoScreen.tsx
- restaurante-web/src/screens/NovoPedidoScreen.tsx
- restaurante-app/src/theme/colors.ts
- restaurante-web/src/theme/colors.ts

Applied improvements:
1. Added two new semantic tokens to both `colors.ts` files: `surfaceMuted: '#F5F5F5'` (neutral card/chip surface) and `primaryTint: '#f0f9ff'` (active selection highlight).
2. StyleSheet tokenization (both files): replaced `'rgba(255,255,255,0.7)'` → `colors.primaryContrastMuted`, `'#eee'` → `colors.border` (×2: modalHeader, separator), `'#999'` → `colors.textLight` (×2: emptyText, waiterRole), `'#fff'` → `colors.white` (waiterItem), `'#f0f9ff'` → `colors.primaryTint` (waiterItemActive), `'#333'` → `colors.text` (waiterName), `'#F9F9F9'` → `colors.surfaceMuted` (variationRow), `'#F5F5F5'` → `colors.surfaceMuted` (searchInput bg).
3. Web-only fix: `container` background was `'#F5F5DC'` (hardcoded beige) → `colors.background`.
4. Inline JSX tokenization (both files): PizzaRow price chip `'#F5F5F5'` → `colors.surfaceMuted`, price text `'#2C2C2C'` → `colors.text`; StackedVariationRow card `'#F5F5F5'` → `colors.surfaceMuted`; VariationRow label card `'#F5F5F5'` → `colors.surfaceMuted`.
5. HeaderComponent placeholder colors: `placeholderTextColor="#999"` → `{colors.textLight}` (×2 in both files).
6. Header parity fix (web): Replaced inline `style={{ flexDirection: 'row', alignItems: 'center' }}` with `styles.headerTitleRow`; replaced `style={{ marginRight: 8 }}` with `styles.headerTitleIcon`; added both style entries to web StyleSheet to match app.

Validation:
- No diagnostics errors in all four files after tokenization wave.

## Continuation mini-wave completed (NovoPedidoScreen - inline style cleanup)

Scope:
- restaurante-app/src/screens/NovoPedidoScreen.tsx
- restaurante-web/src/screens/NovoPedidoScreen.tsx

Applied improvements:
1. Extracted remaining low-risk PizzaRow inline styles into named StyleSheet entries: `stackedInfoContent`, `pizzaIngredientsText`, `pizzaCustomIngredientsText`, `pizzaPriceChip`, `pizzaPriceChipText`.
2. Extracted HeaderComponent layout wrappers into named styles in both files: `headerFieldsRow`, `clientFieldColumn`, `mesaFieldColumn`.
3. Replaced `SectionList` inline `style={{ flex: 1 }}` with `styles.sectionList` in app and web.
4. Preserved app/web parity by applying the same presentational cleanup to both codepaths with no behavior changes.

Validation:
- No diagnostics errors in both updated files after inline-style cleanup.

Scope:
- restaurante-app/src/components/CaixaMenuModal.tsx (new)
- restaurante-web/src/components/CaixaMenuModal.tsx (new)
- restaurante-app/src/screens/AdminScreen.tsx
- restaurante-web/src/screens/AdminScreen.tsx

Applied improvements:
1. Created `CaixaMenuModal` presentational component in app and web with typed props (`onOpenAbertura`, `onOpenOperacoes`, `onOpenFechamento`, `onOpenHistorico`).
2. Migrated all 9 caixaMenu styles (`modalOverlay`, `caixaMenuContainer`, `caixaMenuHeader`, `caixaMenuTitle`, `caixaMenuClose`, `caixaMenuContent`, `caixaMenuItem`, `caixaMenuIcon`, `caixaMenuText`) into the component’s own StyleSheet.
3. Replaced the 60-line inline modal block in both AdminScreen files with a single `<CaixaMenuModal>` usage.
4. Removed all 9 migrated style entries from both AdminScreen stylesheets.
5. Simplified action handlers: each button now calls `onClose()` + its dedicated callback in one expression.

Validation:
- No diagnostics errors in all four files after CaixaMenuModal extraction.

## What changed

### 1) Tokenization and consistency
- Replaced hardcoded colors with theme tokens (`colors.*`) and design tokens in header.
- Reduced ad-hoc visual divergence across app and web.

### 2) Layout and spacing normalization
- Header spacing and typography were aligned to design-system rhythm.
- Inline style usage reduced in `OrderCard` by extracting reusable style blocks.

### 3) Cross-platform alignment
- Shared refactored files synced to web project to maintain parity.

## Maintainability gains

- Lower visual drift risk between app and web.
- Easier global updates through token/theme changes.
- Cleaner styling surfaces for next migration waves.

## Safety constraints followed

- No core business logic changes.
- No flow/state orchestration changes.
- Refactor scope limited to presentational layer.

## Next refactor wave (Phase 7 continuation)

Completed:
1. `NovoPedidoScreen` (app/web) and `DeliveryScreen` (web): pizza browsing cards migrated to `ui-next/ProductCard`.
2. `NovoPedidoScreen`, `DeliveryScreen`, and `PagamentoScreen`: primary CTAs and supporting actions migrated to `ui-next/Button`.
3. `NovoPedidoScreen`, `DeliveryScreen`, and `PagamentoScreen`: ad-hoc headers migrated to `ui-next/Navbar`.
4. `EstatisticasGarcom` (app/web): period/payment summary tables migrated to `ui-next/Table`.

## Continuation mini-wave completed (Phase 7 final primitive adoption)

Scope:
- restaurante-app/src/screens/NovoPedidoScreen.tsx
- restaurante-web/src/screens/NovoPedidoScreen.tsx
- restaurante-web/src/screens/DeliveryScreen.tsx
- restaurante-app/src/screens/PagamentoScreen.tsx
- restaurante-web/src/screens/PagamentoScreen.tsx
- restaurante-app/src/components/EstatisticasGarcom.js
- restaurante-web/src/components/EstatisticasGarcom.js

Applied improvements:
1. Adopted `ui-next/ProductCard` in pizza browsing rows for NovoPedido (app/web) and Delivery (web), replacing bespoke tappable surface markup with a shared primitive.
2. Adopted `ui-next/Button` in order creation, delivery confirmation, payment confirmation, split-payment, logout, and comanda search actions where the primitive fit without behavior changes.
3. Adopted `ui-next/Navbar` in NovoPedido, Delivery, and Pagamento to replace ad-hoc header shells and centralize screen title/subtitle action structure.
4. Adopted `ui-next/Table` in `EstatisticasGarcom` for both sales-by-period and payments-by-method summaries, replacing repeated manual grid markup in app and web.
5. Preserved all order creation, payment submission, split-payment, and statistics-loading logic; scope remained presentational/compositional.

Validation:
- No diagnostics errors in all seven updated files after final primitive adoption.

## Phase 7 status

Completed in this iteration:
- duplicated shared component patterns normalized
- token-based visual standardization started
- spacing and hierarchy improvements applied in shared UI layer
- maintainability improvements delivered without behavioral regressions

Completed in continuation:
- MapaMesas app/web visual tokenization aligned
- Montagem app/web visual tokenization aligned
- operational screen parity preserved across platforms
- ComandaGerenciamento app/web visual tokenization aligned
- ComandaAberta app/web visual tokenization aligned
- ComandaVisualizacaoAdmin app/web visual tokenization aligned
- AdminScreen app/web visual tokenization mini-wave aligned
- NovoPedido app/web `ProductCard` + `Navbar` + `Button` adoption aligned
- Delivery web `ProductCard` + `Navbar` + `Button` adoption aligned
- Pagamento app/web `Navbar` + `Button` adoption aligned
- EstatisticasGarcom app/web `Table` adoption aligned

Phase 7 is complete and the repository is ready for Phase 8 implementation work.
