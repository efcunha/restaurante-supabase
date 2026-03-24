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
	- `OPS_ENV=production`
	- `OPS_PUBLIC_BASE_URL` (URL publica do servico)
4. Railway injeta `PORT` automaticamente (ja suportado pelo app)

Arquivo de deploy: `railway.json`.

## Validacao de Rate Limiting

Para validar rapidamente respostas `429`/`503` nas rotas protegidas:

```bash
cd restaurante-ops
chmod +x scripts/rate-limit-smoke.sh
BASE_URL=http://localhost:4040 ATTEMPTS=10 ./scripts/rate-limit-smoke.sh
```

Diretrizes consolidadas de rollout e evidencias:
- `.github/copilot-instructions.md`

## Dependencias com o ecossistema atual

- Supabase (mesmo backend multitenant)
- Edge Functions de billing em `database-backup/supabase/functions`
- Tabelas de billing ja criadas via migrations
