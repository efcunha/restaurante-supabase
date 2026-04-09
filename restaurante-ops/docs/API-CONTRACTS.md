# API Contracts (draft)

## Billing

### GET /ops/billing/company/:companyId
Retorna assinatura, metodos, invoices e status do provider.

Regras:
- `companyId` deve ser UUID valido.

### GET /ops/billing/company/:companyId/audit?limit=30
Retorna trilha administrativa da cobranca (`billing_audit_log`) para suporte operacional.

Regras:
- `companyId` deve ser UUID valido.
- `limit` opcional, minimo 1 e maximo 100.

### GET /ops/billing/summary
Retorna visao agregada de cobranca (pendencias, atrasos, risco e invoices recentes).

### POST /ops/billing/company/:companyId/regularize/card
Dispara jornada de regularizacao por cartao.

Body opcional:
- `invoiceId`: UUID da invoice alvo. Se ausente, usa a invoice `pending/failed` mais antiga.

Regras:
- `companyId` deve ser UUID valido.
- `invoiceId` (quando enviado) deve ser UUID valido.

### POST /ops/billing/company/:companyId/regularize/pix
Dispara fallback de regularizacao por Pix.

Body opcional:
- `invoiceId`: UUID da invoice alvo. Se ausente, usa a invoice `pending/failed` mais antiga.

Regras:
- `companyId` deve ser UUID valido.
- `invoiceId` (quando enviado) deve ser UUID valido.

### POST /ops/billing/reconcile
Reconcilia evento de pagamento com idempotencia em `webhook_events` e atualiza invoice/assinatura.

Body obrigatorio:
- `companyId`
- `idempotencyKey`
- `eventType`
- `paymentStatus` (`paid` ou `failed`)

Body opcional:
- `invoiceId`
- `mpPaymentId`
- `paymentMethodType` (`card` ou `pix`)
- `errorCode`
- `payload` (JSON)

Validacao:
- `companyId` deve ser UUID valido
- `idempotencyKey` deve ter entre 8 e 120 caracteres
- `paymentStatus` deve ser `paid` ou `failed`
- `paymentMethodType`, quando enviado, deve ser `card` ou `pix`
- `invoiceId`, quando enviado, deve ser UUID valido

Comportamento:
- se `idempotencyKey` ja existir, retorna sucesso com `alreadyProcessed=true` sem reprocessar efeitos
- em `paid`, marca invoice como paga e assinatura como `active/reactivated`
- em `failed`, marca invoice como falha e assinatura como `grace_period`
- registra trilha em `billing_audit_log`

Regras de transicao (P1 hardening):
- `paid` nao pode ser aplicado em invoice ja `paid` ou `cancelled`
- `failed` nao pode ser aplicado em invoice `paid` ou `cancelled`
- quando ha mais de uma invoice elegivel e `invoiceId` nao e informado, retorna erro de ambiguidade
- assinatura `cancelled` nao e reativada automaticamente por reconcile `paid`; requer reativacao manual
- se assinatura ja estiver `suspended`, reconcile `failed` preserva `suspended`

Resposta de erro operacional:
- endpoints de billing retornam JSON com `{ error, code }` para falhas de validacao/negocio
- exemplos de `code`: `INVOICE_ACTION_AMBIGUOUS`, `INVOICE_ALREADY_PAID`, `SUBSCRIPTION_CANCELLED_MANUAL_REACTIVATION_REQUIRED`

## Metrics

### GET /ops/metrics/company/:companyId/usage
Retorna metricas de uso diario/mensal.

### GET /ops/metrics/portfolio
Retorna visao agregada da carteira.

## Customers

### GET /ops/customers
Lista empresas com status operacional e billing.

### GET /ops/customers/:companyId
Detalhe consolidado para suporte.

## Integracoes Externas (planejado)

### POST /webhooks/ifood
Recebe eventos de pedidos/status originados no iFood.

Regras:
- validar assinatura do provedor antes de processar payload
- validar idempotencia por `provider + eventId`
- resolver `company_id` por mapeamento de merchant, nunca por campo livre do payload
- registrar evento para auditoria e troubleshooting

Resposta esperada:
- `200` para evento aceito
- `202` para processamento assincrono
- `401` assinatura invalida
- `409` evento duplicado

Referencias:
- `docs/ifood/CONTRATOS-API.md`
- `docs/ifood/SEGURANCA-LGPD.md`
