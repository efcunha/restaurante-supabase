# Storybook + Figma (Sem Custo) — Guia de Implementacao

## Objetivo
Estabelecer um fluxo pratico de design-to-code sem dependencia de Code Connect publish, mantendo rastreabilidade entre componentes no Figma e implementacoes no repositorio.

## Escopo
- Monorepo: restaurante-app, restaurante-web, restaurante-site
- Fonte de verdade de UI: codigo versionado + Storybook
- Rastreabilidade: node map (Figma node-id -> componente -> caminho -> URL de documentacao)

## Resultado Esperado
1. Time de design encontra rapidamente o componente implementado no codigo.
2. Time de desenvolvimento encontra rapidamente o node correspondente no Figma.
3. CI valida integridade de mapeamento e evita links quebrados.
4. Fluxo continua 100% funcional sem upgrade de plano no Figma.

## Politica de Escopo (Sem Upgrade)
- Publish Code Connect (write) no Figma e explicitamente fora de escopo por decisao de custo.
- Parse local e permitido como validacao de arquivos, sem dependencia de permissao de write.
- O fluxo oficial desta estrategia e Storybook + node map + CI + smoke.

## URL Publica Atual
- Storybook publico (Railway): https://restaurante-web-storybook-production.up.railway.app

## Arquitetura do Fluxo
1. Figma: componente com node-id conhecido.
2. Node map: arquivo JSON em docs/design-system com mapeamentos.
3. Storybook: pagina/caso do componente com URL estavel.
4. Validacao automatica: script verifica caminhos de arquivo e campos obrigatorios.

## Estrutura de Documentacao (dentro de docs)
- docs/design-system/STORYBOOK-FIGMA-SEM-CUSTO.md
- docs/design-system/PROMPT-INICIO-STORYBOOK-FIGMA.md
- docs/design-system/figma-node-map.generated.json
- docs/design-system/figma-node-map.example.json

## Contrato de Mapeamento
Cada entrada deve conter:
- project: restaurante-app | restaurante-web | restaurante-site
- component: nome do componente
- codePath: caminho do arquivo no repositorio
- figmaNodeId: node-id no formato 123:456
- figmaUrl: URL completa do node
- docsUrl: URL da pagina/caso no Storybook
- owner: responsavel tecnico
- status: active | deprecated

Exemplo de objeto:
{
  "project": "restaurante-web",
  "component": "Button",
  "codePath": "restaurante-web/src/ui/Button.tsx",
  "figmaNodeId": "3:12",
  "figmaUrl": "https://figma.com/design/<fileKey>/...?...node-id=3-12",
  "docsUrl": "https://<storybook-host>/?path=/docs/ui-button--docs",
  "owner": "frontend-team",
  "status": "active"
}

## Fases de Implementacao

### Fase 1 — Baseline (rapida)
1. Consolidar figma-node-map.generated.json com todos os 12 componentes atuais.
2. Garantir que cada item tenha figmaNodeId e codePath validos.
3. Publicar este guia no onboarding do time.

### Fase 2 — Storybook
1. Criar stories dos componentes base (Button, Card, Badge, FormInput, ProductCard).
2. Definir URLs estaveis por componente.
3. Preencher docsUrl no node map.
4. Atualizar base de URL em lote quando o host mudar:
- node docs/design-system/set-storybook-base-url.mjs https://restaurante-web-storybook-production.up.railway.app

### Fase 3 — Validacao em CI
1. Script de validacao do node map:
- campos obrigatorios
- formato de node-id
- existencia de codePath
- unicidade por project + component
2. Falhar pipeline em caso de inconsistencias.

### Fase 4 — Governanca
1. Definir owner por componente.
2. Fluxo de PR exige atualizacao do node map quando houver novo componente.
3. Revisao quinzenal de links e componentes deprecated.

## Politica de Qualidade
- Nao usar segredo em docs.
- Nao publicar token em exemplos.
- Atualizacoes de componente exigem update simultaneo de docs.
- Em mudancas app/web espelhadas, atualizar os dois lados.

## Riscos e Mitigacoes
- Risco: node-id mudar apos refactor no Figma.
  Mitigacao: revisao quinzenal + validacao manual em amostragem.
- Risco: story URL quebrar.
  Mitigacao: validacao automatica de links no CI (quando host acessivel).
- Risco: drift entre app e web.
  Mitigacao: checklist de PR para paridade em modulos espelhados.

## Checklist de Pronto
- [x] Mapa consolidado com todos os componentes base
- [x] Stories publicados para componentes base
- [x] docsUrl preenchido no mapa (URL publica)
- [x] Script de validacao adicionado ao CI
- [x] Guia de onboarding atualizado em docs

## Definition of Done (Sem Code Connect Write)
- [x] Storybook publico acessivel
- [x] docsUrl do node map apontando para host publico
- [x] Validacao estrita de node map em CI
- [x] Smoke periodico da URL publica
- [x] Sem dependencia de Figma Code Connect publish

## Runbook Railway (Deploy e Rollback)

### Deploy do Storybook (servico dedicado)
1. Build local do Storybook:
- cd restaurante-web && npm run storybook:build -- --disable-telemetry
2. Publicar no servico dedicado:
- bash restaurante-web/scripts/deploy-storybook-railway.sh
3. Se quiser apenas preparar o payload versionado sem publicar:
- bash restaurante-web/scripts/deploy-storybook-railway.sh --prepare-only
4. O servico publicado usa o diretório versionado `restaurante-web-storybook/` como raiz de deploy, evitando dependencia de `/tmp/storybook-railway-deploy` e de pastas ignoradas no upload.
5. Garantir dominio publico:
- railway domain --service restaurante-web-storybook --json

### Rollback rapido
1. Reimplantar ultimo deploy estavel:
- railway redeploy --service restaurante-web-storybook
2. Se necessario, remover ultimo deploy:
- railway down --service restaurante-web-storybook
3. Revalidar endpoint publico:
- curl -I https://restaurante-web-storybook-production.up.railway.app

## Comandos Operacionais Uteis
Parse/dry-run do Figma (continua valido):
- scripts/figma-run.bat parse
- scripts/figma-run.bat publish (opcional, fora do escopo oficial sem upgrade)

Observacao: este guia adota estrategia oficial sem upgrade de plano do Figma; publish Code Connect write nao e requisito para entrega.
