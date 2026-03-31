# Staging Mínimo — Plano Informal para Supabase & Billing (Mar 2026)

**Status de Ambiente Atual**: Não existe staging dedicado no restaurante-supabase. Todas as validações e deploys acontecem em produção.

**Objetivo deste plano**: Criar um **staging mínimo** sem overhead de infraestrutura — apenas branch Supabase + feature flags locais para testes controlados antes de ativar billing em produção.

---

## 🎯 Princípios

1. **Zero nova infraestrutura** — reutilizar Supabase Branch (grátis) ou DB clone local
2. **Isolado por feature flag** — não tocar DB de produção
3. **Rápido de setup/teardown** — minutos, não horas
4. **Focado em billing** — outros fluxos (Balcao, Mesa) validam em produção com rollout gradual
5. **Documentação informal** — este arquivo é o source-of-truth

---

## 📋 Componentes do Staging Mínimo

### 1. **Supabase Branch para Testes de Billing**

#### Setup
```bash
# Login no Supabase CLI localizado em Scoop
C:\Users\ECUNHA\scoop\shims\supabase.exe --version

# Criar branch a partir de produção (cópia de schema + primeiros dados)
supabase branches create --name staging-billing --from production

# Aplicar migrations de billing localmente (ou via Supabase CLI)
cd database-backup/supabase
supabase db pull --branch staging-billing

# Resultado: dados de teste isolados, schema atualizado
```

#### Dados Mínimos
- 1-2 restaurantes (companies) com `billing_enabled = false`
- 2-3 usuários (garcom, gerente, admin) com profiles válidas
- 0 assinaturas ativas (começar do zero)
- 1-2 pedidos históricos (para testar reconciliação)

#### Teardown
```bash
# Remover branch quando testes terminarem
supabase branches delete --name staging-billing

# Ou deixar permanente por 7 dias e reconhecer custo mínimo ($0.01/dia)
```

### 2. **Feature Flags Locais (APP + WEB)**

#### Staging-Specific Flags
Criar `.env.staging` (gitignored) em `restaurante-app/` e `restaurante-web/`:

```bash
# .env.staging (gitignored; template em .env.staging.example)

# Supabase staging branch
EXPO_PUBLIC_SUPABASE_URL=https://staging-billing.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<staging-branch-anon-key>

# Billing staging flags
EXPO_PUBLIC_FEATURE_BILLING=true
EXPO_PUBLIC_FEATURE_BILLING_FORCE_BLOCK=true  # QA only — simula bloqueio local
EXPO_PUBLIC_BILLING_GRACE_PERIOD_DAYS=3       # Teste rápido

# rate limiting em staging (relaxado vs prod)
EXPO_PUBLIC_RATE_LIMIT_THRESHOLD=1000
EXPO_PUBLIC_RATE_LIMIT_WINDOW=3600

# Sentry em modo staging (ou desligado)
EXPO_PUBLIC_SENTRY_DSN=<staging-or-empty>
EXPO_PUBLIC_SENTRY_ENVIRONMENT=staging
```

#### Load App/Web com Staging
```bash
# Restaurante App
cd restaurante-app
cp .env.staging.example .env.staging
# Edit .env.staging com valores de staging-billing branch
eas build --profile staging-app  # ou local: npm start

# Restaurante Web
cd restaurante-web
cp .env.staging.example .env.staging
# Edit .env.staging
npm run start:staging  # ou custom npm script
```

### 3. **Teste Mínimo de Billing (Fluxo)**

#### Checklist Pré-Staging
- [ ] `check-license-gate-coverage.sh` passou (LicenseGate envolve telas críticas)
- [ ] `check-migration-sync.sh` passou (DB schema em sync)
- [ ] Staging branch Supabase criado
- [ ] `.env.staging` populado

#### Teste E2E Billing (Manual + Maestro/Playwright)

**Cenário 1: Subscribed User (Happy Path)**
```
1. Login com gerente (já tem subscription em staging)
2. Navega para NovoPedidoScreen
3. LicenseGate deixa passar ✓ (billing_enabled=true, subscription válida)
4. Cria pedido, sucesso
```

