# API Contracts (draft)

## Billing

### GET /ops/billing/company/:companyId
Retorna assinatura, metodos, invoices e status do provider.

### POST /ops/billing/company/:companyId/regularize/card
Dispara jornada de regularizacao por cartao.

### POST /ops/billing/company/:companyId/regularize/pix
Dispara fallback de regularizacao por Pix.

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
