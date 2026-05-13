# restaurante-ops Blueprint

## Why separated

A camada SaaS (clientes, contratos, metricas e cobranca) precisa evoluir com governanca propria sem degradar o POS.

## Proposed workspace

- `restaurante-ops/` (novo projeto)
- `database-backup/supabase/functions/` (edge orchestration)
- `docs/saas-billing/` (estrategia e rollout)

## Integration points

1. app/web mostram status e CTA de regularizacao
2. ops consome e gerencia estado global da carteira
3. edge functions executam mutacoes sensiveis de provider

## Initial KPI set

- trial conversion rate
- active subscriptions
- grace period count
- payment failure rate
- web/app monthly active companies
- invoice recovery rate (pix fallback)
