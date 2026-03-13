# Phase 3 - UX Problem Analysis

Date: 2026-03-13
Scope: restaurante-app + restaurante-web
Method: screen-flow evidence from Phase 2 + interaction density + screen complexity + feedback signal checks.

## Executive severity summary

Critical
1. Navigation overload and IA ambiguity in role-based tab shell and Admin mega-orchestration.
2. Excessive interaction density in core transactional screens (order/menu/payment), increasing operator error probability.

High
1. Weak information hierarchy in long, multi-concern screens.
2. Interaction flow fragmentation due to deep modal nesting.
3. Inconsistent user feedback patterns between equivalent flows.

Medium
1. Ergonomic inefficiencies in high-frequency POS actions.
2. Discoverability and wayfinding issues in settings/configuration modules.
3. Uneven density between scan-heavy and form-heavy areas.

## Severity-ordered problem list

### 1) Critical - Navigation overload and orchestration complexity

Problem
- Primary navigation contains too many destinations for high-frequency operations.
- Admin acts as a local router with many internal branches and embedded screens.

Why this hurts UX
- Slower route finding during rush hours.
- Higher cognitive load and task-switch friction.
- Increases training burden for new operators.

Evidence
- Multi-tab, role-gated shell in both App.js files.
- Very large Admin screens:
  - restaurante-app/src/screens/AdminScreen.tsx: 1544 lines
  - restaurante-web/src/screens/AdminScreen.tsx: 1572 lines

Affected areas
- Both projects, especially admin/staff/finance/stock operations.

Priority
- P0

---

### 2) Critical - Interaction density too high in core workflows

Problem
- Mission-critical screens concentrate many actions in a single viewport/state.

Why this hurts UX
- Increased chance of wrong taps and incomplete tasks.
- Decision fatigue in long shifts.

Evidence (interaction density)
- GerenciarCardapioScreen: 49 onPress handlers in both apps.
- NovoPedidoScreen: 15 onPress handlers.
- PagamentoScreen: 6 onPress + 5 navigate calls.
- DeliveryScreen (web): 16 onPress handlers.

Affected areas
- Order creation, menu administration, payment closure, delivery intake.

Priority
- P0

---

### 3) High - Weak information hierarchy in long screens

Problem
- Several screens mix overview, editing, and execution controls together.

Why this hurts UX
- Users cannot quickly identify what matters now versus secondary data.
- Slower completion time for recurrent operations.

Evidence (screen size hotspots)
- GerenciarCardapioScreen: 2546 app / 2559 web lines.
- NovoPedidoScreen: 1291 lines.
- FuncionariosScreen: 1076 app / 1074 web lines.
- MontagemScreen: 836 app / 842 web lines.
- ConfiguracaoMesasScreen: 839 lines in both apps.

Affected areas
- Menu, staff, montagem, table configuration, order intake.

Priority
- P1

---

### 4) High - Modal and subflow fragmentation

Problem
- Operational flows rely on many modal hops and nested states.

Why this hurts UX
- Breaks context continuity.
- Harder to recover from mistakes.

Evidence
- Comanda and order details rely on multiple modals:
  - AddItemsModal, CancelOrderModal, TransferModal, PedidoDetalhesModal.
- Admin screen opens many submodules through local toggles rather than explicit route transitions.

Affected areas
- Comanda management, montagem/prontos detail actions, admin workflows.

Priority
- P1

---

### 5) High - Feedback consistency gaps

Problem
- Loading/success/error semantics are not uniformly visible across screens.

Why this hurts UX
- Unclear system state during async operations.
- Reduced trust in critical actions (cash/payment/config saves).

Evidence (feedback signal scan)
- Screens with weak explicit feedback signals found in both apps:
  - CaixaHistoricoScreen
  - PerformanceDashboardScreen

Affected areas
- Historical and diagnostic views, potentially broader by flow path.

Priority
- P1

---

### 6) Medium - Poor mobile ergonomics in dense operator screens

Problem
- High-control density and mixed action tiers reduce one-hand efficiency.

Why this hurts UX
- Slower operation under time pressure.
- More accidental taps in repetitive tasks.

Evidence
- High onPress concentrations in NovoPedido, Estoque, ConfiguracaoMesas, Reservas, PrinterConfig.
- Dense bottom and modal action clusters in order and payment flows.

Affected areas
- Mobile app primary POS operation screens.

Priority
- P2

---

### 7) Medium - Configuration discoverability and wayfinding debt

Problem
- Settings-like modules are distributed and deeply nested.

Why this hurts UX
- Users struggle to know where to change a specific behavior.
- More support dependency.

Evidence
- Admin contains financial, printer, operational, company, stock, menu and integration branches.
- Web adds ConfiguracoesWhatsApp within same orchestration surface.

Affected areas
- Admin/settings, web integration setup.

Priority
- P2

---

### 8) Medium - Web dashboard structure not yet SaaS-grade

Problem
- Web remains tab-first and operation-dense instead of dashboard IA-first.

Why this hurts UX
- Lower scanability on wide screens.
- Harder KPI-to-action transitions.

Evidence
- Same shell/navigation model as mobile with only partial web-specific adaptation.
- Delivery and WhatsApp are added, but not yet integrated into a cohesive sidebar dashboard model.

Affected areas
- restaurante-web operational and admin experiences.

Priority
- P2

## App-specific critical hotspots

restaurante-app
- GerenciarCardapioScreen
- AdminScreen
- NovoPedidoScreen
- PagamentoScreen
- MontagemScreen
- ConfiguracaoMesasScreen

restaurante-web
- GerenciarCardapioScreen
- AdminScreen
- DeliveryScreen
- NovoPedidoScreen
- PagamentoScreen
- MontagemScreen

## Recommended mitigation order for Phase 4 onward

1. Reduce IA overload first: split Admin into route-level modules and simplify primary navigation.
2. Refactor highest-density transactional screens first: NovoPedido/Delivery/Pagamento.
3. Standardize feedback states: loading, success, error, empty, retry.
4. Introduce dashboard-first web layout with sidebar + content panels.
5. Apply ergonomic controls and action hierarchy to mobile operator flows.

## Phase 3 completion status

Completed:
- confusing navigation analysis
- interaction-step overload analysis
- information hierarchy analysis
- layout structure risks
- feedback gap analysis
- mobile ergonomics risk analysis
- severity-ranked problem list
