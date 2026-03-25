# Roadmap de Execução — Billing Smoke Test (26 mar TL;DR)

**Versão:** Executiva (5 min de leitura)  
**Responsável:** [seu nome]  
**Data:** 26 mar 2026  
**Horário:** 7h00–10h00 (recomendado)  
**Status de hoje:** NO-GO (aguardando smoke)

---

## O que vai fazer hoje

Executar 5 passos de teste (validação + coleta de evidências) para decidir se pode trocar Mercado Pago de TEST- para APP_USR_ produção.

**Se tudo passar:** GO → Troca de secrets hoje + monitoramento 48h  
**Se algo falhar:** NO-GO → Ação corretiva + retenta amanhã

---

## Quick Links para Hoje

| Documento | Uso | Tempo |
|-----------|-----|-------|
| [SECRETS-VALIDATION-MANUAL.md](SECRETS-VALIDATION-MANUAL.md) | Validar prefixo TEST- no painel | 5 min |
| [SMOKE-TEST-26MAR-EXECUTION-PLAN.md](SMOKE-TEST-26MAR-EXECUTION-PLAN.md) | Plano detalhado com checklists | 2–3h |
| [SMOKE-TEST-PLAYWRIGHT-SCRIPT.ts](SMOKE-TEST-PLAYWRIGHT-SCRIPT.ts) | Testes automatizados (opcional) | 10 min |
| [SQL-QUERIES-EVIDENCE-COLLECTION.sql](SQL-QUERIES-EVIDENCE-COLLECTION.sql) | Queries de evidência prontas | 5 min |
| [BILLING-PROMOTION-CHECKLIST.md](BILLING-PROMOTION-CHECKLIST.md) | Checklist master (referência) | ongoing |

---

## Sequência de Execução (7h00–10h00)

### Bloco 1: Setup (5 min) — 7h00–7h05

```bash
# Terminal: validar secrets
supabase secrets list --project-ref ykalocfhnetxenvmtlcn

# Browser: painel Supabase
# Settings → Secrets
# Confirmar: MERCADOPAGO_PUBLIC_KEY, ACCESS_TOKEN com prefixo TEST-
```

**Checklist:**
- [ ] Secrets listados via CLI
- [ ] Painel acessível (authenticated)
- [ ] 4 secrets Mercado Pago presentes

### Bloco 2: Validação SQL Pré-requisitos (5 min) — 7h05–7h10

**Supabase Dashboard → SQL Editor**

```sql
-- Colar e executar:
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'reconcile_billing_event_atomic'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
```

**Esperado:** Função sem `mp_payment_id` em details JSONB

**Checklist:**
- [ ] Função retornou (não erro)
- [ ] Sem mp_payment_id em details

### Bloco 3: Smoke Funcional (1h 40 min) — 7h10–8h50

**Opção A: Manual (recomendado para validação real)**  
Abrir `https://restaurante-web.app.br/` e executar S1-S5:

Observacao: `ops.restaurante-web.app.br` e ambiente interno de operacao e nao representa o fluxo de pagamento do cliente final.

1. **S1 (10 min):** Tela assinatura abre sem erro 401/403
2. **S2 (15 min):** Gerar PIX → invoice criada
3. **S3 (15 min):** Cartão TEST persistido, sem vazamento
4. **S4 (20 min):** Webhook 2x, idempotência OK
5. **S5 (10 min):** License gate bloqueia sem assinatura

**Opção B: Script operacional versionado (recomendado para webhook)**  
```bash
pwsh ./database-backup/supabase/functions/scripts/billing-webhook-test.ps1
```

**Checklist S1–S5:**
- [ ] S1 PASS
- [ ] S2 PASS (PIX + invoice)
- [ ] S3 PASS (cartão, sem vazamento)
- [ ] S4 PASS (idempotência)
- [ ] S5 PASS (license gate)

### Bloco 4: Coleta de Evidências SQL (15 min) — 8h50–9h05

**Supabase Dashboard → SQL Editor — Executar queries de `SQL-QUERIES-EVIDENCE-COLLECTION.sql`:**

**E1: Invoices — transições coerentes**
```sql
SELECT status, COUNT(*) as count
FROM invoices
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY status;
```
**Esperado:** Apenas pending/paid/failed (sem states inválidos)

**E2: Webhook — backlog zero**
```sql
SELECT COUNT(*) as unprocessed_2h
FROM webhook_events
WHERE processed_at IS NULL
  AND created_at > NOW() - INTERVAL '2 hours';
```
**Esperado:** 0

**E3: Audit log — sem dados sensíveis**
```sql
SELECT COUNT(*) as sensitive_fields
FROM billing_audit_log
WHERE created_at > NOW() - INTERVAL '24 hours'
  AND (details ? 'mp_payment_id' OR details ? 'card_number');
```
**Esperado:** 0

**Checklist E1–E3:**
- [ ] E1 transições OK
- [ ] E2 backlog=0
- [ ] E3 auditoria limpa

### Bloco 5: Decisão GO/NO-GO (5 min) — 9h05–9h10

**Checklist Final:**

