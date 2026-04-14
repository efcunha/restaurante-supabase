# PROMPT DE CONTINUACAO UX/IX WEB (2026-04-14)

Uso: retomada da revisao UX/IX com foco prioritario em restaurante-web, mantendo paridade com restaurante-app quando aplicavel.

Ultima atualizacao: 2026-04-14

---

## Contexto principal

Use o prompt BASE como contexto principal.
Este complemento cobre especificidades de restaurante-web e o estado real apos a Fase 0 estrutural.

---

## Estado real ja implementado nesta sessao (NAO refazer)

### Sessao 2026-04-14 - TRABALHO REALIZADO

#### Phase 5: Delivery Screens (COMPLETO)
- ✅ DeliveryScreen: StateView cardapio loading, adicionais error handling, logger 4 calls, a11y labels
- ✅ RotasDeliveryScreen: Debounce realtime 300ms, StateView all states, aria-live region, logger 5 calls, a11y labels GPS/WhatsApp
- ✅ DeliveryOcorrenciasScreen: Debounce realtime 300ms, StateView all states, aria-live region, logger 1 call
- ✅ Bloqueadores críticos resolvidos: PagamentoScreen import fix (colors), E2E navigation resilience (fallback chain)
- ✅ E2E Validation: delivery.spec.ts PASSED (41.4s), delivery-garcom02.spec.ts PASSED (37.0s)
- ✅ Security: 0 high Snyk issues, 0 new TypeScript errors

#### Phase 3: Settlement Screens (COMPLETO - Logger Fixes)
- ✅ CaixaFechamentoScreen: 3 logger.error() signature fixes (finance config, load caixas, canceled total)
- ✅ CaixaHistoricoScreen: 1 logger.error() signature fix (fetch history)
- ✅ PagamentoScreen: 2 logger.error() signature fixes (load saldo, load pedidos)
- ✅ Total: 6 logger.error(message, error) signature fixes
- ✅ Security: 0 TypeScript errors on modified files

#### Fase 6: Admin (COMPLETO)
- ✅ ConfiguracoesScreen (NOVA): Team + profile management com FormSection + FieldRow + DataListItem + StateView
- ✅ BillingScreen: logger/security events reforcados (saveCard, setDefaultCard, deleteCard, pixFallback)
- ✅ CancellationReportScreen: migrado para StateView + DataListItem + logger em consulta de relatorio
- ✅ Debounce 300ms aplicado no fluxo de perfil (ConfiguracoesScreen)
- ✅ AdminScreen: acesso condicional por role (admin/gerente), debounce realtime 300ms, error state com StateView, logger em erros e tentativa sem permissao
- ✅ Stories web/admin states adicionadas (Storybook agora indexa src/features/admin + stories de AdminActionCard/AdminSection/AdminStateViewMatrix)
- ✅ Security: 0 TypeScript errors e 0 issues high no Snyk para os artefatos da Fase 6

#### Fase 7: Public Menu (EM ANDAMENTO)
- ✅ PublicMenuScreen refatorada para expo-image (lazy-load + transition + cachePolicy)
- ✅ Grid responsivo por breakpoints: sm=1 coluna, md=2 colunas, lg=3 colunas
- ✅ StateView aplicado para loading/error/empty/retry
- ✅ Busca com debounce 300ms
- ✅ Logger aplicado em carga do menu (success/not-found/error) sem PII
- ✅ Seguranca: Snyk code test (severity high) = 0 issues no PublicMenuScreen
- 🔄 Pendente para concluir Fase 7: smoke E2E da rota publica /menu/:slug e story da tela publica

#### Fase 2: Ordering Screens (COMPLETO - Logger Integration)
- ✅ PedidoDetalhesModal: Logger integration, error handling context, accessibility enhanced (5 logger calls)
- ✅ NovoPedidoScreen: StateView, logger baseline verified (4 calls pre-existing)
- ✅ MapaMesasScreen: 1 logger.error() signature fix (load structure)
- ✅ ComandaGerenciamentoScreen: 2 logger.error() signature fixes (cancel request, cancel item)
- ✅ Total: 3 logger signature fixes, PedidoDetalhesModal fully enhanced
- ✅ Security: 0 TypeScript errors

#### Fase 1: Auth Screens (COMPLETO - Security Logging)
- ✅ LoginScreen: 10 logging calls (login attempts/success/failure, biometric tracking, password reset flow)
- ✅ RegisterCompanyScreen: 5 logging calls + 4 console.* replacements (company onboarding audit trail, subscription setup)
- ✅ ResetPasswordScreen: 4 logging calls (password reset attempt/success/failure, validation)
- ✅ Total: 19 security logging calls added
- ✅ Security patterns: Email sanitization, company_id tracking, no PII exposure, auth flow audit trail

