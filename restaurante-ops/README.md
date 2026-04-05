# restaurante-ops

Projeto separado para operacao SaaS do ecossistema restaurante-supabase.
Foco atual: aplicacao web pronta para deploy no Railway.

## Objetivo

Centralizar gestao de clientes, contratos, metricas de uso e operacao financeira sem acoplar essa camada ao POS operacional.

## Escopo Inicial

- Dashboard SaaS (MRR, churn, trial pipeline)
- Gestao de clientes/empresas
- Gestao de cobranca e reconciliação
- Alertas operacionais
- Trilhas de auditoria

## Fora de Escopo

- Fluxos de pedido/comanda/cozinha/caixa (permanecem em restaurante-app/restaurante-web)

## Estrutura

- `src/modules/customers` -> lifecycle de clientes
- `src/modules/billing` -> assinatura, invoices, reconciliacao
- `src/modules/metrics` -> agregacao e analytics operacional
- `docs` -> arquitetura, contratos e roadmap

## Como iniciar

1. `npm install`
2. copie `.env.example` para `.env`
3. `npm run dev`
4. abrir `http://localhost:4040`

## Endpoints iniciais

- `GET /` ou `GET /dashboard` -> pagina web inicial
- `GET /login` -> tela de login no padrao visual do restaurante-web
- `GET /register` -> tela de cadastro no padrao visual do restaurante-web
- `GET /healthz` -> healthcheck (usado no deploy)
- `GET /api/status` -> status basico dos modulos
- `POST /auth/login` -> endpoint scaffold de autenticacao
- `POST /auth/register` -> endpoint scaffold de cadastro

## Deploy no Railway

1. Dentro de `restaurante-ops`, garantir build com `npm run build`
2. Provisionar no Railway apontando para a pasta `restaurante-ops`
3. Configurar variaveis de ambiente:
	- `SUPABASE_URL`
	- `SUPABASE_SERVICE_ROLE_KEY`
	- `OBS_SUPABASE_URL` (projeto isolado de observabilidade)
	- `OBS_SUPABASE_SERVICE_ROLE_KEY` (service role do projeto isolado)
	- `OBS_DUAL_WRITE` (`true` para enviar logs para `ops_logs` no isolado)
	- `OBS_READ_FROM_ISOLATED` (flag reservada para switch de leitura)
	- `OPS_ENV=production`
	- `OPS_PUBLIC_BASE_URL` (URL publica do servico)
4. Railway injeta `PORT` automaticamente (ja suportado pelo app)

Arquivo de deploy: `railway.json`.

## Variaveis de Ambiente Server-Only

As variaveis abaixo sao exclusivas do servidor e nunca devem ser expostas em cliente, logs ou exemplos publicos com valores reais:

- `SUPABASE_SERVICE_ROLE_KEY`
- `REDIS_URL`
- `MERCADOPAGO_ACCESS_TOKEN`
- `MERCADOPAGO_WEBHOOK_SECRET`

Use sempre placeholders em documentacao e mantenha credenciais reais somente em ambientes seguros.

## Validacao de Rate Limiting

Para validar rapidamente respostas `429`/`503` nas rotas protegidas:

```bash
cd restaurante-ops
chmod +x scripts/rate-limit-smoke.sh
BASE_URL=http://localhost:4040 ATTEMPTS=10 ./scripts/rate-limit-smoke.sh
```

Para incluir trilha de billing no mesmo smoke (com autenticacao):

```bash
cd restaurante-ops
AUTH_EMAIL='ops@example.com' AUTH_PASSWORD='***' \
BILLING_JSON='{"companyId":"<uuid>","idempotencyKey":"smoke-1","eventType":"payment_received","paymentStatus":"paid"}' \
BASE_URL=http://localhost:4040 ATTEMPTS=35 ./scripts/rate-limit-smoke.sh
```

No Windows/PowerShell:

```powershell
Set-Location restaurante-ops
$env:AUTH_EMAIL='ops@example.com'
$env:AUTH_PASSWORD='***'
$env:BILLING_JSON='{"companyId":"<uuid>","idempotencyKey":"smoke-1","eventType":"payment_received","paymentStatus":"paid"}'
$env:BASE_URL='http://localhost:4040'
$env:ATTEMPTS='35'
./scripts/rate-limit-smoke.ps1
```

Para localizar uma empresa com invoice elegivel (`pending` ou `failed`) antes do smoke final de `OPS-4`:

```bash
cd restaurante-ops
npm run billing:candidates
```

Runbook operacional completo do `OPS-4`:

- `../docs/security/OPS4_RECONCILE_SUCCESS_IDEMPOTENCY_RUNBOOK.md`

Filtrando por empresa:

```bash
cd restaurante-ops
npm run billing:candidates -- --company-id <company_uuid>
```

Diretrizes consolidadas de rollout e evidencias:
- `.github/copilot-instructions.md`

## Dependencias com o ecossistema atual

- Supabase (mesmo backend multitenant)
- Edge Functions de billing em `database-backup/supabase/functions`
- Tabelas de billing ja criadas via migrations
