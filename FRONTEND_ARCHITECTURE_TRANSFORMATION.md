# Frontend Architecture Transformation Report

Date: 2026-03-13
Scope: restaurante-app + restaurante-web

Detailed baseline document:
- PHASE_1_REPOSITORY_INTELLIGENCE.md

Detailed phase 2 map:
- PHASE_2_SCREEN_FLOW_MAPPING.md

Detailed phase 3 analysis:
- PHASE_3_UX_PROBLEM_ANALYSIS.md

Detailed phase 4 visual audit:
- PHASE_4_VISUAL_DESIGN_AUDIT.md

Token usage and accessibility guide:
- DESIGN_TOKEN_USAGE_GUIDE.md

Detailed phase 5 design system:
- PHASE_5_DESIGN_SYSTEM_CREATION.md

Detailed phase 6 component system:
- PHASE_6_COMPONENT_SYSTEM.md

Detailed phase 7 UI refactor engine:
- PHASE_7_UI_REFACTOR_ENGINE.md

Phase 7 progress update:
- Shared components and first critical-screen wave refactored (NovoPedido, Delivery, Pagamento).
- Continuation wave completed for operational screens (MapaMesas, Montagem) in app and web.
- Continuation mini-wave completed for ComandaGerenciamento in app and web.
- Continuation mini-wave completed for ComandaAberta in app and web.
- Continuation mini-wave completed for ComandaVisualizacaoAdmin in app and web.
- Continuation mini-wave completed for AdminScreen visual blocks in app and web.
- Continuation mini-wave completed for AdminScreen stabilization after web JSX corruption, with semantic-token parity cleanup in app/web theme bridges.
- Continuation mini-wave completed for AdminScreen report-card dedup (local renderer extraction) in app/web with behavior preserved.
- Continuation mini-wave completed for AdminScreen header extraction into reusable component in app/web.
- Continuation mini-wave completed for AdminScreen stats cards extraction into reusable component in app/web.
- Continuation mini-wave completed for AdminScreen section-wrapper dedup in app/web (divider/title structural extraction).
- Continuation mini-wave completed for AdminScreen report-list abstraction in app/web (financial list extraction + shared list renderer).
- Continuation mini-wave completed for AdminScreen modal-wrapper dedup in app/web (renderSlideModal + renderCaixaModal helpers, ~90 lines of boilerplate removed).
- Continuation mini-wave completed for AdminScreen modal helpers completion in app/web (renderBareModal added, renderSlideModal extended with options, all Modal blocks now use helpers).
- Continuation mini-wave completed for AdminScreen CaixaMenuModal extraction in app/web (new reusable component, 60-line inline block replaced, 9 styles migrated out of AdminScreen).
- Continuation mini-wave completed for NovoPedidoScreen tokenization + header parity in app/web: added `surfaceMuted` and `primaryTint` tokens; replaced 15+ hardcoded hex/rgba values in StyleSheet and inline JSX; fixed web container background (`#F5F5DC` → `colors.background`); aligned web header icon row to use `styles.headerTitleRow` / `styles.headerTitleIcon` matching app.
- Continuation mini-wave completed for NovoPedidoScreen inline-style cleanup in app/web: moved PizzaRow text/chip styling, HeaderComponent row/column wrappers, and `SectionList` flex container from JSX inline objects into named StyleSheet entries.

## Phase 1 - Repository Intelligence Scan

### Stack and Frameworks
- Both projects use React Native + Expo (cross-platform), TypeScript/JavaScript mixed codebase.
- Navigation: React Navigation with bottom tabs + nested native stack.
- Data and backend integration: Supabase (auth, queries, realtime).
- State layers: Context API (Auth, Order, Toast).
- Styling: primarily local StyleSheet.create per screen/component + a simple shared palette file.

### Routing and Navigation Architecture
- Entrypoints are App.js in each project.
- Main shell: bottom tab navigation with role-gated tab visibility.
- Nested flow: Comandas tab opens a stack (ComandaList -> Pagamento).
- Auth flow: Login and Register stack when user is not authenticated.

### UI Architecture Observations
- Most UI is screen-level and monolithic.
- Admin screen is a large orchestrator with many modal-like local flows instead of route-level separation.
- Shared component folder exists and is largely mirrored between projects.

