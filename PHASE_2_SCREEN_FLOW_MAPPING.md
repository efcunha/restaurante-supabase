# Phase 2 - Screen and Flow Mapping

Date: 2026-03-13
Scope: restaurante-app + restaurante-web

## Navigation entry map (actual shell)

### restaurante-app tab entries
- Novo Pedido
- Mapa
- Reservas
- Comandas (nested stack)
- Cozinha
- Montagem
- Prontos
- RotasDelivery
- Admin

### restaurante-web tab entries
- Novo Pedido
- Delivery
- Entregas
- Reservas
- Mapa
- Comandas (nested stack)
- Cozinha
- Montagem
- Prontos
- Admin

### Shared auth stack
- Login
- Register

### Shared nested stack
- ComandaList
- Pagamento

Evidence:
- [restaurante-app/App.js](restaurante-app/App.js)
- [restaurante-web/App.js](restaurante-web/App.js)

## A. restaurante-app Screen Mapping

| Screen | Purpose | Main user actions | Components used | Navigation entry points | UX weaknesses |
|---|---|---|---|---|---|
| LoginScreen | Authenticate operator | Login, reset password, open register, MFA verify | MFAVerificationModal | Auth stack initial | Dense form + low progressive feedback hierarchy |
| RegisterCompanyScreen | Company onboarding | Fill company/user data, submit registration, back to login | None local | Auth stack from Login register link | Long form without strong section chunking |
| NovoPedidoScreen | Create in-store orders | Search products, configure pizza, add/remove items, submit order | PizzaBuilderModal | Tab Novo Pedido; deep-link from MapaMesas | High-density layout, many simultaneous interactions |
| MapaMesasScreen | Table map and occupancy | Filter by status, open table order, jump to admin setup | TableGraphic, PedidoDetalhesModal | Tab Mapa | Mixed map + actions in one view creates cognitive load |
| ReservasScreen | Reservation operations | Create/edit reservation, filter status, update status | None local | Tab Reservas | Action clarity could improve with explicit primary CTA |
| ComandaGerenciamentoScreen | Comanda management | Open details, add items, cancel order, proceed payment | ComandaList, ComandaDetails, AddItemsModal, CancelOrderModal | Tab Comandas | Multiple modal layers can fragment task focus |
| PagamentoScreen | Settle and close commandas | Select payment method, split payment, confirm closure | SplitPaymentModal | Comandas stack (Pagamento) | Payment journey has many conditional states in one screen |
| CozinhaScreen | Kitchen production board | Track prep queue, mark production state | OptimizedFlatList | Tab Cozinha | Limited visual hierarchy between urgent and normal items |
| MontagemScreen | Packing/assembly flow | Open order details, mark/confirm assembled items | PedidoDetalhesModal | Tab Montagem | Dense task list can increase error risk under pressure |
| PedidosProntosScreen | Ready-to-dispatch queue | Review details, confirm handoff | PedidoDetalhesModal, OptimizedFlatList | Tab Prontos | Dispatch priority cues are not strongly differentiated |
| RotasDeliveryScreen | Delivery route operations | Open GPS, open WhatsApp, track route actions | None local | Tab RotasDelivery; shortcut from Admin | Utility-first layout lacks strong information grouping |
| AdminScreen | Control center/orchestrator | Open financial, stock, staff, settings, tools, clear data | BiometricSetupModal, MFASetupModal + many child screens | Tab Admin; deep-link from MapaMesas | Very large branching surface with heavy modal orchestration |
| CaixaAberturaScreen | Open cash register | Enter opening values, confirm start | None local | Admin -> Caixa | Single-step flow, but contextual guidance is limited |
| CaixaOperacoesScreen | Mid-shift cash operations | Sangria/suprimento, register operations | None local | Admin -> Caixa | Action safety feedback can be more explicit |
| CaixaFechamentoScreen | Close cash register | Review totals, confirm closing | None local | Admin -> Caixa | Summary visibility can be improved before final submit |
| CaixaHistoricoScreen | Cash history review | Browse periods, open cash flow details | CashFlowScreen | Admin -> Caixa | Table/list scanability can be improved |
| CashFlowScreen | Financial movement timeline | Filter/query movements, inspect totals | None local | Admin -> CaixaHistorico / finance | Data density with limited visual grouping |
| FinancialDashboardScreen | Financial KPIs | Inspect charts and metrics | SalesByDayChart, SalesByPaymentChart | Admin -> Finance | Dashboard sections can be more modular |
| FinancialConfigScreen | Financial settings | Update financial parameters and options | BackgroundPattern | Admin -> Finance | Form structure lacks stronger section rhythm |
| PerformanceDashboardScreen | Performance monitoring | Inspect performance indicators | PerformanceDashboard | Admin -> Performance | Diagnostic info can be simplified for non-technical users |
| OperationalSettingsScreen | Operational behavior config | Update operational toggles/settings | None local | Admin -> Settings | Discoverability of setting impact is limited |
| EditarEmpresaScreen | Company profile edit | Edit company fields, save | None local | Admin -> Settings | Long vertical form with few landmarks |
| PrinterConfigScreen | Printer setup | Configure printer, test connection | None local | Admin -> Settings | Device-status feedback can be clearer |
| FuncionariosScreen | Staff management | Create/edit staff, assign role, save | KeyboardWrapper | Admin -> Staff | Permission model explanation is not obvious inline |
| GerenciarCardapioScreen | Menu lifecycle management | Create/edit products/categories, stock link, publish updates | KeyboardWrapper | Admin -> Menu | Very large screen; mixed concerns reduce focus |
| CadastroProdutoScreen | Product creation | Fill product form and submit | KeyboardWrapper | Admin -> Menu | Input grouping can be improved for speed |
| UpdateCardapioScreen | Apply menu updates | Review/update menu entities | None local | Admin -> Menu | Update feedback/status progression can be clearer |
| admin/menu/MenuSettings | Menu-level settings | Configure menu behavior flags | None local | Admin -> Menu subflow | Settings discoverability under deep nesting |
| admin/menu/ProductForm | Product form detail | Edit fields, validations, save | None local | Admin -> Menu subflow | Dense form interactions |
| admin/menu/ProductList | Product listing | Search/filter/edit products | None local | Admin -> Menu subflow | List controls can be more compact and consistent |
| admin/menu/StockManager | Product-stock linking | Link ingredients/stock entities | None local | Admin -> Menu subflow | Relationship mapping UX is technical and verbose |
| admin/menu/VariationManager | Product variations | Create/edit variation options | None local | Admin -> Menu subflow | Variation hierarchy not visually strong |
| EstoqueScreen | Inventory center | Move stock, inspect inventory modules | BackgroundPattern + child stock screens | Admin -> Stock | Multi-function screen needs clearer task segmentation |
| ConfiguracaoEstoqueScreen | Inventory settings | Define inventory parameters | BackgroundPattern | Admin -> Stock | Settings context can be more explicit |
| GerenciarFornecedoresScreen | Supplier management | Create/edit suppliers, list and update | None local | Admin -> Stock | CRUD workflow lacks compact table-first mode |
| ExtrasConfigScreen | Extras/adicional config | Manage extras rules and values | None local | Admin -> Menu/Settings | Business rule dependencies are not obvious |
| ConfiguracaoMesasScreen | Table layout and settings | Add/remove/shape/move tables and environments | TableGraphic, DraggableTable | Admin -> Settings; deep-link from MapaMesas | Complex canvas actions need stronger affordances |
| ComandaVisualizacaoAdminScreen | Admin comanda visualization | Inspect commanda details and waiter stats | EstatisticasGarcomContainer | Admin -> Comandas | Insights and raw details compete for attention |
| ComandaAbertaScreen | Open commanda detail | Review open commanda data | None local | Comanda/Admin subflow | Contextual actions are not always prioritized |
| PedidoDetalhesModal | Order detail modal | Review details, transfer, navigate to Comandas | TransferModal | Opened from MapaMesas/Montagem/Prontos | Modal depth can disrupt navigation continuity |

