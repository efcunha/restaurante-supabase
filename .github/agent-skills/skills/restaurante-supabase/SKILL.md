---
name: restaurante-supabase
description: Especialista no projeto restaurante-supabase — POS/PDV full-stack para restaurantes brasileiros com React Native (Expo), TypeScript e Supabase. Use esta skill para pedidos, caixa, estoque, pagamentos, montagem, delivery, UX app/web, feature flags canary, E2E Playwright e performance.
---

# Skill: restaurante-supabase

## Objetivo
Guiar implementacoes e reviews no projeto com foco em:
- Seguranca de dados multi-tenant (`company_id` + RLS)
- Estabilidade dos fluxos criticos (Balcao, Mesa, Delivery, Montagem)
- Confiabilidade da remuneracao SaaS dos aplicativos (assinaturas, cobrancas e reconciliacao)
- Paridade entre `restaurante-app` e `restaurante-web`
- Rollout seguro via feature flags (Phase 12)

## Contexto Rapido
- `restaurante-app/`: app React Native + Expo
- `restaurante-web/`: web (Expo Web) + testes E2E Playwright
- `restaurante-ops/`: servico operacional/admin de SaaS (auth, metrics, billing, health)
- `saas-billing/`: artefatos auxiliares do dominio de cobranca/remuneracao
- Backend: Supabase (PostgreSQL + Auth + Realtime)
- Integracoes: Edge Functions (delivery) e Activepieces (automacoes WhatsApp)

## Politica de Ambiente
- Nao existe ambiente de staging dedicado neste projeto no momento.
- Validacoes e deploys acontecem diretamente em producao.
- Para mudancas sensiveis (seguranca, auth, billing, RLS, CORS, rate limiting), usar rollout guardado: validar endpoint publico, executar smoke controlado e registrar evidencias no mesmo ciclo.

## Stack Principal
- React Native 19 + Expo 54
- TypeScript estrito
- Supabase (PostgreSQL 15+, RLS, Realtime)
- Playwright (`restaurante-web/e2e`)
- Sentry (`src/config/sentryConfig.js`)

## Arquivos de Referencia (alta prioridade)
- `src/config/SupabaseConfig.ts`
- `src/config/featureFlags.ts`
- `src/design-system/tokens.ts`
- `src/theme/colors.ts`
- `src/ui/index.ts`
- `src/layouts/ScreenScaffold.tsx`
- `src/auth/roles.js`
- `scripts/phase12-profile.js`
- `database-backup/migrations/20260311161100_schema_dump.sql`
- `database-backup/migrations/20260323183000_harden_profiles_rls_and_role_guardrails.sql`
- `docs/security/SECURITY_AUDIT_REPORT_2026-03-23.md`
- `docs/security/REMEDIATION_PLAN_DETAILED.md`
- `docs/security/LGPD_COMPLIANCE_GUIDE.md`
- `restaurante-ops/src/modules/billing-operations.ts`
- `restaurante-ops/src/index.ts`
- `restaurante-ops/docs/API-CONTRACTS.md`

## Regras Inegociaveis
1. Toda query deve respeitar isolamento por `company_id`.
2. Nao bypassar RLS.
3. Nao hardcodar segredo em codigo fonte.
4. Nao copiar testes de `restaurante-web/e2e` para `restaurante-app`.
5. Em mudancas de fluxo critico, validar E2E antes de promover.
6. Para UI nova, usar tokens do design system; evitar hardcode visual.
7. Scripts operacionais com credenciais devem usar `database-backup/.env.local` (gitignored) e template em `database-backup/.env.example`.

## Padrões de Arquitetura
- Data/business logic em `src/services/`.
- UI reutilizavel via `src/ui/` (nao importar `ui-next` direto das telas).
- Blocos especificos de feature em `src/features/<feature>/components` + `types.ts` local.
- Novas telas devem preferir `ScreenScaffold`.
- Em modulos espelhados app/web, aplicar alteracoes simetricas sempre que possivel.

## Canary Rollout (Phase 12)
Flags de UI canary:
- `EXPO_PUBLIC_FEATURE_LOGIN_UI_NEXT`
- `EXPO_PUBLIC_FEATURE_REGISTER_COMPANY_UI_NEXT`
- `EXPO_PUBLIC_FEATURE_NOVO_PEDIDO_UI_NEXT`
- `EXPO_PUBLIC_FEATURE_DELIVERY_UI_NEXT`
- `EXPO_PUBLIC_FEATURE_PAGAMENTO_UI_NEXT`
- `EXPO_PUBLIC_FEATURE_COMANDA_GERENCIAMENTO_UI_NEXT`
- `EXPO_PUBLIC_FEATURE_ADMIN_UI_NEXT`

