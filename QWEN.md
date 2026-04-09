# restaurante-supabase — QWEN.md

## Visão Geral

Monorepo do ecossistema **restaurante-supabase** — sistema POS/PDV full-stack para restaurantes brasileiros. App mobile React Native + Expo, web POS Expo Web, backoffice SaaS com billing/assinaturas, tudo orchestradado via Supabase (PostgreSQL + Auth + RLS + Edge Functions).

### Subprojetos

| Pasta | Descrição | Stack |
|---|---|---|
| `restaurante-app/` | App POS mobile (React Native + Expo) | RN 0.84, Expo 54, React 19, TS strict |
| `restaurante-web/` | POS web + E2E Playwright | Expo Web, React 19, Playwright |
| `restaurante-ops/` | Backoffice SaaS (clientes, métricas, billing, auth) | Node.js + TS, Redis, Railway |
| `database-backup/` | Migrations, backup, restore, Edge Functions | PostgreSQL 15+, Supabase |
| `docs/` | Documentação transversal (segurança, LGPD, observability, billing) | Markdown |

## Stack Tecnológica

- **Frontend:** React 19, React Native 0.84, Expo SDK 54, TypeScript 5.9 (strict mode)
- **Backend:** Node.js (tsx watch), Supabase Edge Functions
- **Database:** PostgreSQL 15+ com RLS, Realtime, Auth
- **State:** React Context API, hooks customizados
- **Navegação:** React Navigation v6
- **Testing:** Jest + Testing Library (unit), Playwright (web E2E), Maestro (app E2E)
- **Linting/Format:** ESLint 9 (flat config), Prettier
- **Deploy:** EAS Build (mobile), Railway (web/ops)
- **Monitoring:** Sentry
- **Billing:** Mercado Pago via Supabase Edge Functions
- **i18n:** i18next + react-i18next
- **CI/CD:** GitHub Actions (workflows em `.github/workflows/`)

## Arquitetura de Código

### Estrutura src/ (app/web — espelhados)

```
src/
├── auth/              # Autenticação e roles (roles.js)
├── components/        # Componentes reutilizáveis
├── config/            # SupabaseConfig.ts, featureFlags.ts, sentryConfig.js
├── context/           # React Contexts (Auth, Billing, etc.)
├── design-system/     # tokens.ts (design tokens)
├── features/          # Módulos de funcionalidade com components/ + types.ts local
├── hooks/             # Custom hooks
├── i18n/              # Internacionalização
├── layouts/           # ScreenScaffold.tsx (layout padrão)
├── navigation/        # Configuração de rotas
├── screens/           # Telas (NovoPedidoScreen, ComandaGerenciamentoScreen, etc.)
├── services/          # Serviços de acesso a dados (Supabase queries)
├── theme/             # colors.ts (temas visuais)
├── types/             # Tipos TypeScript
├── ui/                # Componentes de UI reutilizáveis (index.ts)
└── utils/             # Funções utilitárias
```

### restaurante-ops (Backoffice SaaS)

```
src/
├── modules/
│   ├── customers/     # Lifecycle de clientes
│   ├── billing/       # Assinatura, invoices, reconciliação
│   └── metrics/       # Agregação e analytics operacional
├── routes/            # Rotas HTTP
├── services/          # Serviços externos
└── index.ts           # Entry point (porta 4040)
```

Endpoints:
- `GET /` ou `GET /dashboard` — Dashboard
- `GET /login` / `GET /register` — Auth UI
- `GET /healthz` — Healthcheck
- `GET /api/status` — Status dos módulos
- `POST /auth/login` / `POST /auth/register` — Auth endpoints

## Comandos Principais

### restaurante-app (Mobile)

```bash
cd restaurante-app
npm install
npm start              # Expo dev
npm run android        # Rodar no Android
npm run ios            # Rodar no iOS
npm run web            # Rodar como web

npm run lint && npm run lint:fix
npm run format
npm run type-check

npm run test
npm run test:coverage
npm run test:supabase          # testes Supabase
npm run test:performance       # testes de performance

# Deploy via EAS
npm run deploy:eas
npm run deploy:eas:android
npm run deploy:eas:ios
```

