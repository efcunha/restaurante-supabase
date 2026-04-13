# Prompt de Inicio — Implementacao Storybook + Figma (Sem Custo)

Use este prompt no inicio de cada sessao para implementar e manter o fluxo Storybook + Figma sem dependencia de Code Connect publish.

## Prompt
Voce esta no monorepo restaurante-supabase.
Objetivo: implementar e evoluir fluxo sem custo de rastreabilidade entre Figma e codigo usando Storybook + node map versionado.

Regras obrigatorias:
1. Toda documentacao e artefatos de apoio devem ficar dentro da pasta docs.
2. Manter paridade app/web para componentes espelhados quando aplicavel.
3. Nao expor tokens/chaves em codigo, logs ou docs.
4. Respeitar padrao multi-tenant e guardrails do repositorio.
5. Se houver alteracao de componente, atualizar node map na mesma entrega.
6. Nao exigir publish Code Connect no Figma; este passo e fora de escopo por decisao de custo.

Escopo tecnico:
- Fonte de verdade de UI: componentes no codigo.
- Fonte de verdade de referencia visual: Figma + node-id.
- Ligacao entre os dois: docs/design-system/figma-node-map.generated.json.
- Descoberta para dev/design: URL de Storybook por componente.
- URL publica atual de referencia: https://restaurante-web-storybook-production.up.railway.app

Entregas minimas desta sessao:
1. Atualizar/normalizar node map com:
- project
- component
- codePath
- figmaNodeId
- figmaUrl
- docsUrl
- owner
- status
2. Garantir stories para Button, Card, Badge, FormInput e ProductCard.
3. Validar que os codePath existem no repositorio.
4. Registrar evidencias em docs/design-system.

Criterios de aceite:
1. Cada componente base possui mapeamento completo.
2. Nenhum item sem owner ou status.
3. Nao existe duplicidade de project + component.
4. Pelo menos 1 story funcional por componente base.
5. Documentacao atualizada em docs/design-system sem referencias a tokens reais.
6. Fluxo validado sem dependencia de Code Connect write (Storybook + node map + CI + smoke).

Plano de execucao recomendado:
1. Inventariar componentes atuais por projeto.
2. Revisar node IDs no Figma.
3. Criar/ajustar stories.
4. Preencher docsUrl no node map.
	 - Atualizar em lote com:
		 node docs/design-system/set-storybook-base-url.mjs https://restaurante-web-storybook-production.up.railway.app
5. Executar validacoes locais.
	 - REQUIRE_PUBLIC_DOCS_URL=true node docs/design-system/validate-figma-node-map.mjs
6. Atualizar docs finais e checklist.

Formato de saida esperado na sessao:
- Resumo curto do que foi implementado.
- Lista de arquivos alterados.
- Gaps pendentes para proxima iteracao.
- Riscos e mitigacoes.

## Prompt Curto (copiar e usar rapido)
Implementar fluxo sem custo Storybook + Figma no monorepo restaurante-supabase, mantendo rastreabilidade por node map em docs/design-system, com stories dos componentes base, validacao de integridade e documentacao completa somente dentro de docs.
