# Evidencias — Storybook + Figma (2026-04-12)

## Resumo
- Storybook inicializado em `restaurante-web` com framework `@storybook/react-webpack5`.
- Stories base criadas para: `Button`, `Card`, `Badge`, `FormInput` e `ProductCard`.
- Stories expandidas com estados avancados (loading, disabled, empty, long content) para os 5 componentes base.
- Node map normalizado em formato estruturado com campos obrigatorios e compatibilidade legada.
- Validacao automatica criada para impedir drift de mapeamento (`project + component`, campos obrigatorios, node-id e codePath).
- Workflow de CI adicionado para validar node map e build de Storybook em PR/push.
- Script utilitario adicionado para trocar a base de `docsUrl` em lote quando houver host publico.
- Workflow atualizado com modo estrito opcional via `workflow_dispatch` para reprovar `localhost` em `docsUrl`.
- Storybook publicado no Railway em URL publica.
- Validacao estrita de `docsUrl` habilitada por padrao em `pull_request`/`push`.
- Workflow dedicado de smoke publico criado para monitorar disponibilidade da URL e drift de `docsUrl`.

## URL publica
- `https://restaurante-web-storybook-production.up.railway.app`
- Protegida por Basic Auth em producao (`401` sem credencial, `200` com credencial valida).

## URL publica MCP
- `https://restaurante-web-storybook-mcp-production.up.railway.app`
- Endpoints publicos endurecidos com token Bearer e allowlist de origem.

## Arquivos-chave
- `restaurante-web/.storybook/main.ts`
- `restaurante-web/.storybook/preview.ts`
- `restaurante-web/src/ui/Button.stories.tsx`
- `restaurante-web/src/ui/Card.stories.tsx`
- `restaurante-web/src/ui/Badge.stories.tsx`
- `restaurante-web/src/ui/FormInput.stories.tsx`
- `restaurante-web/src/ui/ProductCard.stories.tsx`
- `docs/design-system/figma-node-map.generated.json`
- `docs/design-system/validate-figma-node-map.mjs`
- `docs/design-system/set-storybook-base-url.mjs`
- `docs/design-system/smoke-storybook-public.mjs`
- `restaurante-web-storybook-mcp/package.json`
- `restaurante-web-storybook-mcp/railway.json`
- `restaurante-web-storybook-mcp/server.mjs`
- `restaurante-web-storybook-mcp/smoke.mjs`
- `.github/workflows/storybook-figma-guardrails.yml`
- `.github/workflows/storybook-public-smoke.yml`

## Comandos de verificacao
- `cd restaurante-web && npm run storybook`
- `cd restaurante-web && npm run storybook:build`
- `node docs/design-system/validate-figma-node-map.mjs`
- `node docs/design-system/set-storybook-base-url.mjs https://seu-host-storybook`
- `node docs/design-system/smoke-storybook-public.mjs`

Variaveis opcionais do smoke publico:
- `STORYBOOK_PUBLIC_BASE_URL`: base publica esperada para validar URL e `docsUrl`.
- `STORYBOOK_PUBLIC_BASIC_AUTH_USER` e `STORYBOOK_PUBLIC_BASIC_AUTH_PASS`: envia header Basic Auth quando configuradas.
- `STORYBOOK_PUBLIC_SMOKE_STRICT_AUTH=true`: reprova quando a URL responder `401` sem credenciais (modo estrito).

## Storybook MCP (configurado)
- Addon configurado no formato oficial com `toolsets` (`dev` e `docs`) e `experimentalFormat: markdown`.
- `experimentalComponentsManifest` habilitado em `.storybook/main.ts` para suportar o toolset de docs.
- Endpoint MCP esperado em ambiente local: `http://localhost:6006/mcp`.
- Upgrade controlado aplicado em `restaurante-web` para Storybook `9.1.20`.
- Resultado da validacao local em 2026-04-12 apos upgrade: `POST /mcp` retornou `200` com resposta JSON-RPC `tools/list`.
- Servico dedicado standalone preparado em `restaurante-web/scripts/storybook-mcp-server.mjs` usando `@storybook/mcp`.
- Validacao local do servico dedicado: `GET /healthz` = `200` e `POST /mcp` = `200` via `npm run storybook:mcp` + `npm run storybook:mcp:smoke`.
- O Storybook publico principal no Railway continua servindo apenas a UI estatica; por isso, a exposicao publica do MCP foi separada em um segundo servico dedicado.
- Servico dedicado publicado em producao no Railway: `restaurante-web-storybook-mcp`.
- URL publica MCP validada em producao: `https://restaurante-web-storybook-mcp-production.up.railway.app/mcp`.
- Healthcheck publico validado em producao: `https://restaurante-web-storybook-mcp-production.up.railway.app/healthz`.
- Validacao publica final em 2026-04-12: `GET /healthz` = `200` e `POST /mcp` = `200` com resposta JSON-RPC contendo `tools/list` (`list-all-documentation`, `get-documentation-for-story`, `get-documentation`).
- O deploy de producao do MCP ficou isolado em `restaurante-web-storybook-mcp/` para evitar conflito com o `railway.json` do servico estatico do Storybook.
- Validacao rapida de endpoint (JSON-RPC):

```bash
curl -X POST http://localhost:6006/mcp \
	-H "Content-Type: application/json" \
	-d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

## Checklist de aceite desta iteracao
- [x] Cada componente base com mapeamento completo
- [x] Nenhum item sem owner ou status
- [x] Sem duplicidade por `project + component`
- [x] Pelo menos 1 story funcional por componente base
- [x] Documentacao atualizada em `docs/design-system`

## Gaps para proxima iteracao
- Automatizar smoke publico dedicado do MCP (`/healthz` + `POST /mcp`) em workflow proprio, caso seja necessario monitoramento continuo do segundo servico.
- Publish Code Connect em Figma: fora de escopo por decisao de custo (sem upgrade de plano).

## Estado de fechamento (Storybook + Figma)
- Storybook publico: OK + protegido por Basic Auth (`https://restaurante-web-storybook-production.up.railway.app`)
- Storybook MCP publico dedicado: OK + protegido por Bearer/AuthZ de origem (`https://restaurante-web-storybook-mcp-production.up.railway.app/mcp`)
- Node map com URL publica e validacao estrita: OK
- Smoke publico agendado (workflow dedicado): OK
- Parse Code Connect (app/web/site): OK
- Publish Code Connect (dry-run/real): fora de escopo por decisao de custo

## Matriz de validacao de seguranca (2026-04-12)
- Storybook UI (`/`): sem credencial -> `401`
- Storybook UI (`/`): com Basic Auth valida -> `200`
- Storybook MCP (`/mcp`): sem token/autorizacao -> negado (`401` ou `403`, conforme origem)
- Storybook MCP (`/healthz`): origem nao permitida -> `403`
- Storybook MCP (`/healthz-internal`): healthcheck interno Railway -> `200`

## Definition of Done (Sem Upgrade Figma)
- [x] Storybook publico operacional
- [x] Storybook MCP publico operacional
- [x] Node map completo e consistente
- [x] CI de guardrails ativo (validacao estrita)
- [x] Smoke publico ativo (URL + consistencia do node map)
- [x] Documentacao consolidada sem dependencia de Code Connect write
