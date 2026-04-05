# Runbook Operacional - OPS-4 Reconcile de Sucesso e Idempotencia

Data de criacao: 2026-04-05
Escopo: restaurante-ops
Objetivo: executar e evidenciar o cenario obrigatorio de sucesso idempotente do `OPS-4` para fechamento do ciclo de seguranca Q2 2026.

## Fontes de verdade

- `SECURITY_REMEDIATION_WEEKLY_STATUS_2026-Q2.md`
- `SECURITY_REMEDIATION_PLAN_2026-Q2.md`
- `restaurante-ops/docs/API-CONTRACTS.md`
- `restaurante-ops/README.md`

Este runbook nao substitui os documentos canonicos. Ele existe para padronizar a execucao operacional e a coleta de evidencias do `OPS-4`.

## Execucao rapida

Use este fluxo curto quando a invoice elegivel ja estiver identificada:

1. preencher `BASE_URL`, `OPS_SESSION`, `COMPANY_ID`, `INVOICE_ID` e `IDEMPOTENCY_KEY`;
2. registrar estado antes em `GET /ops/billing/company/:companyId` e `GET /ops/billing/company/:companyId/audit?limit=30`;
3. executar o primeiro `POST /ops/billing/reconcile` com `paymentStatus=paid`;
4. repetir o mesmo `POST` com a mesma `idempotencyKey`;
5. registrar estado depois e comparar invoice, assinatura e audit log;
6. atualizar os documentos canonicos com data/hora UTC, comando, esperado, observado e decisao final.

Se nao existir invoice `pending` ou `failed`, interrompa a execucao e registre o item como `bloqueado`.

## Quando usar

Use este runbook quando existir ao menos uma invoice com status `pending` ou `failed` e for necessario provar, com evidencia auditavel, que:

1. o primeiro `POST /ops/billing/reconcile` processa o sucesso da invoice elegivel;
2. o segundo `POST /ops/billing/reconcile` com a mesma `idempotencyKey` nao duplica efeitos;
3. invoice, assinatura e trilha de auditoria permanecem consistentes.

## Pre-condicoes obrigatorias

- Existe uma invoice elegivel com `status` igual a `pending` ou `failed`.
- O operador possui sessao valida no `restaurante-ops`.
- `companyId` e `invoiceId` foram identificados antes do primeiro reconcile.
- O teste sera executado em janela controlada, com horario UTC registrado.
- A mesma `idempotencyKey` sera reutilizada somente entre a primeira e a segunda chamada do mesmo teste.

## Gate de seguranca da execucao

- Nao usar credenciais hardcoded no comando ou no documento final.
- Nao usar `SUPABASE_SERVICE_ROLE_KEY` em shell history compartilhado.
- Sempre enviar `invoiceId` explicitamente para evitar ambiguidade operacional.
- Nao executar o teste se a invoice ja estiver `paid` ou `cancelled`.
- Nao executar o teste se a assinatura estiver `cancelled` e a regra exigir reativacao manual.
- Registrar resposta HTTP e estado antes/depois no mesmo ciclo de trabalho.

## Variaveis de entrada

Preencha as variaveis abaixo antes da execucao:

```bash
export BASE_URL="https://ops.restaurante-web.app.br"
export OPS_SESSION="<cookie_ops_session>"
export COMPANY_ID="<company_uuid>"
export INVOICE_ID="<invoice_uuid>"
export IDEMPOTENCY_KEY="ops4-success-<yyyymmdd>-001"
```

No PowerShell:

```powershell
$env:BASE_URL = "https://ops.restaurante-web.app.br"
$env:OPS_SESSION = "<cookie_ops_session>"
$env:COMPANY_ID = "<company_uuid>"
$env:INVOICE_ID = "<invoice_uuid>"
$env:IDEMPOTENCY_KEY = "ops4-success-<yyyymmdd>-001"
```

## Passo 1 - Encontrar invoice elegivel

Comando base:

```bash
cd restaurante-ops
npm run -s billing:candidates
```

Filtrando por empresa:

```bash
cd restaurante-ops
npm run -s billing:candidates -- --company-id <company_uuid>
```

Resultado esperado:

- Pelo menos uma invoice `pending` ou `failed`.

Resultado de bloqueio:

- `count: 0`
- `No pending/failed invoices found for OPS-4 success-path smoke.`

Se o resultado de bloqueio ocorrer, encerrar a execucao como `bloqueado` e atualizar os documentos canonicos com data/hora UTC e proximo passo objetivo.

## Passo 2 - Capturar estado antes da mutacao

Antes do primeiro reconcile, registrar:

1. estado atual da invoice alvo;
2. estado atual da assinatura da empresa;
3. ultimas entradas relevantes do audit log de billing.

Consulta operacional consolidada:

```bash
curl -sS -X GET "$BASE_URL/ops/billing/company/$COMPANY_ID" \
  -H "Cookie: ops_session=$OPS_SESSION"
```

Consulta de trilha administrativa:

```bash
curl -sS -X GET "$BASE_URL/ops/billing/company/$COMPANY_ID/audit?limit=30" \
  -H "Cookie: ops_session=$OPS_SESSION"
```

