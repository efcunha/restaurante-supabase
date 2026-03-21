# Architecture

## Context

`restaurante-ops` e um projeto separado para backoffice SaaS. A operacao do restaurante continua em `restaurante-app` e `restaurante-web`.

## Layers

1. Presentation
- dashboards administrativos
- listas de clientes
- investigacao de cobranca

2. Application
- casos de uso (regularizar pagamento, analisar churn, acompanhar trial)

3. Data
- Supabase read/write com service role
- chamadas a Edge Functions de billing

## Security

- Nenhuma credencial sensivel no cliente operacional
- Mutacoes de billing apenas por backend seguro
- Isolamento por `company_id` em todas as consultas
