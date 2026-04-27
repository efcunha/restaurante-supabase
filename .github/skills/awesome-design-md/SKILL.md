---
name: awesome-design-md
description: Use quando o pedido envolver DESIGN.md, Stitch, getdesign.md, awesome-design-md, referência visual inspirada em produtos reais, design system baseado em sites conhecidos, ou direção estética para UI web/mobile sem copiar cegamente uma marca.
---

# Skill: awesome-design-md

## Objetivo

Integrar a coleção `VoltAgent/awesome-design-md` ao fluxo de design deste repositório como fonte de referência visual para UI web/mobile.

Esta skill existe para:

- localizar referências `DESIGN.md` adequadas ao contexto do pedido
- transformar referências externas em direção visual aplicável ao projeto
- preservar os guardrails locais (`tokens`, `src/ui/`, responsividade, acessibilidade e rollout seguro)
- evitar cópia literal de identidade de marca de terceiros

## Fonte Externa

- Repositório: `https://github.com/VoltAgent/awesome-design-md`
- Catálogo principal: `https://getdesign.md`
- Formato base: `DESIGN.md` do Google Stitch

Observação operacional:

- O repositório público mantém o índice e parte da estrutura.
- Muitos documentos completos foram movidos para páginas `getdesign.md/<site>/design-md`.
- Quando precisar do conteúdo completo, prefira consultar a página `getdesign.md` correspondente em vez de depender apenas do README do GitHub.

## Quando Usar

Use esta skill quando o usuário pedir:

- inspiração visual baseada em produtos reais
- um `DESIGN.md` para o projeto
- interface com linguagem estética específica
- benchmark visual de dashboards, SaaS, fintech, ecommerce ou apps modernos
- direção de design antes de implementar telas

Não use esta skill como substituta da arquitetura visual local. Ela complementa:

- `.github/skills/restaurante-supabase/SKILL.md`
- `.github/skills/ui-ux-pro-max/SKILL.md`

## Regras de Integração no Repositório

1. Priorize as restrições do projeto antes da estética externa.
2. Para UI nova, converta a referência em tokens e padrões locais; não espalhe estilos ad-hoc.
3. Preserve acessibilidade, contraste, estados de foco, responsividade e ergonomia touch.
4. Em fluxos críticos, a referência visual não pode introduzir regressão comportamental.
5. Não replique nomes de marca, logos proprietários, copy, ilustrações ou identidade visual de forma literal.
6. Use referências externas como linguagem visual, não como template de clonagem.

## Workflow Recomendado

### 1. Definir o contexto local

Antes de buscar referência externa, identificar:

- superfície alvo (`restaurante-app`, `restaurante-web`, `restaurante-site` ou `restaurante-ops`)
- tipo de tela (dashboard, landing, checkout, admin, cardápio, auth)
- restrições de stack e design system existentes

### 2. Escolher a referência correta

Mapeie o pedido para uma categoria da coleção `awesome-design-md`.

Exemplos úteis:

- dashboard operacional: `Linear`, `Sentry`, `PostHog`, `Stripe`
- SaaS clean/editorial: `Notion`, `Intercom`, `Cal.com`
- ecommerce/retail: `Shopify`, `Nike`, `Starbucks`
- docs/devtools: `Vercel`, `Mintlify`, `HashiCorp`, `MongoDB`

### 3. Capturar a referência

Se o pedido exigir uso efetivo da referência:

1. abrir o índice do repositório ou o catálogo `getdesign.md`
2. localizar o `DESIGN.md` mais apropriado
3. extrair apenas os elementos úteis:
   - atmosfera visual
   - paleta e papéis semânticos
   - tipografia
   - linguagem de componentes
   - princípios de layout
   - do's/don'ts

### 4. Converter para o padrão local

Persistir a síntese no padrão do projeto quando fizer sentido:

- `docs/design-system/MASTER.md`
- `docs/design-system/pages/<page>.md`

Ao implementar UI:

- preferir `src/ui/` e tokens existentes
- introduzir novas variações de token apenas quando necessário
- manter paridade app/web quando a superfície for espelhada

### 5. Validar

Antes de concluir:

- checar contraste e foco
- validar mobile e desktop
- confirmar que a estética escolhida não prejudica legibilidade nem fluxo operacional

## Estratégia de Combinação com Skills Existentes

### Com `restaurante-supabase`

Use primeiro para obter restrições de domínio, arquitetura e rollout.

### Com `ui-ux-pro-max`

Use `awesome-design-md` para benchmark visual e `ui-ux-pro-max` para transformar a referência em decisões práticas de layout, cor, tipografia e implementação.

Ordem recomendada:

1. `restaurante-supabase`
2. `awesome-design-md`
3. `ui-ux-pro-max`

## Padrão de Saída Esperado

Quando esta skill for usada numa tarefa de design, a resposta deve incluir:

1. referência escolhida e por quê
2. elementos aproveitados da referência
3. adaptações necessárias para este projeto
4. riscos de excesso de similaridade ou regressão visual
5. plano de implementação em tokens/componentes locais

## Exemplos de Uso

- "Use awesome-design-md para propor uma nova landing do restaurante-site inspirada em Shopify, mas adaptada ao nosso design system."
- "Escolha uma referência do getdesign.md para modernizar o admin do restaurante-ops sem perder legibilidade operacional."
- "Crie um DESIGN.md base para o restaurante-web a partir de duas referências da coleção e salve em docs/design-system/MASTER.md."
