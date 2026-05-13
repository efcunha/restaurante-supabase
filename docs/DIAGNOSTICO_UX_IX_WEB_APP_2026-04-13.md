# Diagnostico UX/IX - restaurante-web e restaurante-app (2026-04-13)

## Parte 1 - Inventario de Telas

### 1.1 Telas restaurante-web

| Tela | Arquivo | Rota/path | Fluxo critico | UI_NEXT | |
|---|---|---|---|---|---|
| AboutScreen | restaurante-web/src/screens/AboutScreen.tsx | About (/sobre) | Auth | nao |  |
| AdminScreen | restaurante-web/src/screens/AdminScreen.tsx | Tab Admin | Admin | admin_uiNext (consumida em AdminActionCard, nao na tela raiz) |  |
| BillingScreen | restaurante-web/src/screens/BillingScreen.tsx | Interna (estado local/modais) | Admin | nao |  |
| CadastroProdutoScreen | restaurante-web/src/screens/CadastroProdutoScreen.tsx | Interna (estado local/modais) | Balcao | nao |  |
| CaixaAberturaScreen | restaurante-web/src/screens/CaixaAberturaScreen.tsx | Interna (estado local/modais) | Caixa | nao |  |
| CaixaFechamentoScreen | restaurante-web/src/screens/CaixaFechamentoScreen.tsx | Interna (estado local/modais) | Caixa | nao |  |
| CaixaHistoricoScreen | restaurante-web/src/screens/CaixaHistoricoScreen.tsx | Interna (estado local/modais) | Caixa | nao |  |
| CaixaOperacoesScreen | restaurante-web/src/screens/CaixaOperacoesScreen.tsx | Interna (estado local/modais) | Caixa | nao |  |
| CancellationReportScreen | restaurante-web/src/screens/CancellationReportScreen.tsx | Interna (estado local/modais) | Admin | nao |  |
| CashFlowScreen | restaurante-web/src/screens/CashFlowScreen.tsx | Interna (estado local/modais) | Caixa | nao |  |
| ComandaAbertaScreen | restaurante-web/src/screens/ComandaAbertaScreen.tsx | Interna (estado local/modais) | Balcao | nao |  |
| ComandaGerenciamentoScreen | restaurante-web/src/screens/ComandaGerenciamentoScreen.tsx | Stack Comandas > ComandaList | Balcao | comandaGerenciamento_uiNext |  |
| ComandaVisualizacaoAdminScreen | restaurante-web/src/screens/ComandaVisualizacaoAdminScreen.tsx | Interna (estado local/modais) | Admin | nao |  |
| ConfiguracaoEstoqueScreen | restaurante-web/src/screens/ConfiguracaoEstoqueScreen.tsx | Interna (estado local/modais) | Admin | nao |  |
| ConfiguracaoMesasScreen | restaurante-web/src/screens/ConfiguracaoMesasScreen.tsx | Interna (estado local/modais) | Mesa | nao |  |
| ConfiguracoesWhatsApp | restaurante-web/src/screens/ConfiguracoesWhatsApp.tsx | Interna (estado local/modais) | Admin | nao |  |
| CozinhaScreen | restaurante-web/src/screens/CozinhaScreen.tsx | Tab Cozinha | KDS | nao |  |
| DeliveryOcorrenciasScreen | restaurante-web/src/screens/DeliveryOcorrenciasScreen.tsx | Interna (estado local/modais) | Delivery | nao |  |
| DeliveryScreen | restaurante-web/src/screens/DeliveryScreen.tsx | Tab Delivery | Delivery | delivery_uiNext |  |
| EditarEmpresaScreen | restaurante-web/src/screens/EditarEmpresaScreen.tsx | Interna (estado local/modais) | Admin | nao |  |
| EstoqueScreen | restaurante-web/src/screens/EstoqueScreen.tsx | Interna (estado local/modais) | Admin | nao |  |
| ExtrasConfigScreen | restaurante-web/src/screens/ExtrasConfigScreen.tsx | Interna (estado local/modais) | Admin | nao |  |
| FinancialConfigScreen | restaurante-web/src/screens/FinancialConfigScreen.tsx | Interna (estado local/modais) | Admin | nao |  |
| FinancialDashboardScreen | restaurante-web/src/screens/FinancialDashboardScreen.tsx | Interna (estado local/modais) | Admin | nao |  |
| FuncionariosScreen | restaurante-web/src/screens/FuncionariosScreen.tsx | Interna (estado local/modais) | Admin | nao |  |
| GerenciarCardapioScreen | restaurante-web/src/screens/GerenciarCardapioScreen.tsx | Interna (estado local/modais) | Admin | nao |  |
| GerenciarFornecedoresScreen | restaurante-web/src/screens/GerenciarFornecedoresScreen.tsx | Interna (estado local/modais) | Admin | nao |  |
| LoginScreen | restaurante-web/src/screens/LoginScreen.tsx | Login (/login) | Auth | login_uiNext (flag existe; nao encontrada referencia direta na tela) |  |
| MapaMesasScreen | restaurante-web/src/screens/MapaMesasScreen.tsx | Tab Mapa | Mesa | nao |  |
| MontagemScreen | restaurante-web/src/screens/MontagemScreen.tsx | Tab Montagem | Montagem | nao |  |
| NovoPedidoScreen | restaurante-web/src/screens/NovoPedidoScreen.tsx | Tab Novo Pedido | Balcao | novoPedido_uiNext |  |
| OperationalSettingsScreen | restaurante-web/src/screens/OperationalSettingsScreen.tsx | Interna (estado local/modais) | Admin | nao |  |
| PagamentoScreen | restaurante-web/src/screens/PagamentoScreen.tsx | Stack Comandas > Pagamento | Caixa | pagamento_uiNext |  |
| PedidoDetalhesModal | restaurante-web/src/screens/PedidoDetalhesModal.tsx | Interna (estado local/modais) | Balcao | nao |  |
| PedidosProntosScreen | restaurante-web/src/screens/PedidosProntosScreen.tsx | Tab Prontos | Montagem | nao |  |
| PerformanceDashboardScreen | restaurante-web/src/screens/PerformanceDashboardScreen.tsx | Interna (estado local/modais) | Admin | nao |  |
| PrinterConfigScreen | restaurante-web/src/screens/PrinterConfigScreen.tsx | Interna (estado local/modais) | Admin | nao |  |
| PublicMenuScreen | restaurante-web/src/screens/PublicMenuScreen.tsx | PublicMenu (/menu/:slug) | Auth | nao |  |
| RegisterCompanyScreen | restaurante-web/src/screens/RegisterCompanyScreen.tsx | Register (/register) | Auth | registerCompany_uiNext |  |
| ReservasScreen | restaurante-web/src/screens/ReservasScreen.tsx | Tab Reservas | Mesa | nao |  |
| ResetPasswordScreen | restaurante-web/src/screens/ResetPasswordScreen.tsx | ResetPassword (/reset-password) | Auth | nao |  |
| RotasDeliveryScreen | restaurante-web/src/screens/RotasDeliveryScreen.tsx | Tab Entregas | Delivery | nao |  |
| UpdateCardapioScreen | restaurante-web/src/screens/UpdateCardapioScreen.tsx | Interna (estado local/modais) | Admin | nao |  |
| AdicionaisConfigModal | restaurante-web/src/screens/admin/menu/AdicionaisConfigModal.tsx | Interna (estado local/modais) | Admin | nao |  |
| MenuSettings | restaurante-web/src/screens/admin/menu/MenuSettings.tsx | Interna (estado local/modais) | Admin | nao |  |
| ProductForm | restaurante-web/src/screens/admin/menu/ProductForm.tsx | Interna (estado local/modais) | Admin | nao |  |
| ProductList | restaurante-web/src/screens/admin/menu/ProductList.tsx | Interna (estado local/modais) | Admin | nao |  |
| StockManager | restaurante-web/src/screens/admin/menu/StockManager.tsx | Interna (estado local/modais) | Admin | nao |  |
| VariationManager | restaurante-web/src/screens/admin/menu/VariationManager.tsx | Interna (estado local/modais) | Admin | nao |  |