### Detected Technical UI Debt
- Major duplication between projects: 35+ same component paths.
- Divergent duplicates: at least 8 shared component files have different implementations between app/web.
- Inconsistent token usage: many hardcoded values and ad-hoc colors in screens.
- Mixed .js/.tsx component standards.
- Large screen files with high styling entropy (e.g. NovoPedidoScreen, GerenciarCardapioScreen).

## Phase 2 - Screen and Flow Mapping

### restaurante-app screen map
- LoginScreen: authenticate users; actions login/reset/register link; entry from Auth stack.
- RegisterCompanyScreen: tenant/company onboarding; actions register and back to login; entry from login link.
- NovoPedidoScreen: create dine-in/balcao orders; actions add/remove items, search, submit order; entry tab Novo Pedido and from MapaMesas.
- MapaMesasScreen: table map and occupancy; actions select table/open order/open admin mesas config; entry tab Mapa.
- ReservasScreen: reservation control; actions filter status/create/update reservation; entry tab Reservas.
- ComandaGerenciamentoScreen: list/open comandas; actions open payment/details; entry tab Comandas.
- PagamentoScreen: payment settlement; actions apply payment method and close comanda; entry from Comanda stack.
- CozinhaScreen: kitchen production flow; actions mark stages; entry tab Cozinha.
- MontagemScreen: assembly/packing stage; actions item completion and grouping; entry tab Montagem.
- PedidosProntosScreen: ready dispatch; actions confirm handoff; entry tab Prontos.
- RotasDeliveryScreen: delivery routes; actions open maps/send WhatsApp; entry tab RotasDelivery.
- AdminScreen: operational/financial/control center; actions open multiple admin modules; entry tab Admin and deep-links.
- CaixaAberturaScreen/CaixaOperacoesScreen/CaixaFechamentoScreen/CaixaHistoricoScreen: cash cycle operations; entry from Admin.
- FinancialDashboardScreen/FinancialConfigScreen/CashFlowScreen: finance dashboards/settings; entry from Admin.
- GerenciarCardapioScreen/CadastroProdutoScreen/UpdateCardapioScreen/admin-menu subtree: product/menu lifecycle; entry from Admin.
- EstoqueScreen/ConfiguracaoEstoqueScreen/GerenciarFornecedoresScreen: inventory and suppliers; entry from Admin.
- ConfiguracaoMesasScreen: table setup and shapes; entry from Admin and MapaMesas deep-link.
- PrinterConfigScreen/OperationalSettingsScreen/EditarEmpresaScreen/FuncionariosScreen/ExtrasConfigScreen: operational setup; entry from Admin.
- ComandaAbertaScreen/ComandaVisualizacaoAdminScreen/PedidoDetalhesModal: comanda details and admin views; entry from Comandas/Admin.
- PerformanceDashboardScreen: diagnostics dashboard; entry from Admin.

### restaurante-web screen map
- Shares 42 screen files with restaurante-app.
- Adds DeliveryScreen as first-class web delivery order flow.
- Adds ConfiguracoesWhatsApp as integration/config workflow.
- Uses same tab shell pattern with role-based visibility.

### UX weak points found in flow mapping
- Excessive modal/state branching in AdminScreen increases cognitive load.
- Many advanced operations are hidden in nested local states instead of explicit routes.
- Dense order/payment flows have long interaction chains and low progressive disclosure.

## Phase 3 - UX Problem Analysis (Ordered by severity)

1. Critical: Navigation overload in tab bar and admin orchestration.
2. Critical: Information hierarchy dilution in high-density screens (orders, menu management, admin).
3. High: Inconsistent interaction feedback (loading/error/success not standardized).
4. High: Duplicated UX behavior between app and web drifts over time.
5. High: Checkout/payment and item-edit journeys require too many manual steps.
6. Medium: Form ergonomics and scanability could improve with grouped sections and sticky CTA zones.
7. Medium: Inconsistent safe area/padding rhythm across screens.
8. Medium: Accessibility patterns are not centralized (focus states, hit areas, contrast checks).

## Phase 4 - Visual Design Audit

### Current issues
- Color role ambiguity: current palette works but lacks explicit semantic roles across UI states.
- Typography scale is mostly implicit and inconsistent per screen.
- Spacing rhythm is inconsistent (hardcoded values spread across large files).
- Component visual language differs between similar features.
- Border/shadow/radius hierarchy is not systematized.

