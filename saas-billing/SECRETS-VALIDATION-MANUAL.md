# Validação Manual de Secrets — Checklist (26 mar)

**Objetivo:** Confirmar prefixo de credenciais Mercado Pago (TEST- vs APP_USR_) sem expor valores completos.

**Contexto:** O comando `supabase secrets list` retorna apenas digests de hash (não valores), então confirmação do prefixo deve ser feita manualmente no painel Supabase ou Secret Manager.

---

## Procedimento (5 min)

### Passo 1: Abrir Secret Manager no painel Supabase

1. Ir para: https://app.supabase.com
2. Selecionar projeto: `ykalocfhnetxenvmtlcn`
3. Ir para: **Settings** → **Secrets**

### Passo 2: Validar MERCADOPAGO_PUBLIC_KEY

1. Localize o secret chamado `MERCADOPAGO_PUBLIC_KEY`
2. Clique no ícone **👁 (Reveal)** ou **Mostrar**
3. Confirmar que o valor começa com:
   - **TEST-** (correto para hoje)
   - **APP_USR_** (apenas após decisão GO e execução de troca)

**Checklist:**

```
[ ] Secret encontrado
[ ] Valor visível (não truncado)
[ ] Prefixo confirmado: [ ] TEST- [ ] APP_USR_
[ ] Data/Hora: __________
[ ] Confirmador: __________
```

### Passo 3: Validar MERCADOPAGO_ACCESS_TOKEN

1. Localize o secret chamado `MERCADOPAGO_ACCESS_TOKEN`
2. Clique no ícone **👁 (Reveal)** ou **Mostrar**
3. Confirmar que o valor começa com:
   - **TEST-** (correto para hoje)
   - **APP_USR_** (apenas após decisão GO)

**Checklist:**

```
[ ] Secret encontrado
[ ] Valor visível (não truncado)
[ ] Prefixo confirmado: [ ] TEST- [ ] APP_USR_
[ ] Data/Hora: __________
[ ] Confirmador: __________
```

### Passo 4: Validar MERCADOPAGO_WEBHOOK_SECRET

1. Localize o secret chamado `MERCADOPAGO_WEBHOOK_SECRET`
2. Confirmar que está presente (não vazio)
3. **Não é necessário validar prefixo** — este secret é o mesmo para TEST- e APP_USR_

**Checklist:**

```
[ ] Secret encontrado
[ ] Valor presente (não vazio)
[ ] Data/Hora: __________
[ ] Confirmador: __________
```

### Passo 5: Validar MERCADOPAGO_NOTIFICATION_URL

1. Localize o secret chamado `MERCADOPAGO_NOTIFICATION_URL`
2. Confirmar que contém a URL do webhook função:
   ```
   https://ykalocfhnetxenvmtlcn.supabase.co/functions/v1/billing-webhook
   ```
3. **Não muda entre TEST- e APP_USR_**

**Checklist:**

```
[ ] Secret encontrado
[ ] URL correta: https://ykalocfhnetxenvmtlcn.supabase.co/functions/v1/billing-webhook
[ ] Data/Hora: __________
[ ] Confirmador: __________
```

---

## Alternativa: Validação via CLI (retorna digest apenas)

Se preferir documentar via CLI:

```bash
supabase secrets list --project-ref ykalocfhnetxenvmtlcn
```

**Saída esperada:**

```
Name                                     | Created at              | Last Updated
MERCADOPAGO_PUBLIC_KEY                   | 2026-03-24 10:00:00 UTC | 2026-03-24 10:00:00 UTC
MERCADOPAGO_ACCESS_TOKEN                 | 2026-03-24 10:00:00 UTC | 2026-03-24 10:00:00 UTC
MERCADOPAGO_WEBHOOK_SECRET               | 2026-03-24 10:00:00 UTC | 2026-03-24 10:00:00 UTC
MERCADOPAGO_NOTIFICATION_URL              | 2026-03-24 10:00:00 UTC | 2026-03-24 10:00:00 UTC
```

**Limitação:** Digests não revelam prefixo. **Validação manual no painel é obrigatória.**

---

## Registro de Conclusão

```
Data/Hora da validação: ___________
Responsável: ___________

Secrets validados:
[ ] MERCADOPAGO_PUBLIC_KEY (prefixo: TEST- / APP_USR_)
[ ] MERCADOPAGO_ACCESS_TOKEN (prefixo: TEST- / APP_USR_)
[ ] MERCADOPAGO_WEBHOOK_SECRET (presente)
[ ] MERCADOPAGO_NOTIFICATION_URL (correta)

Status geral: [ ] PASS (todos 4 secrets corretos) [ ] FAIL (revisar acima)

Observações:
_________________________________________________________________
_________________________________________________________________

Assinado por: ___________
Data/Hora: ___________
```

---

## Se encontrar problema

> **PARAR imediatamente e abrir ticket:**

1. **Se prefixo errado (ex.: APP_USR_ em TEST-):**
   - Não prosseguir com smoke test
   - Abrir ação corretiva
   - Status: **NO-GO**

2. **Se secret ausente:**
   - Criar/recuperar secret no painel
   - Aguardar ~30 seg para replicação
   - Revalidar antes de smoke test

3. **Se URL webhook errada:**
   - Corrigir para: `https://ykalocfhnetxenvmtlcn.supabase.co/functions/v1/billing-webhook`
   - Aguardar ~30 seg
   - Revalidar

---

## Próximo: Após validação passar

Ir para [SMOKE-TEST-26MAR-EXECUTION-PLAN.md](SMOKE-TEST-26MAR-EXECUTION-PLAN.md) e iniciar **Pré-requisitos (P1-P2)**.