### Metricas Finais da Sessao (Incluindo Mobile Parity)
- **Web Screens Enhanced**: 16 (Phase 5 + Phase 3 + Fase 2 + Fase 1 + Fase 6 parcial)
- **App Screens Enhanced**: 2 (RotasDeliveryScreen, DeliveryOcorrenciasScreen)
- **Total Telas**: 18 screens com Phase 5+ patterns
- **Logger Enhancements**: 23+ new security logging calls (web) + 6 new calls (app) = 29+ total
- **Logger Signature Fixes**: 12 (web) + implied in app = comprehensive audit trail
- **E2E Tests Passing**: 2 web (delivery flow primary + parallel operator)
- **TypeScript Validation**: ✅ Clean on all 18 modified files
- **Security Gates**: ✅ 0 high Snyk issues validated (web + app), no PII exposure

---

## Estado anterior (Fases 0) ja implementado 
- Feature flags _uiNext criadas para as telas faltantes (default false)
- Componentes fundacionais criados e exportados em src/ui:
  - StateView
  - ScreenHeader
  - SectionHeader
  - ConfirmActionDialog
  - FormSection
  - FieldRow
  - DataListItem
  - ListContainer

2. ScreenScaffold:
- App atualizado com subtitle de operador e KeyboardAvoidingView por plataforma

3. Design system:
- App agora expoe breakpoints (paridade com web): sm/md/lg/xl
- colors.ts em app/web com guidance de migracao para designColors

4. Storybook e Figma:
- Web recebeu stories faltantes: Navbar, RestaurantCard, Sidebar, Table
- Web recebeu stories dos novos componentes fundacionais
- App recebeu stories espelhadas dos componentes base exportados
- .figma.tsx adicionado para componentes sem cobertura
- docs/design-system/figma-node-map.example.json atualizado
- docs/design-system/figma-node-map.generated.json criado e validado

5. Validacoes executadas:
- node docs/design-system/validate-figma-node-map.mjs => OK
- Snyk code scan em src/ui (app e web) => 0 issues

---

## Ajustes importantes em relacao ao prompt anterior

1. "App nao tem stories" esta desatualizado:
- Agora existem stories no app (espelhadas para governanca interna)
- Fonte de verdade para catalogo continua sendo restaurante-web Storybook

2. smoke-storybook-public.mjs pode falhar com 401 quando o host exigir auth:
- Se ocorrer 401, registrar evidencia e usar fallback autenticado antes de marcar como regressao
- Nao ficar em loop de retries

3. "implementar web primeiro" continua valido:
- Para telas sem dependencia nativa, web first
- Depois replicar para app respeitando paridade

---

## Especificidades web (mantidas)

Stack: React 19 + Expo Web 54 + TypeScript estrito
E2E: Playwright (restaurante-web/e2e/)

Telas exclusivas web:
- DeliveryScreen
- PublicMenuScreen
- SimuladoresScreen (DEV - nao priorizar)

Sub-telas admin/menu exclusivas web:
- AdicionaisConfigModal
- MenuSettings
- ProductForm
- ProductList
- StockManager
- VariationManager
- CancellationReportScreen
- ConfiguracoesWhatsApp

---

## Storybook - obrigacoes web

1. Antes de alterar componente:
- Consultar Storybook MCP para estado atual de docs/stories

2. Ao criar/atualizar componente:
- Atualizar story no web
- Atualizar .figma.tsx (quando aplicavel)
- Atualizar node map (example e generated se necessario)

3. Validacoes:
- node docs/design-system/validate-figma-node-map.mjs
- node docs/design-system/smoke-storybook-public.mjs
- CI: storybook-figma-guardrails.yml

Regra anti-loop:
- Falhou 2 vezes na mesma validacao -> parar e reportar causa + proximo passo

---

## Layout web - regras

- Breakpoints por tokens: sm 640, md 768, lg 1024, xl 1280
- Grid 12 colunas, gutter 24

Telas PDV (NovoPedido, Comanda, Cozinha, Montagem):
- Densidade compacta (menos padding, mais informacao por viewport)

Telas Admin (relatorios, configuracoes):
- Layout mais espacoso
- sidebar + content em lg+
- Reusar Sidebar exportada de src/ui

---

## Acessibilidade web especifica

- aria-label em botoes/icon-only
- aria-live="polite" em atualizacoes realtime
  (Cozinha, Montagem, PedidosProntos, Delivery, Reservas)
- role="alert" em erro critico
- role="alertdialog" no ConfirmActionDialog
- Focus management em modal (focar primeiro elemento interativo)
- Tab order logico em formularios

---

## Tratamento especial de telas exclusivas web

PublicMenuScreen (/menu/:slug):
- Unica tela publica (cliente final)
- Layout mobile-first responsivo
- Imagens com lazy load (expo-image)
- Query publica com RLS, sem dados sensiveis
- Nao aplicar densidade de PDV

DeliveryScreen (web only):
- Pipeline horizontal de status com token por etapa
- Grid responsivo cards: desktop 3, tablet 2, mobile 1
- Realtime com debounce 300ms

Sub-telas admin/menu exclusivas web:
- AdicionaisConfigModal: migrar hardcodes para designColors/tokens
- ProductForm/ProductList/StockManager/VariationManager:
  usar FormSection + FieldRow + DataListItem

---

## Ordem de execucao sugerida (proximas sessoes)