### 1.2 Telas restaurante-app

| Tela | Arquivo | Rota/path | Fluxo critico | UI_NEXT | Espelhamento |
|---|---|---|---|---|---|
| AboutScreen | restaurante-app/src/screens/AboutScreen.tsx | About (AuthStack) | Auth | nao | espelhada no web |
| AdminScreen | restaurante-app/src/screens/AdminScreen.tsx | Tab Mais > Admin | Admin | admin_uiNext (consumida em AdminActionCard, nao na tela raiz) | espelhada no web |
| BillingScreen | restaurante-app/src/screens/BillingScreen.tsx | Interna (estado local/modais) | Admin | nao | espelhada no web |
| CadastroProdutoScreen | restaurante-app/src/screens/CadastroProdutoScreen.tsx | Interna (estado local/modais) | Balcao | nao | espelhada no web |
| CaixaAberturaScreen | restaurante-app/src/screens/CaixaAberturaScreen.tsx | Interna (estado local/modais) | Caixa | nao | espelhada no web |
| CaixaFechamentoScreen | restaurante-app/src/screens/CaixaFechamentoScreen.tsx | Interna (estado local/modais) | Caixa | nao | espelhada no web |
| CaixaHistoricoScreen | restaurante-app/src/screens/CaixaHistoricoScreen.tsx | Interna (estado local/modais) | Caixa | nao | espelhada no web |
| CaixaOperacoesScreen | restaurante-app/src/screens/CaixaOperacoesScreen.tsx | Interna (estado local/modais) | Caixa | nao | espelhada no web |
| CashFlowScreen | restaurante-app/src/screens/CashFlowScreen.tsx | Interna (estado local/modais) | Caixa | nao | espelhada no web |
| ComandaAbertaScreen | restaurante-app/src/screens/ComandaAbertaScreen.tsx | Interna (estado local/modais) | Balcao | nao | espelhada no web |
| ComandaGerenciamentoScreen | restaurante-app/src/screens/ComandaGerenciamentoScreen.tsx | Tab Comandas > ComandaList | Balcao | comandaGerenciamento_uiNext | espelhada no web |
| ComandaVisualizacaoAdminScreen | restaurante-app/src/screens/ComandaVisualizacaoAdminScreen.tsx | Interna (estado local/modais) | Admin | nao | espelhada no web |
| ConfiguracaoEstoqueScreen | restaurante-app/src/screens/ConfiguracaoEstoqueScreen.tsx | Interna (estado local/modais) | Admin | nao | espelhada no web |
| ConfiguracaoMesasScreen | restaurante-app/src/screens/ConfiguracaoMesasScreen.tsx | Interna (estado local/modais) | Mesa | nao | espelhada no web |
| CozinhaScreen | restaurante-app/src/screens/CozinhaScreen.tsx | Tab Cozinha | KDS | nao | espelhada no web |
| DeliveryOcorrenciasScreen | restaurante-app/src/screens/DeliveryOcorrenciasScreen.tsx | Interna (estado local/modais) | Delivery | nao | espelhada no web |
| EditarEmpresaScreen | restaurante-app/src/screens/EditarEmpresaScreen.tsx | Interna (estado local/modais) | Admin | nao | espelhada no web |
| EstoqueScreen | restaurante-app/src/screens/EstoqueScreen.tsx | Interna (estado local/modais) | Admin | nao | espelhada no web |
| ExtrasConfigScreen | restaurante-app/src/screens/ExtrasConfigScreen.tsx | Interna (estado local/modais) | Admin | nao | espelhada no web |
| FinancialConfigScreen | restaurante-app/src/screens/FinancialConfigScreen.tsx | Interna (estado local/modais) | Admin | nao | espelhada no web |
| FinancialDashboardScreen | restaurante-app/src/screens/FinancialDashboardScreen.tsx | Interna (estado local/modais) | Admin | nao | espelhada no web |
| FuncionariosScreen | restaurante-app/src/screens/FuncionariosScreen.tsx | Interna (estado local/modais) | Admin | nao | espelhada no web |
| GerenciarCardapioScreen | restaurante-app/src/screens/GerenciarCardapioScreen.tsx | Interna (estado local/modais) | Admin | nao | espelhada no web |
| GerenciarFornecedoresScreen | restaurante-app/src/screens/GerenciarFornecedoresScreen.tsx | Interna (estado local/modais) | Admin | nao | espelhada no web |
| LoginScreen | restaurante-app/src/screens/LoginScreen.tsx | Login (AuthStack) | Auth | login_uiNext (flag existe; nao encontrada referencia direta na tela) | espelhada no web |
| MapaMesasScreen | restaurante-app/src/screens/MapaMesasScreen.tsx | Tab Mapa | Mesa | nao | espelhada no web |
| MontagemScreen | restaurante-app/src/screens/MontagemScreen.tsx | Tab Montagem | Montagem | nao | espelhada no web |
| NovoPedidoScreen | restaurante-app/src/screens/NovoPedidoScreen.tsx | Tab Novo Pedido | Balcao | novoPedido_uiNext | espelhada no web |
| OperationalSettingsScreen | restaurante-app/src/screens/OperationalSettingsScreen.tsx | Interna (estado local/modais) | Admin | nao | espelhada no web |
| OverflowMenuScreen | restaurante-app/src/screens/OverflowMenuScreen.tsx | Tab Mais > OverflowMenu | Admin | nao | exclusiva do app |
| PagamentoScreen | restaurante-app/src/screens/PagamentoScreen.tsx | Tab Comandas > Pagamento | Caixa | pagamento_uiNext | espelhada no web |
| PedidoDetalhesModal | restaurante-app/src/screens/PedidoDetalhesModal.tsx | Interna (estado local/modais) | Balcao | nao | espelhada no web |
| PedidosProntosScreen | restaurante-app/src/screens/PedidosProntosScreen.tsx | Tab Prontos | Montagem | nao | espelhada no web |
| PerformanceDashboardScreen | restaurante-app/src/screens/PerformanceDashboardScreen.tsx | Interna (estado local/modais) | Admin | nao | espelhada no web |
| PrinterConfigScreen | restaurante-app/src/screens/PrinterConfigScreen.tsx | Interna (estado local/modais) | Admin | nao | espelhada no web |
| RegisterCompanyScreen | restaurante-app/src/screens/RegisterCompanyScreen.tsx | Register (AuthStack) | Auth | registerCompany_uiNext | espelhada no web |
| ReservasScreen | restaurante-app/src/screens/ReservasScreen.tsx | Tab Mais > Reservas | Mesa | nao | espelhada no web |
| ResetPasswordScreen | restaurante-app/src/screens/ResetPasswordScreen.tsx | ResetPassword (AuthStack) | Auth | nao | espelhada no web |
| RotasDeliveryScreen | restaurante-app/src/screens/RotasDeliveryScreen.tsx | Tab RotasDelivery | Delivery | nao | espelhada no web |
| UpdateCardapioScreen | restaurante-app/src/screens/UpdateCardapioScreen.tsx | Interna (estado local/modais) | Admin | nao | espelhada no web |
| AdicionaisConfigModal | restaurante-app/src/screens/admin/menu/AdicionaisConfigModal.tsx | Interna (estado local/modais) | Admin | nao | espelhada no web |
| MenuSettings | restaurante-app/src/screens/admin/menu/MenuSettings.tsx | Interna (estado local/modais) | Admin | nao | espelhada no web |
| ProductForm | restaurante-app/src/screens/admin/menu/ProductForm.tsx | Interna (estado local/modais) | Admin | nao | espelhada no web |
| ProductList | restaurante-app/src/screens/admin/menu/ProductList.tsx | Interna (estado local/modais) | Admin | nao | espelhada no web |
| StockManager | restaurante-app/src/screens/admin/menu/StockManager.tsx | Interna (estado local/modais) | Admin | nao | espelhada no web |
| VariationManager | restaurante-app/src/screens/admin/menu/VariationManager.tsx | Interna (estado local/modais) | Admin | nao | espelhada no web |

