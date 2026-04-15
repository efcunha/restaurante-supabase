# Figma 1:1 Roundtrip - Formularios restaurante-web

Objetivo: manter 29 formularios com visual 1:1 entre navegador (Storybook) e Figma, com fluxo automatizado de ida e volta.

## Politica oficial (sem custo)

- Fluxo oficial para este repositorio: sem Code Connect publish e sem dependencia obrigatoria de API do Figma.
- Caminho recomendado: exportar PNG do Figma localmente e importar no projeto com script local.
- Fluxo por API do Figma continua disponivel apenas como opcional, quando houver token com permissao.

## O que foi automatizado

- Export 1:1 do Storybook para PNG por formulario:
  - comando: `npm run forms:1to1:storybook:export`
  - saida: `docs/design-system/figma-1to1/storybook/*.png`
  - manifest: `docs/design-system/figma-1to1/storybook.manifest.json`

- Pull 1:1 do Figma para PNG por formulario (apos mapear node ids):
  - comando: `npm run forms:1to1:figma:pull`
  - saida: `docs/design-system/figma-1to1/figma/*.png`
  - manifest: `docs/design-system/figma-1to1/figma.manifest.json`

- Import local de PNG exportado manualmente do Figma (sem token):
  - comando: `npm run forms:1to1:figma:import-local`
  - entrada padrao: `docs/design-system/figma-1to1/inbox/*.png`
  - saida: `docs/design-system/figma-1to1/figma/*.png`
  - manifest: `docs/design-system/figma-1to1/figma.manifest.json`

- Autolink de node IDs no config (quando nomes dos frames no Figma batem com os nomes dos formularios):
  - comando: `npm run forms:1to1:figma:autolink`

- Roundtrip completo em um comando:
  - `npm run forms:1to1:roundtrip`

- Bootstrap 1:1 imediato (igual ao Storybook):
  - `npm run forms:1to1:roundtrip:seed`
  - resultado: copia os 29 PNGs do Storybook para `figma-1to1/inbox` e `figma-1to1/figma`

- Roundtrip por API (opcional):
  - `npm run forms:1to1:roundtrip:api`

## Configuracao obrigatoria

Arquivo: `restaurante-web/scripts/forms-1to1.config.json`

Campos:
- `figmaFileKey`: key do arquivo Figma
- `forms[].storyId`: id da story real
- `forms[].figmaNodeId`: node-id do frame 1:1 no Figma (ex: `123:456`)

No estado atual, os `figmaNodeId` estao vazios para voce preencher uma unica vez.

## Como criar telas 1:1 no Figma (operacional)

Opcao rapida para base inicial 1:1:
1. Rode `npm run forms:1to1:roundtrip:seed`.
2. Abra `docs/design-system/figma-1to1/inbox/` e importe os 29 PNGs em lote no Figma.
3. Isso cria uma base visual identica ao Storybook para iniciar ajustes no Figma.

1. Rode `npm run forms:1to1:storybook:export`.
2. No Figma, crie uma pagina `Formularios 1to1`.
3. Arraste os PNGs de `docs/design-system/figma-1to1/storybook/` para o canvas.
4. Converta cada imagem em frame nomeado com o nome do formulario.
5. Exporte os frames atualizados do Figma como PNG e salve em `docs/design-system/figma-1to1/inbox/`.
6. Rode `npm run forms:1to1:figma:import-local` para sincronizar com o projeto.

Opcional (somente quando houver token e permissao de API):
1. Rode `npm run forms:1to1:figma:autolink` para preencher automaticamente os `figmaNodeId` quando houver match unico.
2. Se algum formulario ficar sem match, copie manualmente apenas os `node-id` faltantes.
3. Rode `npm run forms:1to1:figma:pull` para baixar os PNGs via API.

## Como atualizar o projeto quando mudar no Figma

1. Altere o frame 1:1 no Figma.
2. Exporte PNG no Figma para `docs/design-system/figma-1to1/inbox/`.
3. Rode `npm run forms:1to1:figma:import-local`.
4. Commit dos PNGs em `docs/design-system/figma-1to1/figma/` para versionar a mudanca visual.
5. Compare com `docs/design-system/figma-1to1/storybook/` e aplique ajuste de codigo na tela/story correspondente.

Opcional por API (se habilitado):
1. Altere o frame no Figma.
2. Rode `npm run forms:1to1:figma:pull`.
3. Commit dos PNGs em `docs/design-system/figma-1to1/figma/` para versionar a mudanca visual.
4. Compare com `docs/design-system/figma-1to1/storybook/` e aplique ajuste de codigo na tela/story correspondente.

## Variaveis de ambiente

- `FIGMA_ACCESS_TOKEN`: obrigatoria somente para o fluxo opcional por API (`figma:autolink` e `figma:pull`).
- `FIGMA_LOCAL_EXPORT_DIR`: opcional para alterar a pasta de entrada do import local.
- `STORYBOOK_PUBLIC_BASE_URL`: opcional, default `https://restaurante-web-storybook-production.up.railway.app`.
- `FORMS_1TO1_WIDTH`: opcional, default `1440`.
- `FORMS_1TO1_HEIGHT`: opcional, default `2200`.

## Limitacao tecnica importante

Com a API atual do Figma, nao existe geracao confiavel de codigo React Native Web 1:1 para telas arbitrarias sem um contrato de componentes.

O fluxo implementado resolve a automacao visual 1:1 (ida e volta) e versionamento; a atualizacao de codigo continua automatizavel por etapa de diff/implementacao no repositorio.