### restaurante-web (Web POS)

```bash
cd restaurante-web
npm install
npm start              # Expo Web (porta 8081)

npm run lint && npm run lint:fix
npm run format
npm run type-check

# E2E Playwright
npm run test:e2e
npm run test:e2e:ui
npm run test:e2e:admin
npm run test:stress

# Build + Deploy
npm run build
npm run deploy:railway
```

### restaurante-ops (Backoffice SaaS)

```bash
cd restaurante-ops
npm install
npm run dev            # tsx watch (porta 4040)
npm run build          # TypeScript build
npm run start          # Node dist/index.js
npm run check          # TypeScript --noEmit
npm run test

# Utilitários
npm run billing:candidates
npm run rate-limit:smoke            # bash
npm run rate-limit:smoke:ps         # PowerShell
npm run alerts:discord:provision
```

### Database

```bash
cd database-backup
cp .env.example .env.local

# Backup / Restore
./backup.sh             # Linux/Mac
backup.bat              # Windows
./restore.sh            # DESTRUTIVO!
./check-migration-sync.sh  # Verificar drift de migrations
```

### Canary Phase 12

```bash
# Aplicar perfis canary por wave
npm run phase12:auth          # Wave 1: Auth
npm run phase12:ordering      # Wave 2: Ordering
npm run phase12:settlement    # Wave 3: Settlement
npm run phase12:full          # Full Phase 12

# Rollback total
npm run phase12:legacy -- --env production
```

## Setup Inicial

### 1. Variáveis de Ambiente

Cada subprojeto possui `.env.example`. Copiar para `.env`:

```bash
cp restaurante-app/.env.example restaurante-app/.env
cp restaurante-web/.env.example restaurante-web/.env
cp restaurante-ops/.env.example restaurante-ops/.env
cp database-backup/.env.example database-backup/.env.local
```

Variáveis essenciais (app/web):
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Variáveis de billing:
- `EXPO_PUBLIC_FEATURE_BILLING`
- `EXPO_PUBLIC_FEATURE_BILLING_LICENSE_GATE`
- `EXPO_PUBLIC_FEATURE_BILLING_SCREEN`

**Importante:** variáveis com prefixo `EXPO_PUBLIC_*` são bundladas no app — **nunca** colocar `service_role_key` ou segredos de servidor nessas variáveis.

### 2. Edge Functions (Billing)

```bash
cd database-backup/supabase/functions
cp .env.example .env
# Configurar MERCADOPAGO_PUBLIC_KEY, MERCADOPAGO_ACCESS_TOKEN, MERCADOPAGO_WEBHOOK_SECRET
```

### 3. Supabase CLI

Instalado via Scoop: `C:\Users\ECUNHA\scoop\shims\supabase.exe`. **Não** instalar via `npm install -g supabase`.

## Regras Inegociáveis

1. **Toda query deve respeitar isolamento por `company_id`** — defesa em profundidade, mesmo com RLS.
2. **Nunca bypassar RLS** — nem com `.rpc()` sem SECURITY DEFINER revisado.
3. **Nunca hardcodar segredos** — usar variáveis de ambiente; checar antes de commitar.
4. **Não copiar testes E2E entre app e web** — Playwright é para web, Maestro é para app nativo.
5. **Fluxos críticos (Balcao, Mesa, Delivery, Montagem) exigem E2E** antes de promover mudanças.
6. **UI nova usa design tokens** (`src/ui/`) — evitar styling ad-hoc.
7. **Scripts operacionais usam `database-backup/.env.local`** (gitignored) — nunca `config.local.sh`.
8. **Paridade app/web** — em módulos espelhados, aplicar alterações simétricas sempre que possível.

## Política de Idioma

| Escopo | Idioma |
|---|---|
| Respostas, explicações, comentários no código | **Português** |
| Nomes de variáveis, funções, tipos, arquivos, branches | **Inglês** |
| Mensagens de commit | **Inglês** no subject; body pode ter detalhes em português |
| Nunca misturar idiomas dentro do mesmo bloco de código |