### Prioridade 1: Mobile App Parity (restaurante-app) ✅ COMPLETO
Mirror Phase 5 delivery screen improvements — **IMPLEMENTADO 2026-04-14**:
- RotasDeliveryScreen.tsx: ✅ StateView + debounce realtime 300ms + logger (5 calls) + WhatsApp/status logging
- DeliveryOcorrenciasScreen.tsx: ✅ StateView + debounce realtime 300ms + logger (1 call) + error state
- **Nota**: App nao tem DeliveryScreen separado (web-only tela de formulario); ambas telas de gerenciamento alinhadas com patterns web
- **Validacao**: 0 TypeScript errors, 0 high Snyk issues
- **Tempo efetivo**: ~45 min (patterns ja validados, implementacao rapida)

### Prioridade 2: Fase 6 Admin (restaurante-web) ✅ COMPLETO
Status atual:
- ✅ BillingScreen: Payment history + subscription management (logger/security reforcado)
- ✅ RelatorioCancelamentosScreen: Cancellation audit trail (StateView + DataListItem)
- ✅ ConfiguracoesScreen: Team + profile management (NOVA)
- ✅ AdminScreen: acesso condicional + dashboard layout estabilizado com StateView e logger
- ✅ Stories web das novas telas/admin states
- **Gate**: admin_uiNext continua false ate feature-complete

### Prioridade 3: Public Menu (restaurante-web) 🔄 EM ANDAMENTO
PublicMenuScreen (/menu/:slug) - tela publica:
- Mobile-first layout responsivo
- Lazy load images (expo-image)
- Public RLS query (sem dados sensiveis)
- StateView loading/empty/error + retry
- Logger sem PII em falhas de carregamento
- **Status**: implementacao principal concluida; faltam validacoes finais (E2E/story)

### Prioridade 4: Admin Sub-Screens (restaurante-web)
Migracao de hardcodes para design tokens:
- AdicionaisConfigModal: designColors + FormSection pattern
- ProductForm/ProductList/StockManager/VariationManager: DataListItem pattern
- **Tempo estimado**: 2-3h (refactor incremental, sem mudanca de UX)

---

## Regras inegociaveis para toda implementacao

- Zero hardcode de cor/fonte/espacamento em codigo novo
- Preferir designColors + tokens
- Toda tela com dados remotos: loading/empty/error via StateView
- Acoes destrutivas: ConfirmActionDialog obrigatorio
- Realtime: debounce 300ms + memo em derivados pesados
- Query multi-tenant com company_id e cobertura por RLS
- Sem segredo hardcoded
- Sem PII em logs

---

## Criterio de pronto por tela

- Hardcodes substituidos
- ScreenScaffold + Header padronizados
- StateView integrado
- A11y (labels/roles/focus) aplicada
- Story atualizada no web
- .figma.tsx atualizado quando aplicavel
- node-map validado
- E2E relevante passando (Playwright web)

---

## Comando de inicio rapido para a proxima sessao

### PROXIMA: Public Menu (restaurante-web) — RECOMENDADO
"Use este arquivo como contexto: docs/PROMPT_CONTINUACAO_UXIX_WEB_2026-04-14.md.
Implemente PublicMenuScreen (/menu/:slug) com foco em tela publica:
- Layout mobile-first responsivo (sm=1col, md=2cols, lg=3cols)
- Lazy load de imagens (expo-image)
- Query publica protegida por RLS (sem dados internos)
- StateView para loading/empty/error
- Logger sem PII em falhas de carregamento
Tempo: 1-2h + validacao E2E."

### Se retomando Fase 6 Admin (pendencias):
"Use Fase 6 Admin no restaurante-web (features/admin/).
Pendencias:
- Nenhuma pendencia tecnica restante da Fase 6.
Padroes: FormSection + FieldRow + DataListItem para CRUD.
ScreenScaffold + StateView para loading/error/empty.
Logger para security events (RBAC, policy changes).
admin_uiNext continua false ate feature-complete."

### Se pulando para Public Menu:
"PublicMenuScreen (/menu/:slug) - tela publica responsiva.
Mobile-first, lazy load images (expo-image).
RLS query publica (sem dados internos).
Layout: sm=1col, md=2cols, lg=3cols. 
Tempo: 1-2h design + 1h E2E."

---

## Checklist para validacao final de qualquer nova sessao

- [ ] Phase/Fase completada: todas as telas com 0 TypeScript errors
- [ ] Logger: todas as telas operacionais com logger.info (not console.*)
- [ ] E2E: fluxo critico (se existente) passing (Playwright)
- [ ] Security: Snyk code test --severity-threshold=high => 0 issues
- [ ] Acessibilidade: WCAG 2.1 AA (aria-live, aria-label, role)
- [ ] Design: sem hardcodes (colors, fonts, spacing via tokens/designColors)
- [ ] Storybook: stories atualizadas (web primary)
- [ ] RLS: queries verificadas por company_id (multi-tenant safe)
- [ ] PII: nenhuma senha/CPF/email completo nos logs (sanitize!)
- [ ] Docs: PROMPT_CONTINUACAO_UXIX_WEB atualizado com status