Sequencia recomendada:
1. Wave 1: Auth
2. Wave 2: Ordering
3. Wave 3: Settlement
4. Wave 4: Admin (maior risco)

Rollback total:
- `npm run phase12:legacy -- --env <env_real_em_uso>`

## Dominio e Integridade
Conceitos chave:
- **Comanda**: agrupador de pedidos (mesa, balcao, delivery)
- **Montagem**: separacao/preparo de itens
- **KDS/Cozinha**: execucao operacional da fila

Invariantes importantes:
- Em `orders`, cancelamento usa `status='cancelled'`.
- Estado da comanda pode usar `comanda_status='cancelada'`.
- Cancelamento de comanda deve propagar por chave logica: `company_id + date_key + comanda_number`.
- Delivery concluido (`delivered`) exige reconciliar pagamento e fechamento da comanda quando nao houver pedidos ativos.
- Evitar encadear dois `.neq` no mesmo campo em query Supabase/PostgREST (pode gerar 400).
- Em remuneracao SaaS, reconciliacao de evento deve ser idempotente por `idempotency_key`.
- Em `paymentStatus='paid'`, invoice `paid/cancelled` nao deve ser reaplicada.
- Em `paymentStatus='failed'`, invoice `paid/cancelled` nao deve transicionar para falha.
- Assinatura `cancelled` nao deve ser reativada automaticamente por reconcile `paid`.

## Banco de Dados (resumo operacional)
Funcoes/indices criticos:
- `get_next_delivery_comanda_number(company_id, env)`
- `adicionar_consumo_atomico(...)`
- `idx_unique_open_mesa` (uma comanda aberta por mesa/dia)
- `can_manage_company_profiles(target_company_id)`
- `can_self_update_profile(...)`

Migracoes de referencia:
- `20260311161100_schema_dump.sql` (baseline local; validar remoto em caso de drift)
- `20260314164000_fix_atomic_consume_function_type_casts.sql`
- `20260314203000_add_unique_open_mesa_index.sql`
- `20260322170000_create_reconcile_billing_event_atomic_function.sql`
- `20260323183000_harden_profiles_rls_and_role_guardrails.sql`

Runbook de remuneracao (ops):
1. Priorizar `public.reconcile_billing_event_atomic` como caminho unico de escrita para reconcile.
2. Para deploy do `restaurante-ops` no monorepo, usar `railway up --service restaurante-ops --path-as-root ./restaurante-ops`.
3. Se SQL manual for aplicado, sincronizar imediatamente `database-backup/migrations/` e `supabase_migrations.schema_migrations`.

Antes de alterar schema:
1. Ler schema dump atual.
2. Validar impacto em fluxos Balcao/Mesa/Delivery/Montagem.
3. Confirmar compatibilidade com app e web.
4. Para mudancas de seguranca/RLS, validar catalogo remoto (`pg_policies`, `pg_proc`, `pg_constraint`) apos aplicar migration.

## Seguranca e LGPD (Mar/2026)
Implementacoes ja aplicadas:
- Auditoria consolidada em:
	- `docs/security/SECURITY_AUDIT_REPORT_2026-03-23.md`
	- `docs/security/REMEDIATION_PLAN_DETAILED.md`
	- `docs/security/LGPD_COMPLIANCE_GUIDE.md`
	- `docs/security/EXECUTIVE_SUMMARY_PT.md`
	- `docs/security/SECURITY_DOCUMENTATION_INDEX.md`
- Hardening de segredos em scripts de backup/restore/deploy:
	- migrado para `database-backup/.env.local` + `database-backup/.env.example`
	- removidos legados `database-backup/config.local.sh` e `database-backup/config.example.sh`
- Hardening de `public.profiles` aplicado remoto:
	- removeu policy permissiva `SELECT USING (true)`
	- acesso agora: self + admin/gerente da mesma empresa
	- `handle_new_user` normaliza aliases legados para roles canonicas
	- `profiles_role_check` alinhado para `admin`, `gerente`, `garcom`, `cozinheiro`, `montagem`, `entregador`, `caixa`
- Compatibilidade app/web atualizada para aliases de papel (`manager`/`waiter`/`kitchen`) sem regressao de fluxo.