**Cenário 2: Unsubscribed User (Grace Period)**
```
1. Login com usuário em grace period (3 dias)
2. Navega para NovoPedidoScreen
3. LicenseGate mostra aviso "Subscription expires in 2 days"
4. Usuário consegue continuar operando ✓
```

**Cenário 3: Blocked User (No Subscription)**
```
1. Login com usuário sem subscription (fora grace period)
2. Navega para NovoPedidoScreen
3. LicenseGate bloqueia ✗ → redireciona para UpgradeScreen
4. Mock upgrade (não processa pagamento em staging)
5. Após upgrade (local mock), volta ao fluxo ✓
```

#### Teste Maestro (Staging)
```bash
cd restaurante-app

# Criar .maestro/.env.maestro.staging (gitignored)
PLAYWRIGHT_TEST_EMAIL=<staging-user-email>
PLAYWRIGHT_TEST_PASSWORD=<staging-user-password>
SUPABASE_BRANCH_URL=https://staging-billing.supabase.co

# Rodar flow balcao com staging env
maestro test .maestro/balcao.yaml --udid emulator-5554 \
  --env-file .maestro/.env.maestro.staging
```

#### Teste Playwright (Staging Web)
```bash
cd restaurante-web

# .env.staging já carregado
PLAYWRIGHT_TEST_EMAIL=<staging-user-email>
PLAYWRIGHT_TEST_PASSWORD=<staging-user-password>

npx playwright test e2e/billing-gate.spec.ts --workers=1
# (criar spec adicional focused apenas em billing)
```

### 4. **Reconciliação de Cobrança em Staging**

#### Simulação de Webhook (Activepieces Mock)
```bash
# Staging-billing branch: webhook receiver aponta para staging restaurante-ops
# Em restaurante-ops/src, adicionar toggle @staging para logs verbosos

# Mock webhook payment:
curl -X POST https://staging-ops.restaurante-web.app.br/webhooks/payment \
  -H "Content-Type: application/json" \
  -d '{
    "event": "payment.confirmed",
    "company_id": "staging-company-123",
    "subscription_id": "sub_staging_456",
    "amount": 10000,
    "idempotency_key": "test-123-unique"
  }'

# Verificar em Supabase staging:
# SELECT * FROM public.invoices WHERE company_id = 'staging-company-123'
# → deve estar em status='paid'
```

#### Validar Reconciliação Atomic
```bash
# Supabase staging branch: chamar stored procedure
SELECT public.reconcile_billing_event_atomic(
  p_company_id := 'staging-company-123',
  p_event_type := 'payment.confirmed',
  p_event_id := 'test-123-unique',
  ...
);

-- Resultado deve ser: 1 invoice + 1 audit log criados (ou atualizados)
```

---

## 🔄 Fluxo de Staging para Billing Production Launch

### Pré-Produção (Quando pronto para Go-Live)

```
Week 1: Setup Staging
├─ Criar Supabase branch staging-billing
├─ Rodar check-license-gate-coverage.sh (pré-requisito)
├─ Alterar app/web para env staging
└─ Teste manual dos 3 cenários acima

Week 2: Validação E2E
├─ Maestro balcao.yaml @staging (sim deve passar)
├─ Playwright billing-gate.spec.ts (novos testes)
├─ Rate limit stress test (100+ requests, esperar 429)
└─ Sentry error tracing (zero errors esperados)

Week 3: Reconciliação Mock
├─ Simular 10+ webhooks de cobrança
├─ Verificar invoices em status correto (paid/failed)
├─ Rodar reconcile_billing_event_atomic; validar idempotência
└─ Cleanup staging branch

Week 4: Production Gradual Rollout
├─ Set EXPO_PUBLIC_FEATURE_BILLING=true @5% users
├─ Monitor 24h (Sentry, rate limit, invoice count)
├─ Ramp @25%, @50%, @100% com gates entre cada step
└─ Remover FORCE_BLOCK flag quando 100%
```