### 1.3 Stories no Storybook

| Story file | Variantes | Estados cobertos |
|---|---|---|
| restaurante-web/src/ui/Badge.stories.tsx | Success, Warning, Error, Info, LongLabel | erro/disabled/empty |
| restaurante-web/src/ui/Button.stories.tsx | Primary, Secondary, Loading, Disabled, Ghost, Danger, FullWidthLarge | loading, erro/disabled/empty |
| restaurante-web/src/ui/Card.stories.tsx | Low, Medium, High, NoPadding, EmptyState | erro/disabled/empty |
| restaurante-web/src/ui/FormInput.stories.tsx | Default, Error, Password, WithLongValue | erro/disabled/empty |
| restaurante-web/src/ui/ProductCard.stories.tsx | Default, Pressable, Minimal, LongContent | estado baseline |
| restaurante-app/src/ui/*.stories.tsx | nenhum arquivo encontrado | n/a |

## Parte 2 - Estado do Design System

### 2.1 Tokens (src/design-system/tokens.ts)

- Web: spacing, fontSizes/fontWeights/lineHeights/letterSpacings, typography (legacy), borderRadius/borderWidth, shadows, breakpoints, layout.
- App: spacing, fontSizes/fontWeights/lineHeights/letterSpacings, typography (legacy), borderRadius/borderWidth, shadows, layout.
- Divergencia principal: web expoe breakpoints; app nao expoe breakpoints.
- Observacao de hardcode em tokens: shadows.low/medium/high/floating usam hex e rgba diretos (#0B1220, rgba(...)); isso e esperado como token legado, mas nao semantico puro.

### 2.2 Paleta (src/theme/colors.ts)

- Paleta flat (colors): primary, secondary, background, white, text, textSecondary, textLight, border, success, warning, danger, onDanger, successSurface, warningSurface, dangerSurface, primaryDivider, primaryContrastMuted, overlay, dangerLight, userInfo, surfaceMuted, primaryTint, logoutBg, disabled, shadow.
- colorSystem legacy: primary, secondary, accent, accentText, background, surface, success, warning, warningText, error, text, textMuted, onPrimary, onSecondary, onAccent, border, overlay.
- designColors: primary scale 50-900, neutral scale 50-900, semantic (success/warning/error/info com light/default/dark), surface, text, border.
- Dark mode: sim (implementado por Appearance.getColorScheme() com _lightDesignColors/_darkDesignColors).
- Divergencias app x web: nenhuma divergencia funcional detectada em colors.ts (arquivos equivalentes).

### 2.3 Exportes em src/ui/index.ts

| Projeto | Componente exportado | Possui story? | Possui .figma.tsx? |
|---|---|---|---|
| restaurante-web | Button | sim | sim |
| restaurante-web | Card | sim | sim |
| restaurante-web | FormInput | sim | sim |
| restaurante-web | Navbar | nao | nao |
| restaurante-web | ProductCard | sim | sim |
| restaurante-web | RestaurantCard | nao | nao |
| restaurante-web | Sidebar | nao | nao |
| restaurante-web | Table | nao | nao |
| restaurante-app | Button | nao | sim |
| restaurante-app | Card | nao | sim |
| restaurante-app | FormInput | nao | sim |
| restaurante-app | Navbar | nao | nao |
| restaurante-app | ProductCard | nao | sim |
| restaurante-app | RestaurantCard | nao | nao |
| restaurante-app | Sidebar | nao | nao |
| restaurante-app | Table | nao | nao |

### 2.4 docs/design-system

- Node map: existe arquivo docs/design-system/figma-node-map.example.json (modelo).
- Atualizacao: aparenta baseline/example com node IDs placeholder (1:1, 2:1, etc.); nao evidencia mapeamento definitivo por ambiente.
- Componentes mapeados Figma-codigo no node map de exemplo: total 12 (app 5, web 5, site 2).
- Escopo app+web: 10 componentes mapeados no exemplo.

## Parte 3 - Diagnostico Visual por Tela

### 3.1 a 3.5 - restaurante-web

| Tela | ScreenScaffold | Usa src/ui ou ui-next | Hardcode cores/espac. (qtd) | Cores hardcoded (amostra) | Spacing/font hardcoded (amostra) | Estados (loading/empty/error/skeleton/spinner) | Labels a11y (aria) | Confirmacao destrutiva | Feedback rede/retry | Toast | Realtime | Componentes locais promoviveis |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| AboutScreen | nao | nao | 33/53 | #173243, #0C7A96, #F1B24B | borderRadius: 999; width: 360; height: 360 | loading:nao empty:nao error:nao skeleton:nao spinner:nao | 0 | nao | nao | nao | nao | potencial de padronizacao em cards/forms/listas |
| AdminScreen | nao | nao | 1/72 | rgba(255,255,255,0.25) | paddingVertical: 15; paddingHorizontal: 15; fontSize: 16 | loading:nao empty:nao error:sim skeleton:nao spinner:nao | 0 | nao | nao | nao | sim | potencial de padronizacao em cards/forms/listas |
| BillingScreen | sim | nao | 4/68 | #F6F9FB, #F8FAFC, #FAFAFA | padding: 20; gap: 16; borderRadius: 18 | loading:sim empty:sim error:sim skeleton:nao spinner:sim | 0 | sim | nao | nao | nao | potencial de padronizacao em cards/forms/listas |
| CadastroProdutoScreen | nao | nao | 0/7 | - | paddingTop: 50; paddingBottom: 20; paddingHorizontal: 12 | loading:nao empty:nao error:sim skeleton:nao spinner:nao | 0 | sim | nao | nao | nao | potencial de padronizacao em cards/forms/listas |
| CaixaAberturaScreen | nao | nao | 0/7 | - | paddingBottom: 100; marginBottom: 8; fontSize: 16 | loading:sim empty:nao error:sim skeleton:nao spinner:nao | 0 | sim | nao | nao | nao | potencial de padronizacao em cards/forms/listas |
| CaixaFechamentoScreen | nao | nao | 1/38 | rgba(0,0,0,0.5) | padding: 20; width: 100; padding: 8 | loading:sim empty:sim error:sim skeleton:nao spinner:sim | 0 | sim | nao | nao | nao | potencial de padronizacao em cards/forms/listas |
| CaixaHistoricoScreen | sim | nao | 0/20 | - | padding: 15; marginTop: 4; marginTop: 8 | loading:nao empty:nao error:sim skeleton:nao spinner:nao | 0 | nao | nao | nao | nao | potencial de padronizacao em cards/forms/listas |
| CaixaOperacoesScreen | nao | nao | 0/8 | - | padding: 20; paddingBottom: 100; marginTop: 24 | loading:sim empty:nao error:sim skeleton:nao spinner:sim | 0 | sim | nao | nao | nao | potencial de padronizacao em cards/forms/listas |
| CancellationReportScreen | sim | nao | 0/12 | - | paddingHorizontal: 16; paddingTop: 12; gap: 8 | loading:sim empty:sim error:sim skeleton:nao spinner:sim | 0 | nao | nao | nao | nao | potencial de padronizacao em cards/forms/listas |
| CashFlowScreen | nao | nao | 0/15 | - | width: 40; marginTop: 50; marginLeft: 10 | loading:sim empty:sim error:sim skeleton:nao spinner:sim | 0 | nao | nao | nao | nao | potencial de padronizacao em cards/forms/listas |
| ComandaAbertaScreen | nao | nao | 0/24 | - | marginTop: 5; fontSize: 14; fontSize: 16 | loading:sim empty:sim error:sim skeleton:nao spinner:nao | 0 | nao | nao | nao | nao | potencial de padronizacao em cards/forms/listas |
| ComandaGerenciamentoScreen | nao | sim | 1/6 | rgba(255,255,255,0.7) | marginRight: 8; paddingHorizontal: 12; paddingTop: 50 | loading:sim empty:nao error:sim skeleton:nao spinner:nao | 0 | sim | nao | sim | nao | - |
| ComandaVisualizacaoAdminScreen | sim | nao | 4/31 | rgba(255,255,255,0.2), rgba(255,255,255,0.85), rgba(0,0,0,0.5) | paddingHorizontal: 12; paddingVertical: 8; borderRadius: 8 | loading:sim empty:sim error:sim skeleton:nao spinner:nao | 0 | sim | nao | nao | nao | potencial de padronizacao em cards/forms/listas |
| ConfiguracaoEstoqueScreen | sim | nao | 0/21 | - | marginBottom: 15; marginLeft: 5; gap: 15 | loading:sim empty:nao error:sim skeleton:nao spinner:sim | 0 | sim | nao | nao | nao | potencial de padronizacao em cards/forms/listas |
| ConfiguracaoMesasScreen | sim | nao | 1/44 | rgba(0,0,0,0.5) | marginBottom: 5; height: 800; height: 60 | loading:sim empty:sim error:sim skeleton:nao spinner:sim | 0 | sim | nao | nao | nao | potencial de padronizacao em cards/forms/listas |
| ConfiguracoesWhatsApp | sim | nao | 0/22 | - | marginBottom: 15; marginBottom: 10; marginTop: 15 | loading:sim empty:nao error:sim skeleton:nao spinner:sim | 0 | sim | nao | nao | nao | potencial de padronizacao em cards/forms/listas |
| CozinhaScreen | nao | nao | 0/28 | - | marginRight: 8; fontSize: 12; paddingHorizontal: 12 | loading:nao empty:sim error:sim skeleton:nao spinner:nao | 0 | nao | nao | nao | sim | potencial de padronizacao em cards/forms/listas |
| DeliveryOcorrenciasScreen | sim | nao | 0/26 | - | paddingHorizontal: 16; paddingTop: 14; paddingBottom: 10 | loading:sim empty:sim error:sim skeleton:nao spinner:sim | 0 | nao | nao | nao | sim | potencial de padronizacao em cards/forms/listas |
| DeliveryScreen | sim | sim | 0/37 | - | marginBottom: 12; width: 380; padding: 16 | loading:sim empty:nao error:sim skeleton:nao spinner:sim | 0 | sim | nao | nao | nao | - |
| EditarEmpresaScreen | sim | nao | 0/19 | - | paddingBottom: 100; marginRight: 10; padding: 20 | loading:sim empty:nao error:sim skeleton:nao spinner:sim | 0 | sim | nao | nao | nao | potencial de padronizacao em cards/forms/listas |
| EstoqueScreen | sim | nao | 0/44 | - | paddingBottom: 100; marginTop: 10; gap: 15 | loading:sim empty:sim error:sim skeleton:nao spinner:sim | 0 | sim | nao | nao | nao | potencial de padronizacao em cards/forms/listas |
| ExtrasConfigScreen | sim | nao | 1/34 | rgba(0, 0, 0, 0.5) | paddingVertical: 16; fontSize: 16; padding: 16 | loading:sim empty:sim error:sim skeleton:nao spinner:sim | 0 | sim | nao | nao | nao | potencial de padronizacao em cards/forms/listas |
| FinancialConfigScreen | sim | nao | 2/10 | rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.2) | padding: 20; borderRadius: 12; marginBottom: 20 | loading:sim empty:nao error:sim skeleton:nao spinner:sim | 0 | sim | nao | nao | nao | potencial de padronizacao em cards/forms/listas |
| FinancialDashboardScreen | sim | nao | 0/17 | - | height: 40; padding: 15; marginVertical: 15 | loading:sim empty:sim error:sim skeleton:nao spinner:sim | 0 | nao | nao | nao | nao | potencial de padronizacao em cards/forms/listas |
| FuncionariosScreen | sim | nao | 0/71 | - | paddingBottom: 100; padding: 20; padding: 18 | loading:sim empty:sim error:sim skeleton:nao spinner:nao | 0 | sim | nao | nao | nao | potencial de padronizacao em cards/forms/listas |
| GerenciarCardapioScreen | sim | nao | 4/138 | #E8F5E9, #D32F2F, #5c6bc0 | marginLeft: 8; paddingBottom: 100; height: 60 | loading:sim empty:sim error:sim skeleton:nao spinner:sim | 0 | sim | nao | nao | nao | potencial de padronizacao em cards/forms/listas |
| GerenciarFornecedoresScreen | sim | nao | 1/19 | rgba(0,0,0,0.5) | marginTop: 20; padding: 20; padding: 15 | loading:sim empty:sim error:sim skeleton:nao spinner:sim | 0 | sim | nao | nao | nao | potencial de padronizacao em cards/forms/listas |
| LoginScreen | nao | nao | 61/77 | #1D2A35, #7A8B97, #0B667F | borderRadius: 999; width: 360; height: 360 | loading:sim empty:nao error:sim skeleton:nao spinner:nao | 0 | sim | nao | sim | nao | potencial de padronizacao em cards/forms/listas |
| MapaMesasScreen | sim | nao | 0/25 | - | marginRight: 8; width: 100; height: 60 | loading:sim empty:sim error:sim skeleton:nao spinner:sim | 0 | sim | nao | nao | nao | potencial de padronizacao em cards/forms/listas |
| MontagemScreen | nao | nao | 4/41 | rgba(0, 0, 0, 0.2), rgba(255,255,255,0.7), rgba(0, 0, 0, 0.06) | paddingRight: 8; marginBottom: 20; marginTop: 20 | loading:nao empty:sim error:sim skeleton:nao spinner:nao | 0 | sim | sim | nao | sim | potencial de padronizacao em cards/forms/listas |
| NovoPedidoScreen | nao | sim | 15/96 | rgba(255,255,255,0.28), rgba(255,255,255,0.15), rgba(8,23,43,0.9) | marginBottom: 12; paddingHorizontal: 12; paddingTop: 50 | loading:sim empty:sim error:sim skeleton:nao spinner:sim | 0 | sim | nao | nao | nao | - |
| OperationalSettingsScreen | sim | nao | 0/14 | - | paddingBottom: 100; padding: 20; borderRadius: 10 | loading:sim empty:nao error:sim skeleton:nao spinner:sim | 0 | sim | nao | nao | nao | potencial de padronizacao em cards/forms/listas |
| PagamentoScreen | sim | nao | 2/5 | #EFF6FF, #1D4ED8 | padding: 20; marginTop: 12; padding: 12 | loading:nao empty:nao error:sim skeleton:nao spinner:nao | 0 | sim | sim | nao | sim | potencial de padronizacao em cards/forms/listas |
| PedidoDetalhesModal | nao | nao | 3/45 | rgba(0,0,0,0.5), rgba(0, 0, 0, 0.3), rgba(255,255,255,0.2) | marginLeft: 20; marginTop: 5; paddingVertical: 0 | loading:nao empty:nao error:sim skeleton:nao spinner:nao | 0 | sim | nao | nao | nao | potencial de padronizacao em cards/forms/listas |
| PedidosProntosScreen | nao | nao | 1/42 | rgba(0, 0, 0, 0.2) | paddingRight: 8; marginRight: 8; paddingTop: 50 | loading:sim empty:sim error:sim skeleton:nao spinner:nao | 0 | sim | nao | nao | sim | potencial de padronizacao em cards/forms/listas |
| PerformanceDashboardScreen | nao | nao | 0/0 | - | - | loading:nao empty:nao error:nao skeleton:nao spinner:nao | 0 | nao | nao | nao | nao | potencial de padronizacao em cards/forms/listas |
| PrinterConfigScreen | sim | nao | 0/37 | - | paddingBottom: 100; padding: 20; borderRadius: 15 | loading:sim empty:sim error:nao skeleton:nao spinner:sim | 0 | sim | nao | nao | nao | potencial de padronizacao em cards/forms/listas |
| PublicMenuScreen | nao | nao | 41/57 | #E85D04, rgba(0,0,0,0.55), #9E9E9E | paddingBottom: 24; padding: 32; marginTop: 12 | loading:sim empty:sim error:sim skeleton:nao spinner:sim | 0 | nao | nao | nao | nao | potencial de padronizacao em cards/forms/listas |
| RegisterCompanyScreen | nao | nao | 60/59 | #7A8B97, #0B6780, #0A5B6F | borderRadius: 999; width: 360; height: 360 | loading:sim empty:nao error:sim skeleton:nao spinner:sim | 0 | sim | nao | nao | nao | potencial de padronizacao em cards/forms/listas |
| ReservasScreen | nao | nao | 1/44 | rgba(0, 0, 0, 0.2) | marginTop: 50; height: 90; paddingHorizontal: 12 | loading:sim empty:sim error:sim skeleton:nao spinner:sim | 0 | sim | nao | nao | sim | potencial de padronizacao em cards/forms/listas |
| ResetPasswordScreen | nao | nao | 2/6 | rgba(255,255,255,0.2), rgba(255,255,255,0.78) | width: 320; height: 320; borderRadius: 160 | loading:sim empty:nao error:sim skeleton:nao spinner:nao | 0 | sim | nao | sim | nao | potencial de padronizacao em cards/forms/listas |
| RotasDeliveryScreen | nao | nao | 7/45 | rgba(0, 0, 0, 0.2), rgba(255,255,255,0.7), rgba(0, 0, 0, 0.06) | paddingBottom: 15; paddingHorizontal: 12; width: 0 | loading:sim empty:sim error:sim skeleton:nao spinner:sim | 0 | sim | nao | nao | sim | potencial de padronizacao em cards/forms/listas |
| UpdateCardapioScreen | nao | nao | 0/14 | - | padding: 20; fontSize: 24; marginBottom: 10 | loading:sim empty:nao error:sim skeleton:nao spinner:nao | 0 | sim | nao | nao | nao | potencial de padronizacao em cards/forms/listas |
| AdicionaisConfigModal | nao | nao | 24/33 | #f0f0f0, rgba(0,0,0,0.55), #fff | marginVertical: 20; padding: 16; fontSize: 16 | loading:sim empty:sim error:sim skeleton:nao spinner:sim | 0 | sim | nao | nao | nao | potencial de padronizacao em cards/forms/listas |
| MenuSettings | nao | nao | 0/18 | - | padding: 20; borderRadius: 20; height: 600 | loading:nao empty:nao error:nao skeleton:nao spinner:nao | 0 | nao | nao | nao | nao | potencial de padronizacao em cards/forms/listas |
| ProductForm | nao | nao | 0/23 | - | marginBottom: 15; padding: 20; borderRadius: 20 | loading:sim empty:nao error:nao skeleton:nao spinner:sim | 0 | sim | nao | nao | nao | potencial de padronizacao em cards/forms/listas |
| ProductList | nao | nao | 0/17 | - | marginBottom: 20; marginBottom: 15; paddingVertical: 8 | loading:sim empty:sim error:nao skeleton:nao spinner:sim | 0 | nao | nao | nao | nao | potencial de padronizacao em cards/forms/listas |
| StockManager | nao | nao | 0/22 | - | marginTop: 20; padding: 20; borderRadius: 20 | loading:nao empty:sim error:nao skeleton:nao spinner:nao | 0 | sim | nao | nao | nao | potencial de padronizacao em cards/forms/listas |
| VariationManager | nao | nao | 0/16 | - | gap: 5; padding: 20; borderRadius: 20 | loading:nao empty:nao error:nao skeleton:nao spinner:nao | 0 | nao | nao | nao | nao | potencial de padronizacao em cards/forms/listas |

### 3.1 a 3.5 - restaurante-app

| Tela | ScreenScaffold | Usa src/ui ou ui-next | Hardcode cores/espac. (qtd) | Cores hardcoded (amostra) | Spacing/font hardcoded (amostra) | Estados (loading/empty/error/skeleton/spinner) | Labels a11y (accessibilityLabel) | Confirmacao destrutiva | Feedback rede/retry | Toast | Realtime | Componentes locais promoviveis |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| AboutScreen | nao | nao | 2/22 | rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.96) | paddingHorizontal: 16; paddingTop: 18; paddingBottom: 28 | loading:nao empty:nao error:nao skeleton:nao spinner:nao | 0 | nao | nao | nao | nao | potencial de padronizacao em cards/forms/listas |
| AdminScreen | nao | nao | 0/61 | - | paddingBottom: 100; paddingVertical: 15; paddingHorizontal: 15 | loading:nao empty:nao error:sim skeleton:nao spinner:nao | 0 | nao | nao | nao | sim | potencial de padronizacao em cards/forms/listas |
| BillingScreen | nao | nao | 4/72 | #F6F9FB, #F8FAFC, #FAFAFA | paddingBottom: 15; paddingHorizontal: 12; width: 0 | loading:sim empty:sim error:sim skeleton:nao spinner:sim | 0 | sim | nao | nao | nao | potencial de padronizacao em cards/forms/listas |
| CadastroProdutoScreen | nao | nao | 0/10 | - | paddingBottom: 15; paddingHorizontal: 12; width: 0 | loading:nao empty:nao error:sim skeleton:nao spinner:nao | 0 | sim | nao | nao | nao | potencial de padronizacao em cards/forms/listas |
| CaixaAberturaScreen | nao | nao | 0/7 | - | paddingBottom: 100; marginBottom: 8; fontSize: 16 | loading:sim empty:nao error:sim skeleton:nao spinner:nao | 0 | sim | nao | nao | nao | potencial de padronizacao em cards/forms/listas |
| CaixaFechamentoScreen | nao | nao | 1/37 | rgba(0,0,0,0.5) | padding: 20; width: 100; padding: 8 | loading:sim empty:sim error:sim skeleton:nao spinner:sim | 0 | sim | nao | nao | nao | potencial de padronizacao em cards/forms/listas |
| CaixaHistoricoScreen | nao | nao | 0/25 | - | padding: 15; marginTop: 4; marginTop: 8 | loading:nao empty:nao error:sim skeleton:nao spinner:nao | 0 | nao | nao | nao | nao | potencial de padronizacao em cards/forms/listas |
| CaixaOperacoesScreen | nao | nao | 0/8 | - | padding: 20; paddingBottom: 100; marginTop: 24 | loading:sim empty:nao error:sim skeleton:nao spinner:sim | 0 | sim | nao | nao | nao | potencial de padronizacao em cards/forms/listas |
| CashFlowScreen | nao | nao | 0/15 | - | marginTop: 50; marginLeft: 10; height: 40 | loading:sim empty:sim error:sim skeleton:nao spinner:sim | 0 | nao | nao | nao | nao | potencial de padronizacao em cards/forms/listas |
| ComandaAbertaScreen | nao | nao | 0/28 | - | marginTop: 5; fontSize: 14; fontSize: 16 | loading:sim empty:sim error:sim skeleton:nao spinner:nao | 0 | nao | nao | nao | nao | potencial de padronizacao em cards/forms/listas |
| ComandaGerenciamentoScreen | nao | nao | 0/8 | - | marginRight: 6; paddingHorizontal: 12; paddingBottom: 15 | loading:sim empty:nao error:sim skeleton:nao spinner:nao | 0 | sim | nao | sim | nao | potencial de padronizacao em cards/forms/listas |
| ComandaVisualizacaoAdminScreen | nao | nao | 4/36 | rgba(255,255,255,0.2), rgba(255,255,255,0.85), rgba(0,0,0,0.5) | paddingBottom: 15; paddingHorizontal: 12; width: 0 | loading:sim empty:sim error:sim skeleton:nao spinner:nao | 0 | sim | nao | nao | nao | potencial de padronizacao em cards/forms/listas |
| ConfiguracaoEstoqueScreen | nao | nao | 0/26 | - | marginBottom: 15; marginLeft: 5; gap: 15 | loading:sim empty:nao error:sim skeleton:nao spinner:sim | 0 | sim | nao | nao | nao | potencial de padronizacao em cards/forms/listas |
| ConfiguracaoMesasScreen | nao | nao | 1/49 | rgba(0,0,0,0.5) | marginBottom: 5; height: 800; paddingBottom: 15 | loading:sim empty:sim error:sim skeleton:nao spinner:sim | 0 | sim | nao | nao | nao | potencial de padronizacao em cards/forms/listas |
| CozinhaScreen | nao | nao | 0/27 | - | marginRight: 8; fontSize: 12; marginRight: 6 | loading:nao empty:sim error:sim skeleton:nao spinner:nao | 0 | nao | nao | nao | sim | potencial de padronizacao em cards/forms/listas |
| DeliveryOcorrenciasScreen | nao | nao | 0/31 | - | paddingBottom: 15; paddingHorizontal: 12; width: 0 | loading:sim empty:sim error:sim skeleton:nao spinner:sim | 0 | nao | nao | nao | sim | potencial de padronizacao em cards/forms/listas |
| EditarEmpresaScreen | nao | nao | 0/24 | - | paddingBottom: 100; marginRight: 10; paddingBottom: 15 | loading:sim empty:nao error:sim skeleton:nao spinner:sim | 0 | sim | nao | nao | nao | potencial de padronizacao em cards/forms/listas |
| EstoqueScreen | nao | nao | 0/50 | - | paddingBottom: 100; marginTop: 10; paddingBottom: 15 | loading:sim empty:sim error:sim skeleton:nao spinner:sim | 0 | sim | nao | nao | nao | potencial de padronizacao em cards/forms/listas |
| ExtrasConfigScreen | nao | nao | 1/39 | rgba(0, 0, 0, 0.5) | paddingBottom: 15; paddingHorizontal: 12; width: 0 | loading:sim empty:sim error:sim skeleton:nao spinner:sim | 0 | sim | nao | nao | nao | potencial de padronizacao em cards/forms/listas |
| FinancialConfigScreen | nao | nao | 2/15 | rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.2) | paddingBottom: 15; paddingHorizontal: 12; width: 0 | loading:sim empty:nao error:sim skeleton:nao spinner:sim | 0 | sim | nao | nao | nao | potencial de padronizacao em cards/forms/listas |
| FinancialDashboardScreen | nao | nao | 0/22 | - | height: 40; paddingBottom: 15; paddingHorizontal: 12 | loading:sim empty:sim error:sim skeleton:nao spinner:sim | 0 | nao | nao | nao | nao | potencial de padronizacao em cards/forms/listas |
| FuncionariosScreen | nao | nao | 0/76 | - | paddingBottom: 100; paddingBottom: 15; paddingHorizontal: 12 | loading:sim empty:sim error:sim skeleton:nao spinner:nao | 0 | sim | nao | nao | nao | potencial de padronizacao em cards/forms/listas |
| GerenciarCardapioScreen | nao | nao | 2/143 | #E8F5E9, #5c6bc0 | marginLeft: 8; paddingBottom: 100; height: 60 | loading:sim empty:sim error:sim skeleton:nao spinner:sim | 0 | sim | nao | nao | nao | potencial de padronizacao em cards/forms/listas |
| GerenciarFornecedoresScreen | nao | nao | 1/24 | rgba(0,0,0,0.5) | marginTop: 20; paddingBottom: 15; paddingHorizontal: 12 | loading:sim empty:sim error:sim skeleton:nao spinner:sim | 0 | sim | nao | nao | nao | potencial de padronizacao em cards/forms/listas |
| LoginScreen | nao | nao | 39/51 | #FFFFFF, #8FA3B1, #0B6780 | borderRadius: 999; width: 320; height: 320 | loading:sim empty:nao error:sim skeleton:nao spinner:nao | 0 | sim | nao | sim | nao | potencial de padronizacao em cards/forms/listas |
| MapaMesasScreen | nao | nao | 0/29 | - | marginRight: 8; width: 100; paddingBottom: 15 | loading:sim empty:sim error:sim skeleton:nao spinner:sim | 0 | sim | nao | nao | nao | potencial de padronizacao em cards/forms/listas |
| MontagemScreen | nao | nao | 3/41 | rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.06), rgba(139, 47, 47, 0.2) | paddingRight: 8; marginBottom: 20; marginTop: 20 | loading:nao empty:sim error:sim skeleton:nao spinner:nao | 0 | sim | sim | nao | sim | potencial de padronizacao em cards/forms/listas |
| NovoPedidoScreen | nao | nao | 11/93 | rgba(255,255,255,0.24), rgba(255,255,255,0.13), rgba(255,255,255,0.26) | marginBottom: 12; paddingHorizontal: 20; paddingTop: 50 | loading:sim empty:sim error:sim skeleton:nao spinner:sim | 1 | sim | nao | nao | nao | potencial de padronizacao em cards/forms/listas |
| OperationalSettingsScreen | nao | nao | 0/19 | - | paddingBottom: 15; paddingHorizontal: 12; width: 0 | loading:sim empty:nao error:sim skeleton:nao spinner:sim | 0 | sim | nao | nao | nao | potencial de padronizacao em cards/forms/listas |
| OverflowMenuScreen | nao | nao | 0/5 | - | borderRadius: 12; width: 44; height: 44 | loading:nao empty:sim error:nao skeleton:nao spinner:nao | 1 | nao | nao | nao | nao | potencial de padronizacao em cards/forms/listas |
| PagamentoScreen | nao | nao | 0/6 | - | paddingBottom: 15; paddingHorizontal: 12; width: 0 | loading:nao empty:nao error:sim skeleton:nao spinner:nao | 0 | sim | sim | nao | sim | potencial de padronizacao em cards/forms/listas |
| PedidoDetalhesModal | nao | nao | 3/46 | rgba(0,0,0,0.5), rgba(0, 0, 0, 0.3), rgba(255,255,255,0.2) | marginLeft: 20; marginTop: 5; paddingVertical: 0 | loading:nao empty:nao error:sim skeleton:nao spinner:nao | 0 | sim | nao | nao | nao | potencial de padronizacao em cards/forms/listas |
| PedidosProntosScreen | nao | nao | 1/42 | rgba(0, 0, 0, 0.2) | paddingRight: 8; marginRight: 6; paddingBottom: 15 | loading:sim empty:sim error:sim skeleton:nao spinner:nao | 0 | sim | nao | nao | sim | potencial de padronizacao em cards/forms/listas |
| PerformanceDashboardScreen | nao | nao | 0/0 | - | - | loading:nao empty:nao error:nao skeleton:nao spinner:nao | 0 | nao | nao | nao | nao | potencial de padronizacao em cards/forms/listas |
| PrinterConfigScreen | nao | nao | 0/42 | - | paddingBottom: 100; paddingBottom: 15; paddingHorizontal: 12 | loading:sim empty:sim error:nao skeleton:nao spinner:sim | 0 | sim | nao | nao | nao | potencial de padronizacao em cards/forms/listas |
| RegisterCompanyScreen | nao | sim | 3/30 | #EFF7FB, #D3E5EE, #DFF1F7 | paddingBottom: 100; marginRight: 10; paddingBottom: 15 | loading:sim empty:nao error:sim skeleton:nao spinner:sim | 0 | sim | nao | nao | nao | - |
| ReservasScreen | nao | nao | 0/40 | - | marginRight: 6; marginTop: 50; padding: 20 | loading:sim empty:sim error:sim skeleton:nao spinner:sim | 0 | sim | nao | nao | sim | potencial de padronizacao em cards/forms/listas |
| ResetPasswordScreen | nao | nao | 0/4 | - | width: 240; height: 240; borderRadius: 120 | loading:sim empty:nao error:sim skeleton:nao spinner:nao | 0 | sim | nao | sim | nao | potencial de padronizacao em cards/forms/listas |
| RotasDeliveryScreen | nao | nao | 1/37 | rgba(0, 0, 0, 0.2) | marginRight: 6; paddingBottom: 15; paddingHorizontal: 12 | loading:sim empty:sim error:sim skeleton:nao spinner:sim | 0 | sim | nao | nao | sim | potencial de padronizacao em cards/forms/listas |
| UpdateCardapioScreen | nao | nao | 0/14 | - | padding: 20; fontSize: 24; marginBottom: 10 | loading:sim empty:nao error:sim skeleton:nao spinner:nao | 0 | sim | nao | nao | nao | potencial de padronizacao em cards/forms/listas |
| AdicionaisConfigModal | nao | nao | 23/30 | #f0f0f0, rgba(0,0,0,0.55), #fff | marginVertical: 20; paddingBottom: 30; padding: 16 | loading:sim empty:sim error:sim skeleton:nao spinner:sim | 0 | sim | nao | nao | nao | potencial de padronizacao em cards/forms/listas |
| MenuSettings | nao | nao | 0/19 | - | padding: 20; borderRadius: 20; height: 600 | loading:nao empty:nao error:nao skeleton:nao spinner:nao | 0 | nao | nao | nao | nao | potencial de padronizacao em cards/forms/listas |
| ProductForm | nao | nao | 0/24 | - | marginBottom: 15; padding: 20; borderRadius: 20 | loading:sim empty:nao error:nao skeleton:nao spinner:sim | 0 | sim | nao | nao | nao | potencial de padronizacao em cards/forms/listas |
| ProductList | nao | nao | 0/17 | - | marginBottom: 20; marginBottom: 15; paddingVertical: 8 | loading:sim empty:sim error:nao skeleton:nao spinner:sim | 0 | nao | nao | nao | nao | potencial de padronizacao em cards/forms/listas |
| StockManager | nao | nao | 0/23 | - | marginTop: 20; padding: 20; borderRadius: 20 | loading:nao empty:sim error:nao skeleton:nao spinner:nao | 0 | sim | nao | nao | nao | potencial de padronizacao em cards/forms/listas |
| VariationManager | nao | nao | 0/17 | - | gap: 5; padding: 20; borderRadius: 20 | loading:nao empty:nao error:nao skeleton:nao spinner:nao | 0 | nao | nao | nao | nao | potencial de padronizacao em cards/forms/listas |

Observacoes Parte 3:
- ScreenScaffold: uso alto no web administrativo; uso praticamente ausente no app.
- FlatList com getItemLayout: nao encontrado nas telas analisadas de app (getItemLayout ausente).
- Skeleton loading: nao identificado; predomina ActivityIndicator/estado manual.
- Acessibilidade: cobertura baixa de labels explicitas em ambos projetos.

## Parte 4 - Contexto Operacional

### 4.1 Perfis de usuario e acesso por tela (UI)

Web (roles.js):
- admin/gerente: Novo Pedido, Cozinha, Montagem, Prontos, Comandas, Mapa, Admin, Entregas, Reservas.
- garcom: Novo Pedido, Comandas, Mapa, Prontos, Reservas.
- cozinheiro: Cozinha.
- montagem: Montagem, Prontos.
- entregador: Entregas.

App (roles.js):
- admin/gerente: abas primarias Novo Pedido, Mapa, Comandas, Cozinha, Mais; overflow Montagem, Prontos, RotasDelivery, Reservas, Admin.
- garcom: primarias Novo Pedido, Mapa, Comandas, Mais; overflow Prontos, Reservas.
- cozinheiro: Cozinha.
- montagem: Montagem, Prontos.
- entregador: RotasDelivery.

- Controle de acesso por tela na UI: sim, via canAccessScreen/getRoleOverflowScreens na montagem das tabs/overflow.

### 4.2 Dispositivos esperados por tela (logica de negocio)

- Tablet fixo (operacao de loja): NovoPedidoScreen, MapaMesasScreen, ComandaGerenciamentoScreen, PagamentoScreen, CozinhaScreen, MontagemScreen, PedidosProntosScreen.
- Celular de garcom/entrega: NovoPedidoScreen, ComandaGerenciamentoScreen, ReservasScreen, RotasDeliveryScreen, DeliveryOcorrenciasScreen.
- Desktop (caixa/admin/backoffice): AdminScreen e submodulos (Caixa*, Finance*, Estoque*, Funcionarios, Cardapio, Configuracoes, Billing, CancellationReport, WhatsApp).

### 4.3 Fluxos com Realtime ativo

- Telas com Realtime identificado: AdminScreen, CozinhaScreen, DeliveryOcorrenciasScreen, MontagemScreen, PagamentoScreen, PedidosProntosScreen, ReservasScreen, RotasDeliveryScreen.
- Risco de re-render excessivo: alto em AdminScreen (2 canais + debounce), MontagemScreen, PedidosProntosScreen, RotasDeliveryScreen, ReservasScreen e DeliveryOcorrenciasScreen; todos combinam estado local volumoso com assinaturas em tempo real.

## Parte 5 - Estado do Canary (Phase 12)

### 5.1 Flags UI_NEXT existentes

| Flag | Tela alvo | Estado default atual |
|---|---|---|
| login_uiNext | LoginScreen | true (default) |
| registerCompany_uiNext | RegisterCompanyScreen | true (default) |
| novoPedido_uiNext | NovoPedidoScreen | true (default) |
| delivery_uiNext | DeliveryScreen (web) | true (default) |
| pagamento_uiNext | PagamentoScreen | true (default) |
| comandaGerenciamento_uiNext | ComandaGerenciamentoScreen | true (default) |
| admin_uiNext | AdminScreen/AdminActionCard | false (default) |

### 5.2 Waves ativos

- Wave 1 Auth (login/register): parcialmente ativo por flag default=true; referencia direta encontrada apenas para RegisterCompanyScreen.
- Wave 2 Ordering (novo pedido/delivery/comanda): ativo no default (true) para flags correspondentes.
- Wave 3 Settlement (pagamento): ativo no default (true).
- Wave 4 Admin: inativo no default (admin_uiNext=false).

### 5.3 Telas sem flag de canary UI_NEXT

- AboutScreen
- AdicionaisConfigModal
- BillingScreen
- CadastroProdutoScreen
- CaixaAberturaScreen
- CaixaFechamentoScreen
- CaixaHistoricoScreen
- CaixaOperacoesScreen
- CancellationReportScreen
- CashFlowScreen
- ComandaAbertaScreen
- ComandaVisualizacaoAdminScreen
- ConfiguracaoEstoqueScreen
- ConfiguracaoMesasScreen
- ConfiguracoesWhatsApp
- CozinhaScreen
- DeliveryOcorrenciasScreen
- EditarEmpresaScreen
- EstoqueScreen
- ExtrasConfigScreen
- FinancialConfigScreen
- FinancialDashboardScreen
- FuncionariosScreen
- GerenciarCardapioScreen
- GerenciarFornecedoresScreen
- MapaMesasScreen
- MenuSettings
- MontagemScreen
- OperationalSettingsScreen
- OverflowMenuScreen
- PedidoDetalhesModal
- PedidosProntosScreen
- PerformanceDashboardScreen
- PrinterConfigScreen
- ProductForm
- ProductList
- PublicMenuScreen
- ReservasScreen
- ResetPasswordScreen
- RotasDeliveryScreen
- StockManager
- UpdateCardapioScreen
- VariationManager

## Parte 6 - Priorizacao para Redesign

### 6.1 Ranking por criticidade UX (mais urgente primeiro)

| Rank | Projeto | Tela | Fluxo | Urgencia | Tokens (1-5) | Estados (1-5) | Acessibilidade (1-5) | Componentes padronizados (1-5) |
|---|---|---|---|---:|---:|---:|---:|---:|
| 1 | web | PedidoDetalhesModal | Balcao | 9 | 3 | 2 | 1 | 2 |
| 2 | app | PedidoDetalhesModal | Balcao | 9 | 3 | 2 | 1 | 2 |
| 3 | web | CozinhaScreen | KDS | 8.75 | 3 | 3 | 1 | 2 |
| 4 | web | MontagemScreen | Montagem | 8.75 | 3 | 3 | 1 | 2 |
| 5 | app | CaixaHistoricoScreen | Caixa | 8.75 | 4 | 2 | 1 | 2 |
| 6 | app | CozinhaScreen | KDS | 8.75 | 3 | 3 | 1 | 2 |
| 7 | app | MontagemScreen | Montagem | 8.75 | 3 | 3 | 1 | 2 |
| 8 | web | CadastroProdutoScreen | Balcao | 8.5 | 5 | 2 | 1 | 2 |
| 9 | web | CaixaHistoricoScreen | Caixa | 8.5 | 4 | 2 | 1 | 3 |
| 10 | web | PagamentoScreen | Caixa | 8.5 | 4 | 2 | 1 | 3 |
| 11 | web | PedidosProntosScreen | Montagem | 8.5 | 3 | 4 | 1 | 2 |
| 12 | app | CadastroProdutoScreen | Balcao | 8.5 | 5 | 2 | 1 | 2 |
| 13 | app | ComandaAbertaScreen | Balcao | 8.5 | 3 | 4 | 1 | 2 |
| 14 | app | PagamentoScreen | Caixa | 8.5 | 5 | 2 | 1 | 2 |
| 15 | app | PedidosProntosScreen | Montagem | 8.5 | 3 | 4 | 1 | 2 |
| 16 | web | CaixaAberturaScreen | Caixa | 8.25 | 5 | 3 | 1 | 2 |
| 17 | web | CaixaFechamentoScreen | Caixa | 8.25 | 3 | 5 | 1 | 2 |
| 18 | web | ComandaAbertaScreen | Balcao | 8.25 | 4 | 4 | 1 | 2 |
| 19 | web | NovoPedidoScreen | Balcao | 8.25 | 1 | 5 | 1 | 4 |
| 20 | web | ReservasScreen | Mesa | 8.25 | 3 | 5 | 1 | 2 |

### 6.2 Top 3 problemas sistemicos

- Baixa padronizacao visual nas telas legadas: alto volume de hardcode de cor/espacamento/tipografia fora de tokens semanticos em varias telas criticas.
- Cobertura de acessibilidade insuficiente: poucas labels explicitas (aria/accessibilityLabel) frente ao volume de elementos interativos operacionais.
- Estados de UX inconsistentes: loading/empty/error aparecem, mas sem padrao unico de skeleton, retry e feedback de rede transversal.

### 6.3 Componentes prioritarios para criar/atualizar em src/ui

- ScreenHeader/SectionHeader padrao (impacta Admin, Estoque, Caixa, Financeiro, Configuracoes).
- StateView padrao (loading/empty/error/retry/skeleton) para unificar experiencia transversal.
- DataListItem + ListContainer padronizados para filas operacionais (Cozinha, Montagem, Prontos, Delivery, Reservas).
- FormSection + FieldRow com validacao/erro consistente (Auth, Cadastro, Configuracoes, Billing).
- ConfirmActionDialog padrao para acoes destrutivas (Caixa, Estoque, Cardapio, Comandas, Admin).

## Resumo Executivo (10 linhas)

1. O inventario detectou 49 telas TSX no web e 46 telas TSX no app, com alto espelhamento entre projetos.
2. A navegacao principal cobre fluxos criticos, mas muitas telas administrativas vivem em modais/estado local sem rota explicita.
3. O design system base existe (tokens + cores + ui exports), porem a adocao nas telas ainda e heterogenea.
4. Web usa ScreenScaffold em grande parte das telas admin; app quase nao usa esse padrao.
5. Hardcode visual permanece alto em telas-chave (ex.: Login, RegisterCompany, PublicMenu, NovoPedido, GerenciarCardapio).
6. Acessibilidade esta abaixo do esperado: poucas labels explicitas para app e web.
7. Estados de loading/empty/error existem na maioria das telas, mas sem padronizacao sistemica de skeleton/retry.
8. Realtime esta ativo em telas operacionais centrais; ha risco de re-render excessivo em alguns fluxos de alta frequencia.
9. Canary UI_NEXT esta ativo para Auth/Ordering/Settlement por default e inativo para Admin (wave 4).
10. A prioridade UX imediata recai sobre telas operacionais de alto uso com baixa padronizacao e baixa acessibilidade.