| ✓ Todos os itens PASS? |
|:---:|
| P1 Secrets TEST- ✓ |
| P2 Função sem mp_payment_id ✓ |
| S1 Tela auth OK ✓ |
| S2 PIX + invoice ✓ |
| S3 Cartão persistido ✓ |
| S4 Webhook idempotente ✓ |
| S5 License gate ✓ |
| E1 Invoices coerentes ✓ |
| E2 Backlog zero ✓ |
| E3 Audit limpo ✓ |

**Se todos = ✓:**

```
DECISÃO: GO ✓
Data/Hora: [preenchido]
Responsável: [seu nome]

Próximo: Fase 4 (Troca de secrets APP_USR_)
```

**Se qualquer um = ✗:**

```
DECISÃO: NO-GO ✗
Bloqueador: [qual falhou?]
Ação corretiva: [o quê fazer?]
Próxima tentativa: [quando?]
```

---

## Se GO — Próximas ações (mesma manhã) — 9h10–9h30

**EM JANELA CONTROLADA:**

```bash
# Troca de secrets (irreversível para cobrança)
supabase secrets set \
  MERCADOPAGO_PUBLIC_KEY="APP_USR_<production_public_key>" \
  MERCADOPAGO_ACCESS_TOKEN="APP_USR_<production_access_token>" \
  MERCADOPAGO_WEBHOOK_SECRET="<production_webhook_secret>" \
  MERCADOPAGO_NOTIFICATION_URL="https://ykalocfhnetxenvmtlcn.supabase.co/functions/v1/billing-webhook" \
  --project-ref ykalocfhnetxenvmtlcn

# Aguardar 30 sec replicação

# Validar saúde
curl https://ykalocfhnetxenvmtlcn.supabase.co/functions/v1/billing-provider-status

# Smoke curto (1º pagamento real)
# Registrar horário de ativação

# Monitoramento 48h (Fase 5)
```

**Checklist Fase 4:**
- [ ] Secrets trocados com sucesso
- [ ] Painel confirma APP_USR_ (no secrets)
- [ ] billing-provider-status retorna ok:true
- [ ] 1º pagamento testado com cartão real
- [ ] Monitoramento Fase 5 iniciado (M1–M3 a cada 2–4h)

---

## Se NO-GO — Ação Corretiva

**Template:**

```
Quem falhou? [qual item de P1-E3]
Por quê? [erro observado]
Como corrige? [ação necessária]
Quem faz? [responsável]
Tempo estimado? [ETA]
Próxima tentativa? [data/hora]

Bloqueador documentado em: [issue/ticket/section]
Status: ABERTO (aguardando ação)
```

---

## Documentos de Referência (Se precisar)

- **Plano detalhado:** [SMOKE-TEST-26MAR-EXECUTION-PLAN.md](SMOKE-TEST-26MAR-EXECUTION-PLAN.md)
- **Secrets checklist:** [SECRETS-VALIDATION-MANUAL.md](SECRETS-VALIDATION-MANUAL.md)
- **SQL queries:** [SQL-QUERIES-EVIDENCE-COLLECTION.sql](SQL-QUERIES-EVIDENCE-COLLECTION.sql)
- **Script Playwright:** [SMOKE-TEST-PLAYWRIGHT-SCRIPT.ts](SMOKE-TEST-PLAYWRIGHT-SCRIPT.ts)
- **Checklist master:** [BILLING-PROMOTION-CHECKLIST.md](BILLING-PROMOTION-CHECKLIST.md)
- **Rollback rápido:** [BILLING-PROMOTION-CHECKLIST.md#rollback-rapido](BILLING-PROMOTION-CHECKLIST.md)

---

## Contatos & Escalação

| Função | Nome | Telefone | Chat |
|--------|------|----------|------|
| Responsável de plantão | [seu nome] | [seu tel] | [slack] |
| DevOps/SRE escalation | [eng name] | [tel] | [slack] |
| Mercado Pago support | [contact] | [tel] | [email] |
| RCA/Post-mortem | [eng name] | [tel] | [slack] |

---

## Recap: Mitigações Implementadas (já feitas)

✅ **Fase 1 — Compliance:**
- Function `reconcile_billing_event_atomic` sem `mp_payment_id` em audit (migration 20260324210000)
- Sanitização de detalhes sensíveis (token, card_brand, last_four)
- Multi-tenant isolamento respeitado
- Rate limiting ativado em restaurante-ops
- CORS hardened em Edge Functions
- E2E secrets hardened

✅ **Fase 2 — Smoke (hoje):**
- Manual validation script (Playwright)
- SQL query templates
- Secrets validation checklist
- Rollback procedure documentado

---

## Notas Finais

- **Sem staging:** Produção é o único ambiente. Validação é crítica.
- **TEST- → APP_USR_:** Troca é **irreversível para o ciclo de billing**; rollback requer manual fix.
- **Monitoramento 48h:** Obrigatório (Fase 5). Primeiras 4h são críticas.
- **Responsável de plantão:** Mantém contexto desta spreadsheet durante execução.

---

**Print este doc ou mantenha acessível durante execução (26 mar, 7h00–10h00)**

Sucesso! 🚀