### Accessibility concerns
- Contrast and state semantics are not guaranteed by tokenized variants.
- Some action buttons rely mainly on color without shape/label reinforcement.

## Phase 5 - Design System Creation

Implemented in both projects:
- src/design-system/tokens.ts
- src/design-system/index.ts

### Color system
- Primary: #0E7490
- Secondary: #0F172A
- Accent: #F97316
- Background: #F4F6FB
- Surface: #FFFFFF
- Success: #16A34A
- Warning: #D97706
- Error: #DC2626

### Typography
- Heading XL: 34/40 weight 800
- Heading L: 28/34 weight 800
- Heading M: 22/28 weight 700
- Body: 16/24 weight 400
- Small: 13/18 weight 500
- Button: 15/18 weight 700

### Spacing scale
- 4, 8, 12, 16, 24, 32, 48, 64

### Border radius
- Small: 8
- Medium: 12
- Large: 18
- Extra Large: 26

### Shadow levels
- Low, Medium, High, Floating (platform-aware)

## Phase 6 - Component System Architecture

### Implemented now (Phase 11 scope)
- Button
- Card
- ProductCard
- RestaurantCard
- Navbar
- Sidebar
- FormInput
- Table

Paths:
- restaurante-app/src/components/ui-next
- restaurante-web/src/components/ui-next

### Defined target set for full system
- Button, Input, Select, Checkbox, Card, ProductCard, RestaurantCard, Badge, Tag, Avatar, ListItem, Modal, Drawer, BottomSheet, Navbar, Sidebar, Tabs, Table, Pagination, Toast.

### Component principles
- Token-first styling.
- Predictable variants and size scales.
- Accessible semantics and touch targets.
- Stateless presentation with business logic injected by feature layers.

## Phase 7 - UI Refactor Engine (Completed)

### Refactors already applied
- Global shell in both App.js migrated from hardcoded colors to design-system tokens.
- New reusable component foundation added and ready for incremental adoption.
- Critical screen wave completed: NovoPedido (app), Delivery (web), Pagamento (app/web).
- Continuation screen wave completed: MapaMesas (app/web), Montagem (app/web).
- Post-wave diagnostics check returned no errors in updated files.
- AdminScreen continuation stabilization completed (web structural repair + app/web token parity for warning/danger/overlay/divider semantics).
- AdminScreen continuation dedup completed for financial/system report cards, reducing duplicated JSX and preserving action routing.
- AdminScreen continuation header extraction completed, preserving logout/greeting behavior and reducing screen-level layout duplication.
- AdminScreen continuation stats extraction completed, preserving refresh/period logic and reducing screen composition complexity.
- AdminScreen continuation section-wrapper dedup completed, preserving content behavior while simplifying repeated scaffold structure.
- AdminScreen continuation report-list abstraction completed, preserving handlers and disabled behavior while removing repeated list-mapping blocks.
- ui-next primitive adoption completed for the planned Phase 7 sequence: `ProductCard` in NovoPedido (app/web) and Delivery (web), `Button` in order/payment CTAs, `Navbar` in order/payment screen headers, and `Table` in waiter statistics admin views (app/web).
- Phase 7 validation completed with diagnostics clean across all updated screens and shared components.

### Phase 7 completion summary
1. Repeated action buttons migrated to `ui-next/Button` in NovoPedido, Delivery, and Pagamento flows.
2. Card-like browsing blocks migrated to `ui-next/ProductCard` in NovoPedido (app/web) and Delivery (web).
3. Ad-hoc headers migrated to `ui-next/Navbar` in NovoPedido, Delivery, and Pagamento.
4. List/table-heavy admin statistics migrated to `ui-next/Table` in waiter statistics views.

Phase 8 can now start on top of a stabilized Phase 7 base.

## Phase 8 - Mobile Experience Transformation Plan (restaurante-app)

- Keep tabs to max 5 primary jobs and move secondary ops to overflow.
- Introduce modern food browsing cards with category chips and sticky cart summary.
- Add clearer CTA hierarchy: Primary action fixed at bottom in cart/checkout context.
- Checkout simplification:
  - Step 1 items
  - Step 2 customer/table
  - Step 3 payment
  - Step 4 confirmation