## Padrões de Arquitetura

- **Data/business logic** em `src/services/` — não em componentes de UI.
- **UI reutilizável** via `src/ui/` — não importar `ui-next` direto das telas.
- **Blocos de feature** em `src/features/<feature>/components` com `types.ts` local.
- **Novas telas** devem preferir `ScreenScaffold`.
- **Hooks customizados** (`useXxx`) para encapsular lógica de estado e efeitos.
- **Feature flags** (`featureFlags.ts`) controlam **visibilidade de UI**, nunca acesso a dados.

## Canary Rollout (Phase 12)

Flags de UI canary:
- `EXPO_PUBLIC_FEATURE_LOGIN_UI_NEXT`
- `EXPO_PUBLIC_FEATURE_REGISTER_COMPANY_UI_NEXT`
- `EXPO_PUBLIC_FEATURE_NOVO_PEDIDO_UI_NEXT`
- `EXPO_PUBLIC_FEATURE_DELIVERY_UI_NEXT`
- `EXPO_PUBLIC_FEATURE_PAGAMENTO_UI_NEXT`
- `EXPO_PUBLIC_FEATURE_COMANDA_GERENCIAMENTO_UI_NEXT`
- `EXPO_PUBLIC_FEATURE_ADMIN_UI_NEXT`

Sequência: **Auth → Ordering → Settlement → Admin** (Admin = maior risco).

### Billing / Licensing (rollout independente)
- `EXPO_PUBLIC_FEATURE_BILLING=true` → `billing_enabled` (master toggle)
- `EXPO_PUBLIC_FEATURE_BILLING_FORCE_BLOCK=true` → `billing_forceBlock` (**QA only** — nunca ativar em produção)
- **Status atual:** billing **não está live em produção**.
- **Pré-requisito:** `LicenseGate` deve envolver telas operacionais (`NovoPedidoScreen`, `ComandaGerenciamentoScreen`, `RotasDeliveryScreen`) antes de `billing_enabled=true`.

## Banco de Dados — Referência Operacional

### Migrations de Referência

| Migration | Descrição |
|---|---|
| `20260311161100_schema_dump.sql` | Baseline do schema |
| `20260314164000_fix_atomic_consume_function_type_casts.sql` | Fix type casts |
| `20260314203000_add_unique_open_mesa_index.sql` | Índice unique comanda aberta |
| `20260322170000_create_reconcile_billing_event_atomic_function.sql` | Função atômica de reconcile billing |
| `20260323183000_harden_profiles_rls_and_role_guardrails.sql` | Hardening RLS profiles |
| `20260328175830_product_adicionais.sql` | Tabela product_adicionais |
| `20260329113000_normalize_product_adicionais_category_constraints.sql` | Normalização category constraints |
| `20260329140000_fix_adicionais_unico_null_and_trigger.sql` | Fix null/trigger adicionais |

### Funções/Índices Críticos

- `get_next_delivery_comanda_number(company_id, env)`
- `adicionar_consumo_atomico(...)`
- `idx_unique_open_mesa` (uma comanda aberta por mesa/dia)
- `can_manage_company_profiles(target_company_id)`
- `can_self_update_profile(...)`
- `public.reconcile_billing_event_atomic` — **único caminho de escrita** para reconcile billing em ops

### Workflow de Migration (Obrigatório)

1. Criar migration em `database-backup/migrations/` antes de SQL manual.
2. Aplicar imediatamente ao DB target (mesma sessão de trabalho).
3. Verificar registro em `supabase_migrations.schema_migrations`.
4. Validar drift com `check-migration-sync.sh`.
5. Validar `pg_policies` para mudanças de RLS/segurança.
6. **Fonte de verdade remoto:** se local e remoto divergem, validar contra catálogo remoto (`pg_policies`, `pg_constraint`, `pg_proc`).

## Domínio e Integridade

### Invariantes Importantes