Registrar no minimo:

- status da invoice antes;
- status da assinatura antes;
- quantidade/identificador de eventos de auditoria antes.

## Passo 3 - Executar o primeiro reconcile

Comando bash:

```bash
curl -i -X POST "$BASE_URL/ops/billing/reconcile" \
  -H "Content-Type: application/json" \
  -H "Cookie: ops_session=$OPS_SESSION" \
  -d "{\
    \"companyId\": \"$COMPANY_ID\",\
    \"invoiceId\": \"$INVOICE_ID\",\
    \"idempotencyKey\": \"$IDEMPOTENCY_KEY\",\
    \"eventType\": \"payment_received\",\
    \"paymentStatus\": \"paid\",\
    \"paymentMethodType\": \"card\"\
  }"
```

Comando PowerShell:

```powershell
$body = @{
  companyId = $env:COMPANY_ID
  invoiceId = $env:INVOICE_ID
  idempotencyKey = $env:IDEMPOTENCY_KEY
  eventType = "payment_received"
  paymentStatus = "paid"
  paymentMethodType = "card"
} | ConvertTo-Json

Invoke-WebRequest \
  -Uri "$env:BASE_URL/ops/billing/reconcile" \
  -Method POST \
  -ContentType "application/json" \
  -Headers @{ Cookie = "ops_session=$env:OPS_SESSION" } \
  -Body $body
```

Resultado esperado:

- HTTP de sucesso.
- Invoice alvo transiciona para estado compativel com pagamento.
- Assinatura reflete o estado permitido pela regra de negocio.
- Trilha de auditoria registra um unico efeito material.

## Passo 4 - Executar o segundo reconcile com a mesma idempotencyKey

Repetir exatamente o mesmo comando do passo 3.

Resultado esperado:

- Resposta deterministica de idempotencia.
- Idealmente `alreadyProcessed=true` ou semantica equivalente.
- Nenhuma segunda mutacao em invoice.
- Nenhuma segunda mutacao em assinatura.
- Nenhum efeito duplicado no audit log.

## Passo 5 - Capturar estado depois da mutacao

Repetir as consultas do passo 2:

```bash
curl -sS -X GET "$BASE_URL/ops/billing/company/$COMPANY_ID" \
  -H "Cookie: ops_session=$OPS_SESSION"
```

```bash
curl -sS -X GET "$BASE_URL/ops/billing/company/$COMPANY_ID/audit?limit=30" \
  -H "Cookie: ops_session=$OPS_SESSION"
```

Validacoes obrigatorias:

1. invoice mudou no maximo uma vez;
2. assinatura mudou no maximo uma vez;
3. a segunda chamada nao duplicou efeito material;
4. a trilha auditavel permaneceu consistente.

## Critérios de aceite para marcar OPS-4 como concluido

- Existe evidencia da invoice elegivel antes da execucao.
- Primeira chamada de reconcile retornou sucesso compativel com a regra de negocio.
- Segunda chamada com a mesma `idempotencyKey` nao duplicou efeitos.
- Invoice, assinatura e audit log ficaram consistentes.
- Evidencia foi registrada com data/hora UTC, comando, esperado e observado.

## Condicoes de bloqueio

Marcar o `OPS-4` como `bloqueado` se qualquer uma das situacoes abaixo ocorrer:

- nenhuma invoice elegivel encontrada;
- invoice ja `paid` ou `cancelled`;
- regra de assinatura impedir a transicao automatica;
- sessao invalida ou indisponibilidade operacional do `restaurante-ops`;
- resposta sem determinismo suficiente para comprovar idempotencia.

## Template de evidencia para colar nos documentos canonicos

```text
Data/hora UTC: <yyyy-mm-dd hh:mm:ss UTC>

Comando executado:
POST /ops/billing/reconcile com companyId=<company>, invoiceId=<invoice>, idempotencyKey=<key>, paymentStatus=paid

Resultado esperado:
1. Primeira chamada processa a invoice elegivel com sucesso.
2. Segunda chamada com a mesma idempotencyKey nao duplica efeitos.
3. Invoice, assinatura e audit log permanecem consistentes.

Resultado observado:
1. Primeira chamada: <http/resultado>.
2. Segunda chamada: <http/resultado>.
3. Invoice antes/depois: <...>.
4. Assinatura antes/depois: <...>.
5. Audit log antes/depois: <...>.

Decisao:
OPS-4 concluido / bloqueado
```

## Onde atualizar depois da execucao

- `docs/security/SECURITY_REMEDIATION_WEEKLY_STATUS_2026-Q2.md`
- `docs/security/SECURITY_REMEDIATION_PLAN_2026-Q2.md`

Atualize o semanal para status, bloqueio e evidencia curta.
Atualize o plano apenas se houver mudanca real de escopo ou fechamento definitivo do item.

## Resultado esperado apos o fechamento do OPS-4

Quando este runbook for executado com sucesso e a evidencia for registrada, a trilha security deixa de ter pendencia operacional de billing e passa a manter apenas o bloqueio estrutural de ausencia de staging dedicado.