- Improve thumb ergonomics:
  - larger touch zones
  - reduced vertical clutter
  - sectioned forms


## Phase 8 - Mobile Experience Transformation (restaurante-app)

Completed on: 2026-03-13

### 1) Navigation Shell — 5 abas primárias + overflow "Mais"
- Reduzida a barra de tabs de 9 → máx. 5 destinos por papel (admin/gerente/garcom).
- Criado MaisStack com OverflowMenuScreen como índice + destinos secundários (Montagem, Prontos, Rotas Delivery, Reservas, Admin) como telas do stack.
- Criado OverflowMenuScreen.tsx — lista role-aware com ícone + label + chevron.
- Adicionado RoleOverflowScreens e getRoleOverflowScreens() em 
oles.js.
- Papéis single-job (COZINHEIRO, MONTAGEM, ENTREGADOR) mantêm suas abas primárias sem alteração.
- Arquivo: 
estaurante-app/App.js, 
estaurante-app/src/auth/roles.js, 
estaurante-app/src/screens/OverflowMenuScreen.tsx

### 2) NovoPedidoScreen — Chips de categoria sticky
- Adicionada barra horizontal de chips acima da SectionList para navegação por categoria.
- Chip ativo reflete a seção visível no topo via onViewableItemsChanged.
- Pressionar chip rola a lista para a seção correspondente via scrollToLocation.
- Chips ocultados automaticamente quando busca filtra para ≤0 seções.
- Arquivo: 
estaurante-app/src/screens/NovoPedidoScreen.tsx

### 3) NovoPedidoScreen — Cart badge + expand/collapse
- Footer fixo agora mostra: ícone de carrinho com badge de quantidade + total + toggle.
- Botão de toggle expande/colapsa lista de itens selecionados (ScrollView máx. 180dp).
- Estado colapsado por padrão; fecha automaticamente ao remover o último item.
- Arquivo: 
estaurante-app/src/screens/NovoPedidoScreen.tsx

### 4) PagamentoScreen — StepIndicator visual
- Adicionado StepIndicator entre navbar e conteúdo mostrando 3 passos: Resumo → Pagamento → Confirmado.
- Passo ativo calculado automaticamente: saldo null=0, aberto>0=1, aberto=0=2.
- Passos concluídos exibem checkmark verde; passo ativo destaque em primary.
- Arquivo: 
estaurante-app/src/screens/PagamentoScreen.tsx

### 5) Thumb ergonomics — touch zones ≥ 44dp
- quantityBtn e 
oundBtn em NovoPedidoScreen: 32×32 → 44×44 dp.
- 
emoveBtn nos itens selecionados do carrinho: 28×28 → 44×44 dp.
- ormaBtn em PagamentoScreen: adicionado minHeight: 48 + justifyContent: center.
- Arquivo: 
estaurante-app/src/screens/NovoPedidoScreen.tsx, 
estaurante-app/src/screens/PagamentoScreen.tsx

Phase 8 is complete. Phase 9 (Web Dashboard Transformation) can start on top of this base.
## Phase 9 - Web Dashboard Transformation Plan (restaurante-web)

- Move to left-sidebar dashboard IA inspired by modern SaaS tools.
- Promote KPI summary row + filter bar + structured content panels.
- Standardize forms into multi-column responsive layouts.
- Standardize tables with clear sorting/empty/loading states.
- Keep mobile-responsive breakpoints for tablet and small laptop.

## Phase 10 - Frontend Architecture Improvement

Status: concluida em codigo e documentacao de rollout.

### Delivered structure for both apps

src/
- design-system/
- ui/
- components/
- layouts/
- features/
- hooks/
- services/
- utils/

### Separation model
- UI components: pure and reusable.
- Feature modules: orchestration, data and state.
- Service layer: backend integration.
- Screen layer: composition only.

### Delivered in Phase 10

- `src/ui/index.ts` criado em app e web como fachada estavel para primitives.
- `src/layouts/ScreenScaffold.tsx` criado em app e web e adotado nas telas auditadas.
- Features extraidas e aplicadas: `features/payments`, `features/new-order`, `features/admin` e `features/delivery` (web).
- Convergencia de `types.ts` aplicada nas features extraidas para reduzir contratos inline duplicados.
- Rollout completo de `ScreenScaffold` nas telas administrativas secundarias Pattern A em app e web, conforme detalhado em `PHASE_10_FRONTEND_ARCHITECTURE.md`.
- Resultado: objetivo estrutural da phase atingido sem mudanca de logica de negocio e com diagnosticos limpos nos arquivos migrados.