- Em `orders`, cancelamento usa `status='cancelled'`. Estado da comanda pode usar `comanda_status='cancelada'`.
- Em `product_adicionais`, `selection_type` e `max_choices` devem ser coerentes por `company_id + product_id + category`. Em inconsistência, aplicar fail-safe pelo menor `max_choices` positivo.
- Delivery concluído (`delivered`) exige reconciliar pagamento + fechamento de comanda.
- **Evitar** dois `.neq` no mesmo campo em query Supabase/PostgREST (pode gerar 400).
- Reconciliação billing deve ser **idempotente** por `idempotency_key`.
- Invoice `paid/cancelled` não deve ser reaplicada; assinatura `cancelled` não deve ser reativada automaticamente.

### Roles Canônicas

`admin`, `gerente`, `garcom`, `cozinheiro`, `montagem`, `entregador`, `caixa`

**Não usar aliases legados** (`manager`, `waiter`, `kitchen`) em código novo.

## Segurança e LGPD

### Vulnerabilidades Bloqueantes (impedem merge)

| ID | Vulnerabilidade | Exemplo |
|---|---|---|
| `SEC-01` | Segredo hardcoded | `service_role_key` em `.ts` |
| `SEC-02` | Bypass de RLS | `.rpc()` sem validação de `company_id` |
| `SEC-03` | Token em AsyncStorage sem criptografia | `AsyncStorage.setItem('token', jwt)` |
| `SEC-04` | CORS wildcard em endpoint autenticado | `Access-Control-Allow-Origin: *` com Bearer |
| `SEC-05` | Input não validado em operação financeira | Valor sem type guard |
| `SEC-06` | PII em log/Sentry sem mascaramento | `console.log('user:', user.email)` |
| `SEC-07` | Credencial server-only em `EXPO_PUBLIC_*` | `EXPO_PUBLIC_SERVICE_ROLE_KEY` |
| `SEC-08` | Flag de QA ativa em produção | `billing_forceBlock=true` em prod |

### Regras de Segurança

- Tokens JWT → usar `expo-secure-store` no mobile (não `AsyncStorage`).
- `service_role_key` **apenas** em Edge Functions / servidor — nunca no cliente.
- CORS nas Edge Functions usa **allowlist explícita** — sem fallback wildcard.
- Rate limiting no ops usa Redis-first com fail-closed (`RATE_LIMIT_FALLBACK_ENABLED=false`).
- Sentry: configurar `beforeSend` para remover PII (`email`, `ip_address`).
- LGPD: dados pessoais não logados em texto claro; acesso restrito por RLS + role; política de retenção e exclusão.

### Documentos de Referência

| Doc | Caminho |
|---|---|
| Auditoria de segurança | `docs/security/SECURITY_AUDIT_REPORT_2026-03-23.md` |
| Plano de remediação | `docs/security/REMEDIATION_PLAN_DETAILED.md` |
| Guia LGPD | `docs/LGPD/LGPD-COMPLIANCE-GUIDE.md` |
| Índice de segurança | `docs/security/SECURITY_DOCUMENTATION_INDEX.md` |

## Política de Testes (Obrigatória)

- **Toda feature nova** exige pelo menos um teste: unitário ou E2E.
- **Fluxos críticos** (Balcao, Mesa, Delivery, Montagem, Billing) exigem cobertura E2E antes de merge.
- **Smoke tests** obrigatórios para mudanças em: auth, RLS, billing, CORS, rate limiting.
- **Nunca propor remoção** de testes existentes sem justificativa explícita.
- E2E crítico web: `npx playwright test e2e/balcao.spec.ts e2e/mesa.spec.ts e2e/pizza.spec.ts e2e/delivery.spec.ts --workers=1`
- Maestro E2E app: flows em `restaurante-app/.maestro/` (balcao, mesa, pizza + variações garcom)

## Definition of Done (DoD)

Uma feature só está completa quando:

