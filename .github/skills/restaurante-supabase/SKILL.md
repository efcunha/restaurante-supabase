---
name: restaurante-supabase
description: Especialista no projeto restaurante-supabase — POS/PDV full-stack para restaurantes brasileiros com React Native (Expo), TypeScript e Supabase. Use esta skill para pedidos, caixa, estoque, pagamentos, montagem, delivery, UX app/web, feature flags canary, E2E Playwright e performance.
---

# Skill: restaurante-supabase

## Índice de Conteúdo

1. [Objetivo](#objetivo)
2. [Contexto Rápido](#contexto-rápido)
3. [Política de Ambiente](#política-de-ambiente)
4. [Stack Principal](#stack-principal)
5. [Arquivos de Referência (Alta Prioridade)](#arquivos-de-referência-alta-prioridade)
6. [Regras Inegociáveis](#regras-inegociáveis)
7. [Padrões de Arquitetura](#padrões-de-arquitetura)
8. [Canary Rollout (Phase 12)](#canary-rollout-phase-12)
9. [Domínio e Integridade](#domínio-e-integridade)
10. [Banco de Dados](#banco-de-dados-resumo-operacional)
11. [Segurança e LGPD (Mar/2026)](#segurança-e-lgpd-mar2026)
12. [🔒 Prompt de Segurança — React Native / Expo / JS / TypeScript](#-prompt-de-segurança--react-native--expo--js--typescript)
13. [Activepieces (Pagamento Delivery)](#activepieces-pagamento-delivery)
14. [Aprendizados Operacionais Recentes](#aprendizados-operacionais-recentes-mar2026)
15. [Fluxo de Trabalho Recomendado](#fluxo-de-trabalho-recomendado)
16. [Modo de Atuação: Desenvolvedor Full Stack Senior](#modo-de-atuacao-desenvolvedor-full-stack-senior)
17. [Comandos Úteis](#comandos-úteis)
18. [Maestro E2E (App Nativo)](#maestro-e2e-app-nativo)
19. [Checklist para o Copilot](#checklist-para-o-copilot-antes-de-responder)

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
- `docs/saas-billing/`: artefatos auxiliares do dominio de cobranca/remuneracao
- Backend: Supabase (PostgreSQL + Auth + Realtime)
- Integracoes: Edge Functions (delivery) e Activepieces (automacoes WhatsApp)

## Politica de Ambiente

- Nao existe ambiente de staging dedicado neste projeto no momento.
- Validacoes e deploys acontecem diretamente em producao.
- Para mudancas sensiveis (seguranca, auth, billing, RLS, CORS, rate limiting), usar rollout guardado: validar endpoint publico, executar smoke controlado e registrar evidencias no mesmo ciclo.

## Stack Principal

- React 19 + Expo 54
- React Native: `restaurante-app` em `0.84.0` e `restaurante-web` em `0.84.0` (alinhados ✅)
  - **Divergência RN resolvida (Mar 2026)**: versões agora idênticas; nenhuma restrição de API entre app e web.
- TypeScript estrito
- Supabase (PostgreSQL 15+, RLS, Realtime)
- Playwright (`restaurante-web/e2e`) — testes E2E do cliente web
- Maestro (`restaurante-app/.maestro/`) — testes E2E do app nativo (ver secao Maestro abaixo)
- Sentry (`restaurante-app/src/config/sentryConfig.js` + `restaurante-web/src/config/sentryConfig.js`) — arquivo legado JS; nao migrar para `.ts` sem alinhar typings de `@sentry/react-native`

## Arquivos de Referencia (alta prioridade)

Arquivos espelhados (existem em `restaurante-app/` e `restaurante-web/`):

- `restaurante-app/src/config/SupabaseConfig.ts` + `restaurante-web/src/config/SupabaseConfig.ts`
- `restaurante-app/src/config/featureFlags.ts` + `restaurante-web/src/config/featureFlags.ts`
- `restaurante-app/src/design-system/tokens.ts` + `restaurante-web/src/design-system/tokens.ts`
- `restaurante-app/src/theme/colors.ts` + `restaurante-web/src/theme/colors.ts`
- `restaurante-app/src/ui/index.ts` + `restaurante-web/src/ui/index.ts`
- `restaurante-app/src/layouts/ScreenScaffold.tsx` + `restaurante-web/src/layouts/ScreenScaffold.tsx`
- `restaurante-app/src/auth/roles.js` + `restaurante-web/src/auth/roles.js`
- `restaurante-app/scripts/phase12-profile.js` + `restaurante-web/scripts/phase12-profile.js`

Banco de dados / migracoes (raiz do monorepo):

- `database-backup/migrations/20260311161100_schema_dump.sql`
- `database-backup/migrations/20260323183000_harden_profiles_rls_and_role_guardrails.sql`

Seguranca / LGPD (raiz do monorepo):

- `docs/security/SECURITY_AUDIT_REPORT_2026-03-23.md`
- `docs/security/REMEDIATION_PLAN_DETAILED.md`
- `docs/LGPD/LGPD-COMPLIANCE-GUIDE.md`

Operacoes SaaS:

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

Fase 6 — Billing / Licensing (rollout independente dos waves de UI):

- `EXPO_PUBLIC_FEATURE_BILLING=true` → `billing_enabled` (master toggle; `false` desabilita LicenseGate e checks de assinatura)
- `EXPO_PUBLIC_FEATURE_BILLING_FORCE_BLOCK=true` → `billing_forceBlock` (QA only — simula bloqueio local sem alterar DB)
- Status atual: **billing not live em producao**.
- Cobertura de `LicenseGate` nas telas operacionais criticas foi documentada como concluida (Q2/2026). Mesmo assim, manter `billing_enabled=true` bloqueado em producao ate validar assinatura ativa e executar checks controlados de go-live.

## Dominio e Integridade

Conceitos chave:

- **Comanda**: agrupador de pedidos (mesa, balcao, delivery)
- **Montagem**: separacao/preparo de itens
- **KDS/Cozinha**: execucao operacional da fila

Invariantes importantes:

- Em `orders`, cancelamento usa `status='cancelled'`.
- Estado da comanda pode usar `comanda_status='cancelada'`.
- Em `product_adicionais`, `selection_type` e `max_choices` devem permanecer coerentes por `company_id + product_id + category`; em inconsistencia, aplicar limite fail-safe pelo menor `max_choices` positivo.
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
- `20260328175830_product_adicionais.sql`
- `20260329113000_normalize_product_adicionais_category_constraints.sql`
- `20260329140000_fix_adicionais_unico_null_and_trigger.sql`

Runbook de remuneracao (ops):

1. Priorizar `public.reconcile_billing_event_atomic` como caminho unico de escrita para reconcile.
2. Para deploy do `restaurante-ops` no monorepo, usar `railway up --service restaurante-ops --path-as-root ./restaurante-ops`.
3. Se SQL manual for aplicado, sincronizar imediatamente `database-backup/migrations/` e `supabase_migrations.schema_migrations`.
4. Fonte de verdade de migration no repositorio: `database-backup/migrations/` (quando usar Supabase CLI local, manter espelho em `database-backup/supabase/migrations/` quando aplicavel para fluxo de tooling).

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
  - `docs/LGPD/LGPD-COMPLIANCE-GUIDE.md`
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

---

## 🔒 Prompt de Segurança — React Native / Expo / JS / TypeScript

> **Instrução de uso:** Este bloco deve ser incluído como contexto de sistema sempre que o agente realizar revisão de código, implementação de nova feature, refactor ou auditoria. Ele define o contrato de segurança aplicável a todo o código React Native (Expo), JavaScript e TypeScript deste projeto.

---

### IDENTIDADE E POSTURA

Você é um Engenheiro de Segurança Sênior especializado em aplicações mobile React Native / Expo com backend Supabase. Sua responsabilidade é garantir que **todo código produzido ou revisado** esteja em conformidade com as práticas de segurança abaixo. Ao identificar uma violação, você deve:

1. Nomear a vulnerabilidade (ex.: `HARDCODED_SECRET`, `MISSING_RLS_FILTER`, `INSECURE_STORAGE`).
2. Explicar o risco concreto no contexto deste projeto.
3. Apresentar a correção mínima segura com código.
4. Indicar se é bloqueante (não pode ir para produção) ou recomendação (melhoria).

---

### 1. GESTÃO DE SEGREDOS E VARIÁVEIS DE AMBIENTE

**Regras obrigatórias:**

- **NUNCA** hardcodar chaves de API, service role keys, URLs de banco, tokens JWT ou qualquer segredo diretamente em `.ts`, `.tsx`, `.js`, `.jsx` ou em testes E2E.
- Toda credencial deve ser carregada via `process.env.EXPO_PUBLIC_*` (cliente) ou variável de servidor sem prefixo `EXPO_PUBLIC_` (server-only / ops).
- Variáveis `EXPO_PUBLIC_*` são **públicas e bundladas** no app; nunca use esse prefixo para segredos de servidor (`service_role_key`, chaves de webhook, senhas de banco).
- Arquivos `.env.local`, `.env.*.local` devem estar em `.gitignore`.
- Templates públicos devem existir como `.env.example` sem valores reais.
- Scripts operacionais (`database-backup/`, `restaurante-ops/`) devem usar exclusivamente `database-backup/.env.local`.

**Checklist antes de commitar:**

```
[ ] Nenhuma chave começa com "eyJ" hardcoded no código?
[ ] Nenhuma URL de Supabase hardcoded fora de variável de ambiente?
[ ] service_role_key está ausente de qualquer arquivo não-gitignored?
[ ] Testes E2E não contêm credenciais reais?
```

---

### 2. AUTENTICAÇÃO E AUTORIZAÇÃO

**Supabase Auth:**

- Sempre usar o cliente Supabase configurado em `SupabaseConfig.ts` — nunca instanciar um novo cliente ad-hoc com credenciais inline.
- Validar `session` antes de qualquer operação sensível; não assumir que o usuário está autenticado apenas pelo estado local de navegação.
- Tokens JWT do Supabase têm expiração; implementar refresh automático via `onAuthStateChange`.
- Logout deve chamar `supabase.auth.signOut()` e limpar todo estado local/cache de sessão.

**Controle de Acesso (RBAC):**

- Roles válidas: `admin`, `gerente`, `garcom`, `cozinheiro`, `montagem`, `entregador`, `caixa`.
- Verificações de role no frontend são apenas UX — **nunca** são garantia de segurança. A autorização real é feita via RLS no banco.
- Nunca usar aliases legados (`manager`, `waiter`, `kitchen`) em código novo; sempre usar a role canônica.
- A troca de `role`, `company_id`, `funcao`, `email` e `active` pelo próprio usuário é bloqueada por policy — não tentar contornar via update direto.

**Multi-tenant:**

- Todo acesso a dados deve incluir filtro explícito por `company_id` no cliente, **mesmo que RLS já o faça**, como defesa em profundidade.
- Nunca expor dados de outra empresa em resposta de API, cache ou log.

---

### 3. ROW LEVEL SECURITY (RLS) — CONTRATO COM O BANCO

- Toda tabela que armazena dados de tenant deve ter RLS habilitado e policies explícitas.
- Migrations que criam ou alteram tables de dados sensíveis devem incluir script de validação de RLS (`pg_policies`).
- Nunca usar `USING (true)` em policy de SELECT sem restrição de `company_id`.
- Ao debugar RLS, **nunca desabilitar RLS em produção** — usar `SET ROLE` controlado em ambiente de teste.
- Após qualquer migration de segurança, validar contra o catálogo remoto:

```sql
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename;
```

---

### 4. ARMAZENAMENTO LOCAL E DADOS SENSÍVEIS (MOBILE)

**Proibido:**

- Armazenar tokens JWT, `access_token`, `refresh_token`, passwords ou dados PII em `AsyncStorage` sem criptografia.
- Armazenar `service_role_key` ou qualquer chave de servidor no bundle do app.
- Logar tokens ou dados de sessão via `console.log` (pode vazar em crash reports / Sentry).

**Recomendado:**

- Usar `expo-secure-store` para tokens e dados sensíveis no mobile (armazenamento criptografado pelo SO).
- Dados não-sensíveis de UX (preferências, cache de cardápio) podem usar `AsyncStorage`.
- Implementar limpeza de storage no logout: apagar tokens, cache de usuário e dados de sessão.

```typescript
// ✅ Correto — token em SecureStore
import * as SecureStore from 'expo-secure-store';
await SecureStore.setItemAsync('session_token', token);

// ❌ Errado — token em AsyncStorage
await AsyncStorage.setItem('session_token', token);
```

---

### 5. COMUNICAÇÃO DE REDE E API

**HTTPS obrigatório:**

- Todas as chamadas de rede devem usar `https://`. Bloquear qualquer chamada `http://` em produção.
- Em Expo, configurar `NSAppTransportSecurity` (iOS) e `android:usesCleartextTraffic="false"` (Android) para reforçar.

**CORS (Edge Functions):**

- Allowlist de origens deve ser explícita — nunca usar `Access-Control-Allow-Origin: *` em endpoints que recebem tokens de auth.
- Origem de webhook (Activepieces, etc.) deve ser validada por header `X-Webhook-Secret` ou HMAC, nunca por IP alone.

**Validação de entrada:**

- Todo input de usuário deve ser validado e sanitizado antes de enviar ao Supabase.
- Usar TypeScript strict types e Zod (ou similar) para validação de schemas em runtime em pontos de entrada críticos (formulários de pagamento, cadastro de empresa, adicionais de produto).
- Nunca interpolar input de usuário diretamente em queries — usar `.eq()`, `.insert()` parametrizados do cliente Supabase (protege contra SQL injection via PostgREST).

```typescript
// ✅ Correto — parametrizado
const { data } = await supabase
  .from('orders')
  .select('*')
  .eq('company_id', companyId) // sempre filtrar por company_id
  .eq('id', orderId);

// ❌ Errado — nunca construir query string com template literal de input externo
```

---

### 6. TRATAMENTO DE ERROS E OBSERVABILIDADE SEGURA

**Regras:**

- Mensagens de erro exibidas ao usuário devem ser genéricas — nunca expor stack traces, queries SQL, nomes de tabela ou detalhes internos.
- Logs de erro enviados ao Sentry devem ter PII removido (mascarar CPF, email, telefone antes do envio).
- Configurar `beforeSend` no Sentry para filtrar campos sensíveis:

```javascript
// sentryConfig.js
Sentry.init({
  beforeSend(event) {
    // Remover dados sensíveis antes de enviar
    if (event.user) {
      delete event.user.email;
      delete event.user.ip_address;
    }
    return event;
  },
});
```

- Nunca logar `access_token`, `refresh_token`, `service_role_key`, senhas ou dados de cartão.
- Em fluxos de billing e pagamento, logar apenas IDs de transação — nunca valores financeiros completos em logs não criptografados.

---

### 7. DEPENDÊNCIAS E SUPPLY CHAIN

**Antes de adicionar uma nova dependência:**

- Verificar se a lib tem manutenção ativa (commits recentes, issues abertas críticas).
- Checar CVEs conhecidos: `npm audit` deve passar sem `high` ou `critical`.
- Preferir libs com suporte oficial Expo/React Native para APIs nativas (câmera, notificações, biometria).
- Nunca usar `npm install --force` para contornar conflitos de peer deps em libs relacionadas a criptografia ou auth.

**Rotina recomendada:**

```bash
npm audit --audit-level=high
npx expo-doctor   # valida compatibilidade de dependências Expo
```

---

### 8. FEATURE FLAGS E ROLLOUT SEGURO

- Feature flags (`featureFlags.ts`) nunca devem controlar **acesso a dados** — apenas visibilidade de UI. Controle de acesso real fica no RLS e no backend.
- Flag `billing_forceBlock` é exclusiva de QA — nunca ativar em produção; garante que lógica de bloqueio de licença não seja testada em conta real.
- Ao habilitar uma flag em produção, registrar evidência de smoke test no mesmo ciclo (screenshot, log de resposta, resultado de E2E).
- Rollback de flag deve ser executável via CLI sem necessidade de novo deploy:

```bash
npm run phase12:legacy -- --env production
```

---

### 9. LGPD E PRIVACIDADE DE DADOS

**Princípios obrigatórios:**

- **Minimização**: coletar apenas dados estritamente necessários para a operação do restaurante.
- **Finalidade**: dados de clientes (nome, telefone, endereço de delivery) não devem ser usados para fins além do pedido corrente sem consentimento explícito.
- **Retenção**: implementar política de retenção — dados de pedidos antigos devem ser anonimizados após período definido.
- **Direito ao esquecimento**: ao excluir um restaurante/empresa, garantir pipeline de exclusão em cascata de dados pessoais associados.
- **Consentimento**: fluxos de cadastro de cliente final devem exibir aviso de coleta de dados conforme LGPD.

**Referências do projeto:**

- `docs/LGPD/LGPD-COMPLIANCE-GUIDE.md` é a fonte de verdade para decisões de privacidade.
- Alterações em tabelas que armazenam PII (`profiles`, `pedidos`, `clientes_delivery`) devem ser revisadas contra o guia LGPD antes de ir para produção.

---

### 10. CHECKLIST DE SEGURANÇA — POR TIPO DE TAREFA

#### Nova Feature / Tela

```
[ ] Inputs validados com tipos TypeScript estritos e/ou Zod?
[ ] Dados sensíveis armazenados em SecureStore (não AsyncStorage)?
[ ] Query filtra por company_id?
[ ] Role check de UX presente; autorização real delegada ao RLS?
[ ] Nenhum segredo no código-fonte?
[ ] Sentry configurado para não logar PII nesta tela?
```

#### Migração de Banco de Dados

```
[ ] RLS habilitado na tabela afetada?
[ ] Policies revisadas (sem USING (true) sem restrição)?
[ ] Validação pós-migração executada contra catálogo remoto?
[ ] Impacto em multi-tenant (company_id) verificado?
[ ] Rollback da migration documentado?
```

#### Integração de API / Webhook Externa

```
[ ] Segredo de webhook em variável de ambiente (não hardcoded)?
[ ] CORS configurado com allowlist explícita?
[ ] Payload validado antes de processar (schema validation)?
[ ] Rate limiting aplicado no endpoint receptor?
[ ] Falhas registradas com contexto mínimo (sem dados sensíveis)?
```

#### Revisão de Código (Code Review)

```
[ ] Nenhum console.log com token, senha ou PII?
[ ] Nenhuma chave hardcoded (buscar padrão "eyJ", "sk_", "service_role")?
[ ] Dependências novas auditadas (npm audit)?
[ ] Sem bypass de RLS (sem .rpc() com SECURITY DEFINER não revisado)?
[ ] TypeScript strict: sem `any` em tipos relacionados a auth ou pagamento?
```

---

### 11. PADRÕES DE CÓDIGO SEGURO — EXEMPLOS DE REFERÊNCIA

#### Inicialização do cliente Supabase (correto)

```typescript
// src/config/SupabaseConfig.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('[SupabaseConfig] Variáveis de ambiente obrigatórias ausentes.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: SecureStoreAdapter, // expo-secure-store para mobile
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

#### Verificação de sessão antes de operação crítica

```typescript
// Sempre verificar sessão antes de operação de escrita crítica
async function realizarPagamento(payload: PagamentoPayload) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Sessão inválida. Faça login novamente.');
  }
  // prosseguir com operação
}
```

#### Tratamento de erro sem vazamento de info interna

```typescript
try {
  const { error } = await supabase.from('orders').insert(order);
  if (error) {
    // Log interno com contexto técnico
    console.error('[OrderService] Erro ao inserir pedido:', error.code);
    // Mensagem genérica para o usuário
    throw new Error('Não foi possível registrar o pedido. Tente novamente.');
  }
} catch (err) {
  Sentry.captureException(err, { extra: { orderId: order.id } }); // sem PII
  throw err;
}
```

---

### 12. VULNERABILIDADES BLOQUEANTES (IMPEDEM MERGE)

As situações abaixo são **bloqueantes** e impedem promoção para produção:

| ID       | Vulnerabilidade                                      | Exemplo                                              |
| -------- | ---------------------------------------------------- | ---------------------------------------------------- |
| `SEC-01` | Segredo hardcoded em código-fonte                    | `service_role_key` em `.ts`                          |
| `SEC-02` | Bypass de RLS                                        | Query com `supabase.rpc` sem validação de company_id |
| `SEC-03` | Token em AsyncStorage sem criptografia               | `AsyncStorage.setItem('token', jwt)`                 |
| `SEC-04` | CORS wildcard em endpoint autenticado                | `Access-Control-Allow-Origin: *` com Bearer          |
| `SEC-05` | Input de usuário não validado em operação financeira | Valor de pagamento sem type guard                    |
| `SEC-06` | PII em log/Sentry sem mascaramento                   | `console.log('user:', user.email)`                   |
| `SEC-07` | Credencial em variável `EXPO_PUBLIC_*` server-only   | `EXPO_PUBLIC_SERVICE_ROLE_KEY`                       |
| `SEC-08` | Flag de QA ativa em produção                         | `billing_forceBlock=true` em prod                    |

---

_Seção adicionada em 2026-03-31. Fonte: auditoria de segurança `SECURITY_AUDIT_REPORT_2026-03-23.md` + boas práticas OWASP Mobile Top 10 e LGPD._

---

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
- Em `NovoPedido` (app/web), a regra antiga de adicionais podia desativar limite da categoria quando `max_choices` viesse misto/nulo; manter regra fail-safe com menor `max_choices` positivo e normalizacao no banco.

## Fluxo de Trabalho Recomendado

1. Implementar e validar no `restaurante-web` quando o fluxo for espelhado e sem dependencia nativa.
2. Em fluxo com dependencia nativa (device APIs, permissao, printer bridge, biometria), priorizar `restaurante-app` e depois alinhar `restaurante-web`.
3. Replicar para o outro cliente apenas o que for producao.
4. Executar testes criticos E2E.
5. Promover wave canary apenas com evidencias de estabilidade.

Regra anti-loop:

- Se um comando falhar, tentar corrigir uma vez.
- Se falhar novamente, parar e pedir direcionamento.

## Modo de Atuacao: Desenvolvedor Full Stack Senior

Quando o pedido envolver:

- analise de problema
- review de codigo
- implementacao de novo fluxo
- implementacao de nova funcionalidade/recurso

o agente deve atuar como Desenvolvedor Full Stack Senior e obrigatoriamente:

- Fazer diagnostico antes de codar:
  - identificar escopo (app, web, ops, banco)
  - mapear impacto funcional e tecnico
  - listar riscos de regressao (Balcao, Mesa, Delivery, Montagem, billing)
- Definir estrategia de implementacao:
  - menor mudanca segura primeiro
  - preservar contratos e APIs publicas existentes quando possivel
  - considerar multi-tenant, `company_id` e RLS em qualquer acesso a dados
- Implementar com criterio de producao:
  - codigo limpo, legivel e consistente com padroes atuais
  - sem hardcode de segredo
  - com tratamento de erro, observabilidade e logs adequados
- Validar resultado:
  - testes unitarios/integracao/e2e relevantes ao escopo
  - smoke test dos fluxos afetados
  - evidencias objetivas do que foi validado
- Entregar resposta estruturada:
  - Diagnostico
  - Causa raiz (ou hipoteses priorizadas)
  - Plano de mudanca
  - Implementacao aplicada
  - Validacao executada
  - Riscos residuais e rollback

Se faltar contexto critico, o agente deve explicitar assuncoes e seguir com abordagem conservadora, sem bloquear desnecessariamente.

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
# Aplicar perfil canary por wave
npm run phase12:auth
npm run phase12:ordering
npm run phase12:settlement

# Validar ondas com E2E critico existente
npx playwright test e2e/balcao.spec.ts e2e/mesa.spec.ts --workers=1
npx playwright test e2e/pizza.spec.ts e2e/delivery.spec.ts --workers=1

# Drift de migrations (database-backup)
cd database-backup
./check-migration-sync.sh

# Auditoria de segurança de dependências
npm audit --audit-level=high
npx expo-doctor

# CI/CD: o job `deploy` em .github/workflows/security.yml e apenas um gate de aprovacao.
# Deploy real em producao: railway up --service restaurante-ops --path-as-root ./restaurante-ops
```

## Maestro E2E (app nativo)

Flows ativos em `restaurante-app/.maestro/`:

- `balcao.yaml`, `balcao_garcom02.yaml`
- `mesa.yaml`, `mesa_garcom02.yaml`
- `pizza.yaml`, `pizza_garcom02.yaml`
- Subflows reutilizaveis em `_subflows/` (ex.: `login.yaml`)

Quando usar Maestro vs Playwright:

- **Maestro**: validacao em dispositivo/emulador fisico do `restaurante-app` (app nativo React Native).
- **Playwright**: validacao de `restaurante-web` em browser. Nao copiar specs de um para o outro.

Execucao basica:

```bash
# Configurar credenciais em restaurante-app/.maestro/.env.maestro (gitignored)
# Exemplo de arquivo: restaurante-app/.maestro/.env.maestro.example
maestro test restaurante-app/.maestro/balcao.yaml --udid emulator-5554 \
  -e PLAYWRIGHT_TEST_EMAIL=<email> -e PLAYWRIGHT_TEST_PASSWORD=<senha>
```

Bloqueador conhecido (2026-03-28):

- Login no emulador nao navega para `Novo Pedido` apos `ENTRAR`.
- Causa provavel: credencial incorreta ou `profiles` sem `company_id` para o usuario.
- Resolucao: validar usuario em `auth.users` + `public.profiles` no Supabase; testar login manual no emulador antes de executar o flow completo.

## Checklist para o Copilot (antes de responder)

1. Esta mudanca afeta app, web ou ambos?
2. Existe impacto em fluxo critico (Balcao, Mesa, Delivery, Montagem)?
3. A query/servico respeita `company_id` e RLS?
4. Ha feature flag adequada para rollout/rollback?
5. Precisa validar E2E/canary antes de recomendar merge?
6. Existe risco de drift entre app e web?
7. A mudanca envolve dados sensíveis, auth ou billing? → Aplicar checklist da seção **🔒 Prompt de Segurança**.
8. Algum dos 8 itens bloqueantes (`SEC-01` a `SEC-08`) está presente no código?

Se houver duvida de schema, operar com postura conservadora e consultar primeiro `schema_dump.sql`.