## Phase 11 - Improved Component Implementations

Implemented files:
- restaurante-app/src/components/ui-next/Button.tsx
- restaurante-app/src/components/ui-next/Card.tsx
- restaurante-app/src/components/ui-next/ProductCard.tsx
- restaurante-app/src/components/ui-next/RestaurantCard.tsx
- restaurante-app/src/components/ui-next/Navbar.tsx
- restaurante-app/src/components/ui-next/Sidebar.tsx
- restaurante-app/src/components/ui-next/FormInput.tsx
- restaurante-app/src/components/ui-next/Table.tsx
- restaurante-web/src/components/ui-next/Button.tsx
- restaurante-web/src/components/ui-next/Card.tsx
- restaurante-web/src/components/ui-next/ProductCard.tsx
- restaurante-web/src/components/ui-next/RestaurantCard.tsx
- restaurante-web/src/components/ui-next/Navbar.tsx
- restaurante-web/src/components/ui-next/Sidebar.tsx
- restaurante-web/src/components/ui-next/FormInput.tsx
- restaurante-web/src/components/ui-next/Table.tsx

## Phase 12 - Safe Migration Plan

Operational runbook:
- PHASE_12_CANARY_RUNBOOK.md

Release handoff notes:
- PHASE_12_RELEASE_NOTES.md

Current status:
- Completed in staging through wave 4 (full-phase12).
- Ready for controlled production promotion using the same wave order and canary gates.

1. Baseline
- Freeze a release branch and capture visual snapshots for key journeys.
- Define KPI baseline: task completion time, error rate, abandonment points.

2. Token rollout
- Replace hardcoded shell colors and spacing in global layout primitives first.
- Keep semantic aliases for legacy color names during transition.

3. Primitive migration
- Replace buttons, inputs, cards in low-risk screens first.
- Migrate toast and modal wrappers to standardized feedback patterns.

4. Flow migration order
- Auth and shell
- NovoPedido/Delivery browsing
- Comandas + Pagamento
- Admin dashboards and settings

5. Testing strategy
- Unit tests for ui-next components.
- Existing Jest suites remain green.
- Playwright critical flows (balcao, mesa, delivery, montagem race-condition scenarios).

6. Deployment plan
- Progressive rollout by feature flag.
- Canary users (internal operations) first.
- Monitor error and conversion metrics after each migration wave.

7. Rollback strategy
- Keep old components side-by-side during migration window.
- Screen-level switch flags for immediate fallback.

### Phase 12 continuation update (2026-03-14)

- Feature flag infrastructure completed in both app and web `src/config/featureFlags.ts` with environment overrides for all migration guards:
  - `EXPO_PUBLIC_FEATURE_LOGIN_UI_NEXT`
  - `EXPO_PUBLIC_FEATURE_REGISTER_COMPANY_UI_NEXT`
  - `EXPO_PUBLIC_FEATURE_NOVO_PEDIDO_UI_NEXT`
  - `EXPO_PUBLIC_FEATURE_DELIVERY_UI_NEXT`
  - `EXPO_PUBLIC_FEATURE_PAGAMENTO_UI_NEXT`
  - `EXPO_PUBLIC_FEATURE_COMANDA_GERENCIAMENTO_UI_NEXT`
  - `EXPO_PUBLIC_FEATURE_ADMIN_UI_NEXT`
