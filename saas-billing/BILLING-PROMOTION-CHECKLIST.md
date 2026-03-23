# Billing — Checklist de Promoção Segura (Staging → Produção)

> Smoke test local concluído em 23/03/2026.  
> Bugs corrigidos nesta sessão: `billing-create-checkout` 401 (token explícito), CORS `tokenizeCardWithMp` (public_key query param).  
> Metro cache note: o dev server precisa de `--reset-cache` para refletir as alterações em BillingService.ts.

---

## FASE 1 — Pré-requisitos (local / now)

- [x] `EXPO_PUBLIC_FEATURE_BILLING=true` adicionado em `.env` e `.env.staging` (app + web)
- [x] `EXPO_PUBLIC_FEATURE_BILLING_LICENSE_GATE=true` nos 4 arquivos .env
- [x] `EXPO_PUBLIC_FEATURE_BILLING_SCREEN=true` nos 4 arquivos .env
- [x] `BillingService.ts` (app + web): `invokeBillingFunction` helper com Authorization header explícito
- [x] `tokenizeCardWithMp` usa `?public_key=` em vez de `Authorization: Bearer` (CORS fix)
- [ ] Limpar cards duplicados em `payment_methods` (5 entradas para a mesma empresa; manter apenas o VISA ••••5682 cadastrado no smoke test + 1 MASTER de referência)

---

## FASE 2 — Staging (deploy de teste)

### 2.1 Edge Functions — garantir deploy atual

```bash
# Subir todas as edge functions de billing para o projeto Supabase
supabase functions deploy billing-create-checkout --project-ref ykalocfhnetxenvmtlcn
supabase functions deploy billing-create-pix-fallback --project-ref ykalocfhnetxenvmtlcn
supabase functions deploy billing-provider-status --project-ref ykalocfhnetxenvmtlcn
```

Verificar que o código deployado inclui:
- [x] `requireSecureAdmin` lendo o header `Authorization` corretamente
- [x] Mode A retorna `publicKey` (sem cardToken no body)
- [x] Mode B valida formato do cardToken com regex antes de chamar a vault

### 2.2 Secrets — Mercado Pago (STAGING)

> ⚠️ Os secrets abaixo devem ser chaves SANDBOX (prefixo `TEST-`).
> Não usar chaves de produção em staging.

```bash
# Verificar secrets configurados
supabase secrets list --project-ref ykalocfhnetxenvmtlcn

# Se não estiverem configurados:
supabase secrets set \
  MERCADOPAGO_PUBLIC_KEY="TEST-xxxxxxxx..." \
  MERCADOPAGO_ACCESS_TOKEN="TEST-xxxxxxxx..." \
  MERCADOPAGO_WEBHOOK_SECRET="<webhook_secret_staging>" \
  MERCADOPAGO_NOTIFICATION_URL="https://ykalocfhnetxenvmtlcn.supabase.co/functions/v1/billing-webhook" \
  --project-ref ykalocfhnetxenvmtlcn
```

Validar via `billing-provider-status`:
```json
{ "public_key": "OK", "access_token": "OK", "webhook": "OK", "saved_method": "Sim" }
```

### 2.3 Build de Staging

```bash
# Web (Railway)
cd restaurante-web
npx expo export -p web --clear
# Confirmar que o bundle gerado tem:
#   public_key= na URL de card_tokens (não Authorization header)
#   EXPO_PUBLIC_FEATURE_BILLING=true compilado no bundle

# Deploy Railway staging
railway up --service restaurante-web --environment staging
```

### 2.4 Testes manuais em Staging

| Fluxo | Esperado | Status |
|-------|----------|--------|
| Login > Admin > Assinatura SaaS | Modal abre, status trial, R$149 | ☐ |
| Solicitar Pix | QR gerado, edge function retorna 200, invoice criada | ☐ |
| Copiar código Pix | Código copiado para clipboard | ☐ |
| Cadastrar cartão (Visa TEST) | Tokenização MP 201, billing-create-checkout 201, card aparece na lista | ☐ |
| Reload da página | Sessão restaurada sem 401, UI carrega normalmente | ☐ |
| LicenseGate (billing_licenseGate=true) | Telas críticas bloqueadas sem assinatura ativa | ☐ |
| Webhook MP | Simular evento payment.created via CLI do MP ou curl | ☐ |

### 2.5 Validação de banco

```sql
-- Confirmar que a empresa de teste tem assinatura
SELECT id, company_id, status, mp_customer_id, trial_ends_at
FROM subscriptions
WHERE company_id = '<test_company_id>';

-- Confirmar payment_methods sem duplicatas
SELECT brand, last_four, expiry_month, expiry_year, is_default, created_at
FROM payment_methods
WHERE company_id = '<test_company_id>'
ORDER BY created_at DESC;

-- Confirmar invoices geradas corretamente
SELECT id, status, amount, payment_method_type, pix_expires_at
FROM invoices
WHERE company_id = '<test_company_id>'
ORDER BY created_at DESC LIMIT 5;
```

---

## FASE 3 — Produção

### 3.1 Secrets — Mercado Pago (PRODUÇÃO)