- [ ] Código com tipagem forte (sem `any` injustificado)
- [ ] Migration criada em `database-backup/migrations/` (se mudança de schema)
- [ ] Migration aplicada remotamente e verificada
- [ ] RLS validada remotamente em `pg_policies` (se aplicável)
- [ ] Feature flag criada (`*_UI_NEXT`) se rollout progressivo
- [ ] Teste unitário ou E2E cobrindo fluxo principal
- [ ] Smoke test executado para mudanças sensíveis
- [ ] Sem segredos hardcoded; variáveis documentadas em `.env.example`
- [ ] LGPD verificada se PII envolvido
- [ ] PR description em inglês com contexto e evidência

## Skill Routing (para Copilot / Agentes)

Para qualquer tarefa neste repositório:

1. **Consultar primeiro:** `.github/skills/restaurante-supabase/SKILL.md`
2. **Especializadas conforme escopo:**
   - RN performance/rendering → `.github/skills/react-native-best-practices/SKILL.md`
   - CI/GitHub Actions → `.github/skills/github-actions/SKILL.md`
   - UI/UX design → `.github/skills/ui-ux-pro-max/PROMPT.md`
3. **restaurante-ops:** módulo mais crítico — atenção redobrada a segurança, idempotência e auditabilidade.
4. Em caso de conflito, **skill do projeto prevalece** para decisões de domínio/arquitetura.

## Deploy

### Mobile (EAS)
- `npm run deploy:eas:android` / `npm run deploy:eas:ios`
- Config em `eas.json` — preview usa APK/simulator, production usa app-bundle

### Web (Railway)
- `railway.json` configurado com `npx serve dist -s`
- `npm run deploy:railway`

### Ops (Railway)
- **Comando obrigatório:** `railway up --service restaurante-ops --path-as-root ./restaurante-ops`
- Variáveis: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OBS_SUPABASE_URL`, `OBS_SUPABASE_SERVICE_ROLE_KEY`, `OBS_DUAL_WRITE`, `OPS_LOG_API_KEY`, `OPS_ENV=production`, `OPS_PUBLIC_BASE_URL`, etc.

## Ambiente

- **Não há staging dedicado** — validações e deploys vão direto em produção.
- Para mudanças sensíveis: validar endpoint público → smoke controlado → registrar evidências no mesmo ciclo.

## Aprendizados Operacionais (Mar/2026)

- `CozinhaScreen` e `MontagemScreen`: usar `useMemo` para derivados pesados.
- `useComandaManagement`: paralelizar queries com `Promise.all`.
- `NovoPedidoScreen`: chips de categoria com offset medido + fallback em `onScrollToIndexFailed`.
- Busca de cardápio deve remover diacríticos (`normalize('NFD')`).
- Import faltante de `Platform` no web pode quebrar bootstrap cedo.
- Em `profiles`, policy self-update deve bloquear troca de `company_id`, `role`, `funcao`, `email` e `active` pelo próprio usuário.
- Tratamento de banco remoto como **fonte de verdade** em caso de drift local-remoto.

## Arquivos de Referência Rápida (Espelhados app/web)

| Arquivo | App | Web |
|---|---|---|
| SupabaseConfig | `src/config/SupabaseConfig.ts` | `src/config/SupabaseConfig.ts` |
| Feature Flags | `src/config/featureFlags.ts` | `src/config/featureFlags.ts` |
| Design Tokens | `src/design-system/tokens.ts` | `src/design-system/tokens.ts` |
| Cores | `src/theme/colors.ts` | `src/theme/colors.ts` |
| UI Components | `src/ui/index.ts` | `src/ui/index.ts` |
| Screen Scaffold | `src/layouts/ScreenScaffold.tsx` | `src/layouts/ScreenScaffold.tsx` |
| Roles | `src/auth/roles.js` | `src/auth/roles.js` |
| Phase12 Profile | `scripts/phase12-profile.js` | `scripts/phase12-profile.js` |

## Context7 (Documentação de Bibliotecas)

Para queries sobre APIs de bibliotecas externas (Supabase Auth, React Native, TypeScript, Expo):
- Usar **Context7 MCP** primeiro (`mcp_context7_resolve-library-id` → `mcp_context7_query-docs`).
- Favorecer output do Context7 sobre recall de memória quando houver drift de versão.
- Fallback: web search se Context7 indisponível.