## B. restaurante-web Screen Mapping

| Screen | Purpose | Main user actions | Components used | Navigation entry points | UX weaknesses |
|---|---|---|---|---|---|
| LoginScreen | Authenticate operator | Login, reset, open register, MFA verify | MFAVerificationModal | Auth stack initial | Same as app: dense entry state and limited hierarchy |
| RegisterCompanyScreen | Company onboarding | Register tenant/company and return login | None local | Auth stack from Login | Same long-form friction as app |
| NovoPedidoScreen | Counter/table order creation | Search items, configure pizza, add cart, submit | PizzaBuilderModal | Tab Novo Pedido; from MapaMesas | High interaction density in one screen |
| DeliveryScreen | Delivery order creation | Customer/address, item selection, fee, submit delivery order | PizzaBuilderModal | Tab Delivery | Long mixed flow (customer + cart + logistics) in one view |
| Entregas (RotasDeliveryScreen) | Dispatch and route ops | Open maps/WhatsApp, route handling | None local | Tab Entregas; shortcut from Admin | Utility actions not grouped by route status |
| ReservasScreen | Reservation management | Create/edit/filter reservations | None local | Tab Reservas | Similar scanability issues as app |
| MapaMesasScreen | Table map | Open order by table, inspect details, jump admin | TableGraphic, PedidoDetalhesModal | Tab Mapa | Dense controls + details in same viewport |
| ComandaGerenciamentoScreen | Comanda lifecycle | Add items, inspect details, cancel, pay | ComandaList, ComandaDetails, AddItemsModal, CancelOrderModal | Tab Comandas | Modal stacking and context switching |
| PagamentoScreen | Payment closure | Split and settle comanda, return to list/map | SplitPaymentModal | Comandas stack | Complex conditional states in one page |
| CozinhaScreen | Kitchen queue | Track and complete production stages | OptimizedFlatList | Tab Cozinha | Priority/urgency emphasis could be stronger |
| MontagemScreen | Assembly and packing | Open details, confirm preparation states | PedidoDetalhesModal | Tab Montagem | Similar high-density operational UI as app |
| PedidosProntosScreen | Ready dispatch queue | Validate and dispatch ready orders | PedidoDetalhesModal, OptimizedFlatList | Tab Prontos | Dispatch actions could be more explicit CTA-based |
| AdminScreen | Main admin cockpit | Open finance/menu/stock/staff/settings modules, open WhatsApp config | BiometricSetupModal, MFASetupModal, ConfiguracoesWhatsApp + many child screens | Tab Admin | Oversized orchestration screen with deep local branching |
| ConfiguracoesWhatsApp | WhatsApp integration config | Set credentials and integration behaviors | None local | Admin subflow | Config complexity needs clearer stepper onboarding |
| CaixaAberturaScreen | Open cash register | Start shift cash record | None local | Admin -> Caixa | Limited contextual hinting |
| CaixaOperacoesScreen | Cash operations | Register movements | None local | Admin -> Caixa | Similar UX debt as app |
| CaixaFechamentoScreen | Close cash register | Validate totals and close register | None local | Admin -> Caixa | Confirmation model can be safer and clearer |
| CaixaHistoricoScreen | Cash history | Navigate history and open details | CashFlowScreen | Admin -> Caixa | Data hierarchy needs stronger grouping |
| CashFlowScreen | Financial movement analysis | Filter and inspect flow | None local | Admin finance/cash | Heavy information density |
| FinancialDashboardScreen | Financial dashboard | Review charts, compare metrics | SalesByDayChart, SalesByPaymentChart | Admin finance | Dashboard modularity can improve |
| FinancialConfigScreen | Financial configuration | Update finance behavior and defaults | BackgroundPattern | Admin finance | Settings discoverability and explanation |
| PerformanceDashboardScreen | Performance diagnostics | Review performance telemetry | PerformanceDashboard | Admin tools | Technical signal can be simplified |
| OperationalSettingsScreen | Operational config | Toggle and tune operation settings | None local | Admin settings | Low guidance on side effects |
| EditarEmpresaScreen | Company profile settings | Edit/save legal/company data | None local | Admin settings | Form sectioning can improve |
| PrinterConfigScreen | Printer setup | Configure and test printers | None local | Admin settings | Status and troubleshooting guidance is sparse |
| FuncionariosScreen | Staff management | CRUD staff + roles | KeyboardWrapper | Admin staff | Role permission clarity can improve |
| GerenciarCardapioScreen | Menu management hub | Manage products/categories/links | KeyboardWrapper | Admin menu | Monolithic and hard to scan |
| CadastroProdutoScreen | Product register | Create product item | KeyboardWrapper | Admin menu | Same form friction as app |
| UpdateCardapioScreen | Menu updates | Update cardapio entities | None local | Admin menu | Update feedback not strongly staged |
| admin/menu/MenuSettings | Menu behavior settings | Adjust menu options | None local | Admin menu subflow | Deep nesting hurts findability |
| admin/menu/ProductForm | Product details form | Edit product details and submit | None local | Admin menu subflow | Dense inputs |
| admin/menu/ProductList | Product listing | Filter/list/edit products | None local | Admin menu subflow | List controls consistency |
| admin/menu/StockManager | Menu-stock linking | Link stock resources to menu products | None local | Admin menu subflow | Technical mapping UX |
| admin/menu/VariationManager | Product variation rules | Add/edit variations | None local | Admin menu subflow | Variation hierarchy readability |
| EstoqueScreen | Stock hub | Manage inventory + supplier/config modules | BackgroundPattern + child stock screens | Admin stock | Multi-tasking view needs clearer IA |
| ConfiguracaoEstoqueScreen | Inventory settings | Configure stock behavior | BackgroundPattern | Admin stock | Similar settings discoverability debt |
| GerenciarFornecedoresScreen | Supplier management | CRUD supplier records | None local | Admin stock | CRUD scanability and quick actions |
| ExtrasConfigScreen | Extras config | Manage add-ons and rules | None local | Admin menu/settings | Rule dependencies unclear |
| ConfiguracaoMesasScreen | Table layout configuration | Edit map/shape/environment/table rules | TableGraphic, DraggableTable | Admin settings; from MapaMesas | Canvas interactions need stronger affordance |
| ComandaVisualizacaoAdminScreen | Admin commanda analytics/detail | Inspect commandas and waiter stats | EstatisticasGarcomContainer | Admin commanda module | Dense mixed analytics/detail |
| ComandaAbertaScreen | Open comanda detail | Inspect and operate on open comanda | None local | Comanda/Admin subflow | Action prioritization can improve |
| PedidoDetalhesModal | Order detail modal | Review details, transfer order, navigate Comandas | TransferModal | Opened in multiple operational screens | Modal stacking + context continuity risk |

## Flow-level observations (cross-project)

1. Core user journeys are stable and discoverable by role-gated tabs, but tabs are overloaded for power users.
2. Admin is currently an orchestration mega-screen instead of route-driven modules, increasing step ambiguity.
3. Payment and order editing journeys are functionally complete but interaction-heavy (too many states in same screen).
4. Kitchen/Montagem/Prontos operational chain exists clearly, yet urgency signaling can be stronger.
5. Web-only Delivery and ConfiguracoesWhatsApp are correctly separated, but still mixed with dense forms/actions.

## Phase 2 completion status

Completed for both app and web:
- screen/page mapping
- purpose identification
- main action mapping
- component usage mapping
- navigation entry-point mapping
- per-screen UX weakness identification