- Auth canary guard wired: `LoginScreen` (app/web) now switches between ui-next controls and legacy controls via `login_uiNext`.
- Register canary guard wired: `RegisterCompanyScreen` (app/web) now switches between ui-next controls and legacy controls via `registerCompany_uiNext`.
- Web parity advanced: `restaurante-web/src/screens/RegisterCompanyScreen.tsx` now includes ui-next primitives under guard, matching app migration strategy.
- Orders canary guard wired: `NovoPedidoScreen` (app/web) now switches header/right-action between ui-next (`Navbar` + `Button`) and a legacy header fallback via `novoPedido_uiNext`.
- Delivery canary guard wired: `DeliveryScreen` (web) now switches header right-action between ui-next `Button` and legacy touchable action via `delivery_uiNext`.
- Payment canary guard wired: `PagamentoScreen` (app/web) now propagates `pagamento_uiNext` to payment feature components, toggling CTA/search controls between ui-next primitives and legacy touchable fallbacks.
- Comanda canary guard wired: `ComandaGerenciamentoScreen` (app/web) now switches the header logout action between ui-next `Button` and legacy icon action via `comandaGerenciamento_uiNext`.
- Admin canary guard wired: `AdminActionCard` (app/web feature layer) now switches card container rendering between ui-next `Card` and legacy touchable-card rendering via `admin_uiNext`.
- Environment rollout profiles prepared: Phase 12 flags were added to app/web env examples (`.env.example` and `.env.development.example`) with conservative defaults and canary-ready dev values.
- Rollout automation added: `scripts/phase12-profile.js` in both app/web now applies wave profiles (`legacy-safe`, `canary-auth`, `canary-ordering`, `canary-settlement`, `full-phase12`) directly to target env files.
- Staging/production templates prepared: Phase 12 flags were also added to `.env.staging.example` and `.env.production.example` for app/web, eliminating manual variable drift during promotions.
- Canary auth validation executed on web: `e2e/phase12-auth-canary.spec.ts` passed (`2 passed`), confirming login screen rendering + successful authentication path under Phase 12 guards.
- Staging rollout advanced to wave 2 (`canary-ordering`) in app/web `.env.staging` using the rollout CLI, with resulting profile: LOGIN/REGISTER_COMPANY/NOVO_PEDIDO/DELIVERY = `true`; PAGAMENTO/COMANDA_GERENCIAMENTO/ADMIN = `false`.
- Canary ordering validation executed on web: `e2e/phase12-ordering-canary.spec.ts` passed (`2 passed`) after ensuring the local web server was online, confirming navigation/render for Novo Pedido and Pedido Delivery.
- Canary settlement validation executed on web: `e2e/phase12-settlement-canary.spec.ts` passed (`1 passed`), validating Gerenciamento -> Rateio navigation and `Resumo e Pagamento` CTA rendering.
- Staging rollout advanced to wave 3 (`canary-settlement`) in app/web `.env.staging`, enabling `PAGAMENTO` and `COMANDA_GERENCIAMENTO` while keeping `ADMIN` disabled.
- Canary admin validation executed on web: `e2e/phase12-admin-canary.spec.ts` passed (`1 passed`) and remained green after enabling `admin_uiNext`, validating Admin section rendering and card-driven navigation.
- Staging rollout advanced to wave 4 (`full-phase12`) in app/web `.env.staging`, enabling all Phase 12 guards including `ADMIN`.
- Validation run completed for changed files with no TypeScript diagnostics and no ESLint issues.

## Final Outcome

The repository now has:
- A documented multi-phase transformation strategy.
- A new cross-platform design token foundation.
- A reusable startup-grade component starter kit in both app and web.
- Initial live refactor applied in both shells with zero business logic disruption.


---

## Phase 9 — Web Dashboard Transformation ✅

**Concluída.** Documentação completa em `PHASE_9_WEB_DASHBOARD.md`.

### Entregas
- **Sidebar SaaS**: `WebSidebarTabBar.tsx` — sidebar fixa 270px com brand, user chip, nav items com ícone + label + estado ativo
- **Web App shell**: `App.js` reescrito com `tabBar={WebSidebarTabBar}` + `sceneContainerStyle={{ marginLeft: 270 }}`
- **KPI Grid**: `AdminStatsCards.tsx` reescrito — autocontido, 3 blocos (Operacional / Vendas / Cancelamentos), cada um com 3 `KpiCard`s
- **Table avançada**: `Table.tsx` reescrito — `loading`, `sortable`, `onSort`, estado vazio com ícone, linhas zebradas
- **Delivery 2 colunas**: `DeliveryScreen.tsx` — painel esquerdo (formulário + itens) + painel direito (cardápio), footer sticky full-width

### Métricas
| Item | Status |
|------|--------|
| Diagnósticos TypeScript novos | 0 erros |
| Todos Phase 9 | 5/5 ✅ |