> ⚠️ AÇÃO IRREVERSÍVEL — revisar antes de executar.
> Usar chaves de PRODUÇÃO (prefixo `APP_USR_`).

```bash
supabase secrets set \
  MERCADOPAGO_PUBLIC_KEY="APP_USR_<public_key_prod>" \
  MERCADOPAGO_ACCESS_TOKEN="APP_USR_<access_token_prod>" \
  MERCADOPAGO_WEBHOOK_SECRET="<webhook_secret_prod>" \
  MERCADOPAGO_NOTIFICATION_URL="https://app.seudominio.com.br/api/webhook/billing" \
  --project-ref ykalocfhnetxenvmtlcn
```

Após configurar, validar `billing-provider-status` em produção antes de ativar as flags.

### 3.2 Feature Flags — Ativação gradual

**Canary wave 1 (10% empresas)**
- Ativar apenas `billing_enabled=true` + `billing_showBillingScreen=true`
- LicenseGate permanece `false`
- Monitorar por 48h: erros de 401/403/422 nas Edge Functions, abandono do modal

**Canary wave 2 (50% empresas)**
- Manter flags iguais, aumentar audiência
- Verificar que webhook do MP está processando corretamente

**Wave 3 — Full rollout**
- Ativar `billing_licenseGate=true`
- Bloqueio operacional entra em vigência para empresas inadimplentes após fim do trial
- Comunicar com 7 dias de antecedência (e-mail/WhatsApp)

### 3.3 Build de Produção (Railway)

```bash
# Reiniciar Metro com cache limpo antes do build final
cd restaurante-web
npx expo start --web --reset-cache  # testar local
# Confirmar que BillingService.ts com public_key fix está no bundle

# Export + deploy
npx expo export -p web --clear
railway up --service restaurante-web --environment production
```

### 3.4 Variables de ambiente (Railway — produção)

Confirmar que as variáveis abaixo estão configuradas no serviço Railway de produção (não em arquivo — nunca commitar chaves de produção):

```
EXPO_PUBLIC_FEATURE_BILLING=true
EXPO_PUBLIC_FEATURE_BILLING_LICENSE_GATE=false  ← começa false, ativar na wave 3
EXPO_PUBLIC_FEATURE_BILLING_SCREEN=true
EXPO_PUBLIC_SUPABASE_URL=https://ykalocfhnetxenvmtlcn.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon_key_prod>
```

> As chaves Mercado Pago ficam APENAS nos secrets do Supabase Edge Functions, nunca no Railway.

---

## FASE 4 — Pós-deploy (Monitoramento)

### 4.1 Alertas obrigatórios

```sql
-- Invoices com status 'failed' na última hora
SELECT COUNT(*) FROM invoices
WHERE status = 'failed' AND created_at > NOW() - INTERVAL '1 hour';

-- Checkout events sem card_saved
SELECT * FROM billing_audit_log
WHERE event_type = 'billing.checkout.card_save_requested'
AND created_at > NOW() - INTERVAL '24 hours';

-- Webhook events não processados
SELECT COUNT(*) FROM webhook_events
WHERE status != 'processed' AND created_at > NOW() - INTERVAL '2 hours';
```

### 4.2 KPIs a acompanhar nas primeiras 48h

- Taxa de conversão trial → cartão cadastrado
- Erros 4xx/5xx nas Edge Functions de billing (< 1% aceitável)
- Tempo médio de tokenização MP (< 3s aceitável)
- Pix gerados vs. Pix aprovados pelo webhook

### 4.3 Revisão de duplicatas em payment_methods

```sql
-- Detectar empresas com mais de 1 cartão (avaliar limpeza)
SELECT company_id, COUNT(*) as cards
FROM payment_methods
GROUP BY company_id
HAVING COUNT(*) > 3;
```

---

## ROLLBACK

Se houver regressão crítica em produção:

```bash
# 1. Desativar billing via Railway environment variables (sem redeploy)
EXPO_PUBLIC_FEATURE_BILLING=false
EXPO_PUBLIC_FEATURE_BILLING_LICENSE_GATE=false
EXPO_PUBLIC_FEATURE_BILLING_SCREEN=false
# Rebuild Railway triggers com as novas vars

# 2. Edge Functions: reverter última versão
supabase functions deploy billing-create-checkout --project-ref ykalocfhnetxenvmtlcn
# <aponta para commit anterior>
```

O LicenseGate com `billing_licenseGate=false` garante que nenhuma empresa seja bloqueada operacionalmente durante rollback.

---

## Resumo dos bugs corrigidos nesta sessão

| Bug | Arquivo(s) | Causa | Fix |
|-----|-----------|-------|-----|
| `billing-create-checkout` 401 | `BillingService.ts` (app + web) | `functions.invoke()` não enviava Bearer token | `invokeBillingFunction()` lê sessão explicitamente |
| CORS em `card_tokens` | `BillingService.ts` (app + web) | Header `Authorization` bloqueado pelo CORS da MP | URL com `?public_key=<key>` sem header Authorization |

## Metro cache note (dev)

O Metro bundler em modo dev mantém cache persistente. Após as correções em `BillingService.ts`, reiniciar com:
```bash
npx expo start --web --reset-cache --port 19008
```
para garantir que o bundle servido inclua as correções.