### Pós-Produção (Suporte)

```bash
# Se regressão detectada em produção:
1. Set EXPO_PUBLIC_FEATURE_BILLING=false (instant rollback)
2. Investigar em staging branch clone (se drift suspeito)
3. Hotfix em staging, validar, então merge to prod
4. Ramp novamente @5%

# Remover staging-billing branch após 1 mês em produção estável
supabase branches delete --name staging-billing
```

---

## 📊 Custo Estimado (Supabase Branch)

| Componente | Custo | Duração |
|-----------|-------|---------|
| Supabase Branch (staging-billing) | $0.01/dia | 7-30 dias |
| Teste Maestro (local emulator) | $0 | 1-2 dias |
| Teste Playwright (GitHub Actions) | $0 (OSS) ou $0.006/min | 1-2 dias |
| Mock Webhooks + operações SQL | $0 | ad-hoc |
| **Total** | ~$0.15 | 3-4 weeks |

---

## 📝 Checklist: Staging-Ready para Billing

Antes de ativar `EXPO_PUBLIC_FEATURE_BILLING=true` em produção:

- [ ] Supabase staging-billing branch existe e sincronizado
- [ ] `.env.staging` em app/web com staging URLs
- [ ] `check-license-gate-coverage.sh` passou (100% cobertura)
- [ ] Teste E2E dos 3 cenários (subscribed, grace, blocked) passou
- [ ] Maestro balcao.yaml @staging passou
- [ ] Playwright billing-gate.spec.ts @staging passou
- [ ] Webhook mock reconciliação testado (10+ eventos)
- [ ] `reconcile_billing_event_atomic` testado para idempotência
- [ ] Rate limit validation em staging restaurante-ops (429 após threshold)
- [ ] Sentry em staging zerado (ou whitelisted false positives)
- [ ] Rollback plan documentado (set BILLING=false)
- [ ] Gradual rollout schedule: 5% → 25% → 50% → 100% (1 semana min)

---

## 🚀 Quick Start: Setup em 15 min

```bash
# 1. Criar Supabase branch (5 min)
supabase branches create --name staging-billing --from production

# 2. Configurar .env.staging em app/web (5 min)
cp .env.staging.example .env.staging
# Edit manually: SUPABASE_URL + ANON_KEY de staging-billing

# 3. Rodar validação (5 min)
bash scripts/check-license-gate-coverage.sh
bash scripts/check-rn-api-divergence.sh
cd database-backup && ./check-migration-sync.sh

# Done! Pronto para teste manual ou E2E
```

---

## 📌 Notas Operacionais

1. **Supabase CLI path**: `C:\Users\ECUNHA\scoop\shims\supabase.exe`
2. **Branch grátis**: até 7 dias ou manual delete sooner
3. **RLS em staging**: mesmas policies que produção (testar com precisão)
4. **Dados sensíveis**: NÃO copiar dados reais de clientes; usar mock users
5. **Logs**: restaurante-ops logs em staging isolados (não poluir sentry prod)

---

## 👥 Atribuições

| Papel | Responsabilidade |
|------|-----------------|
| Developer (você) | Setup staging, testes E2E, validação locais |
| QA (se houver) | Cenários completos, stress test |
| Ops | Monitor gradual rollout em produção, alertas |
| Product | Approva Wave progression (5% → 25% → ...) |

---

## 🗂️ Referências

- [SKILL.md — Billing / Licensing (Phase 6)](#skill-md-fase-6--billing--licensing-rollout-independente)
- [docs/saas-billing/](../../docs/saas-billing/) — artefatos de cobrança
- [database-backup/migrations/](../../database-backup/migrations/) — schema billing
- [restaurante-ops/src/modules/billing-operations.ts](../../restaurante-ops/src/modules/billing-operations.ts) — reconciliação
- [scripts/check-license-gate-coverage.sh](../../scripts/check-license-gate-coverage.sh) — validação pré-requisito

---

**Last Updated**: Mar 30, 2026  
**Next Review**: Após primeira ativação de FEATURE_BILLING em produção