Consolidacao operacional (2026-03-24):
- CORS endurecido nas Edge Functions com allowlist por origem e sem fallback wildcard.
- Chaves/URLs hardcoded removidas de testes E2E; uso padronizado por variaveis de ambiente.
- Rate limiting do `restaurante-ops` endurecido com modo estrito fail-closed (`RATE_LIMIT_FALLBACK_ENABLED=false`) e resposta `503` quando Redis indisponivel.
- Validacao em producao concluida para login (`/auth/login`) com `429` e headers de rate limit.
- Billing ainda nao live em producao; validacao de billing deve ocorrer em check controlado antes do go-live.

## Activepieces (pagamento delivery)
Referencias:
- Projeto: `aqW21pXGsiXLhvorLCeIo`
- Flow pedidos: `jtW3UuIn24Wg415GQ0sHW`
- Step critico: `code_delivery_payment`

Licoes criticas:
- Nao mapear `supabase_service_role_key` para campos do trigger (ex.: `payment_method`).
- Se runtime nao herdar env, usar credencial no input configurado do step (na configuracao), sem hardcode em `sourceCode.code`.

Runbook curto (webhook 200 sem insert em `pagamentos`):
1. Confirmar payload (`order_type=delivery`, `status_novo=delivered`).
2. Inspecionar output do step (`missing_supabase_credentials` vs erro de insert).
3. Revisar inputs: `company_id`, `total_amount`, `comanda_number`, `payment_method`.
4. Publicar via API (`UPDATE_ACTION` -> `LOCK_AND_PUBLISH`).
5. Garantir flow `ENABLED` e validar before/after (`DELTA=+1`).

## Aprendizados Operacionais Recentes (Mar/2026)
- App e web compartilham estrutura espelhada: tratar refactor/lint/performance em pares.
- `CozinhaScreen` e `MontagemScreen`: usar `useMemo` para derivados pesados.
- `useComandaManagement`: paralelizar queries independentes com `Promise.all`.
- `NovoPedidoScreen`: chips de categoria mais estaveis com offset medido por secao + fallback robusto em `onScrollToIndexFailed`.
- Busca de cardapio deve remover diacriticos (`normalize('NFD')`).
- Em web, import faltante de `Platform` pode quebrar bootstrap cedo.
- Build Android pode falhar por texto acidental de shell colado em `.tsx` (erro Metro de sintaxe).
- Em investigacoes de RLS, tratar banco remoto como fonte de verdade quando houver drift local-remoto.
- Em `profiles`, policy de self-update deve bloquear troca de `company_id`, `role`, `funcao`, `email` e `active` pelo proprio usuario.
- Em fluxo de cadastro de funcionario, manter compatibilidade com profile inicial sem `company_id` ate update administrativo.

## Fluxo de Trabalho Recomendado
1. Implementar e validar no `restaurante-web`.
2. Replicar para `restaurante-app` apenas o que for producao.
3. Executar testes criticos E2E.
4. Promover wave canary apenas com evidencias de estabilidade.

Regra anti-loop:
- Se um comando falhar, tentar corrigir uma vez.
- Se falhar novamente, parar e pedir direcionamento.

## Comandos Uteis
```bash
# Desenvolvimento
cd restaurante-app && npm start
npm run android
npm run ios
npm run web

# Testes
npm test
npm run test:e2e
npm run test:performance

# E2E critico (web)
cd restaurante-web
npx playwright test e2e/balcao.spec.ts e2e/mesa.spec.ts e2e/pizza.spec.ts e2e/delivery.spec.ts --repeat-each=1 --workers=1

# Canary Phase 12
npx playwright test e2e/phase12-auth-canary.spec.ts --project=chromium --workers=1
npx playwright test e2e/phase12-ordering-canary.spec.ts --project=chromium --workers=1
npx playwright test e2e/phase12-settlement-canary.spec.ts --project=chromium --workers=1
npx playwright test e2e/phase12-admin-canary.spec.ts --project=chromium --workers=1
```

## Checklist para o Copilot (antes de responder)
1. Esta mudanca afeta app, web ou ambos?
2. Existe impacto em fluxo critico (Balcao, Mesa, Delivery, Montagem)?
3. A query/servico respeita `company_id` e RLS?
4. Ha feature flag adequada para rollout/rollback?
5. Precisa validar E2E/canary antes de recomendar merge?
6. Existe risco de drift entre app e web?

Se houver duvida de schema, operar com postura conservadora e consultar primeiro `schema_dump.sql`.
