# RestaurantOS — Figma Code Connect Guide

> Integracao de apoio via Figma CLI + arquivos .figma.ts (opcional no fluxo sem custo).

## Escopo Oficial Sem Custo

- Fluxo oficial: Storybook publico + node map versionado + CI + smoke.
- Publish Code Connect write: opcional e fora de escopo por decisao de custo.
- Parse local: permitido para checagem estrutural de arquivos .figma.ts.

## Alternativa Sem Code Connect Publish (Dev Mode Resources)

Se voce quer usar Dev Mode sem publicar snippets via Code Connect, use links de Dev Resource por node.

### O que aparece no Figma

- Links de desenvolvimento no Dev Mode (ex.: Storybook Docs, Code Path)
- Nao aparece snippet nativo de codigo do Code Connect

### Componentes da solucao no repositorio

- Plugin Figma local: `scripts/figma-dev-resources-plugin/`
    - `manifest.json`
    - `code.js`
    - `ui.html`
- Exportador de payload: `scripts/export-figma-dev-resources-payload.mjs`
- Payload gerado: `docs/design-system/figma-dev-resources.payload.json`

### Passo a passo rapido

1. Gerar payload do projeto web:

```bash
cd restaurante-web
npm run figma:dev-resources:payload
```

Opcional (recomendado): rodar preflight completo antes do plugin.

```bash
cd restaurante-web
npm run figma:dev-resources:preflight
```

Observacao: quando dois componentes apontam intencionalmente para o mesmo frame/node Figma,
registre a excecao em `docs/design-system/figma-dev-resources.shared-node-allowlist.json`.
O preflight falha se houver node compartilhado sem allowlist, mismatch da allowlist ou allowlist orfa.

2. No Figma Desktop: `Plugins -> Development -> Import plugin from manifest...`

3. Selecione o arquivo:

```text
scripts/figma-dev-resources-plugin/manifest.json
```

4. Abra o plugin e cole o conteudo de:

```text
docs/design-system/figma-dev-resources.payload.json
```

5. Rode primeiro em `Dry run`, depois desmarque e execute em modo escrita.

6. Abra um node mapeado em Dev Mode e confirme os links adicionados.

### Flags uteis do exportador

```bash
# apenas simulacao
node scripts/export-figma-dev-resources-payload.mjs --project restaurante-web --dry-run

# incluir entradas inativas
node scripts/export-figma-dev-resources-payload.mjs --project restaurante-web --include-inactive
```

### Observacao sobre permissao de API/MCP

- Validar node por API (MCP Figma) pode falhar com `403` se o token nao tiver acesso ao arquivo Figma.
- Isso nao impede o uso do plugin local no Figma Desktop, desde que sua conta tenha acesso normal ao arquivo aberto.

## Status Atual

| Projeto | figma.config.json | .figma.ts files | Scripts npm | .env.local |
|---|---|---|---|---|
| restaurante-app | ✅ | ✅ Button, Card, Badge, FormInput, ProductCard | ✅ | ✅ criado |
| restaurante-web | ✅ | ✅ Button, Card, Badge, FormInput, ProductCard | ✅ | ✅ existente |
| restaurante-site | ✅ | ✅ Button, Card | ✅ | ❌ vazio |

## Arquivos .figma.ts criados

| Componente | App | Web | Site | Figma Node ID |
|---|---|---|---|---|
| Button | ✅ | ✅ | ✅ | `1:1` (placeholder) |
| Card | ✅ | ✅ | ✅ | `2:1` (placeholder) |
| Badge | ✅ | ✅ | — | `3:1` (placeholder) |
| FormInput | ✅ | ✅ | — | `4:1` (placeholder) |
| ProductCard | ✅ | ✅ | — | `5:1` (placeholder) |

## Setup

### 1. Configurar variáveis

O `FIGMA_TOKEN` já existe em `restaurante-web/.env.local`. Copie o **mesmo token** para:

```
restaurante-app/.env.local
restaurante-site/.env.local   (se necessário)
```

O `FIGMA_FILE_KEY` precisa ser preenchido com o ID do arquivo Figma que você criar.

### 2. Criar componentes no Figma

No seu arquivo Figma, crie os componentes com **exactamente** estas propriedades:

#### Button
| Property | Type | Values |
|---|---|---|
| Label | Text | — |
| Variant | Variant | Primary, Secondary, Ghost, Danger |
| Size | Variant | Small, Medium, Large |
| State | Variant | Default, Disabled, Loading |

#### Card
| Property | Type | Values |
|---|---|---|
| Elevation | Variant | None, Low, Medium, High |
| Padding | Variant | None, Small, Medium, Large |

#### Badge
| Property | Type | Values |
|---|---|---|
| Label | Text | — |
| Variant | Variant | Success, Warning, Error, Info, Neutral |
| WithDot | Boolean | true/false |

#### FormInput
| Property | Type | Values |
|---|---|---|
| Label | Text | — |
| Placeholder | Text | — |
| State | Variant | Default, Focus, Error, Disabled |
| WithIcon | Boolean | true/false |
| IconName | Text | ionicon name |
| HelperText | Text | — |

#### ProductCard
| Property | Type | Values |
|---|---|---|
| Name | Text | — |
| Price | Text | — |
| Image | Image | — |
| HasAdd | Boolean | true/false |

### 3. Conectar node IDs

Depois de criar cada componente no Figma:

1. Selecione o componente no canvas
2. Right-click → **Copy/Paste as** → **Copy link**
3. Extraia o `node-id` da URL (ex: `node-id=123-456`)
4. Atualize o `.figma.ts` correspondente com o node ID real

Exemplo:
```ts
// Antes (placeholder)
figma.connect('https://figma.com/design/{FILE_KEY}/...?node-id=1:1', {

// Depois (real)
figma.connect('https://figma.com/design/abc123xyz/...?node-id=1234-5678', {
```

## Comandos

### Por projeto

```bash
cd restaurante-app     # ou restaurante-web, restaurante-site

npm run figma:help         # Ajuda do CLI
npm run figma:parse        # Parse + dry run (valida sem publicar)
npm run figma:publish:dry  # Opcional (fora do escopo oficial sem custo)
```

### Publish real (opcional)

```bash
cd restaurante-app
npx figma connect publish --token $FIGMA_TOKEN -c figma.config.json
```

### Batch (todos os projetos)

```bash
# PowerShell
scripts\figma-run.bat parse
scripts\figma-run.bat publish
```

## Troubleshooting

### "Token not found"
- Verifique se `FIGMA_TOKEN` está em `.env.local` do projeto
- Ou passe via CLI: `--token figd_xxxx`

### "File key not found"
- Verifique se `FIGMA_FILE_KEY` está em `.env.local`
- Ou atualize a URL no `.figma.connect()` com o file key real

### "Node not found"
- O node ID no `.figma.connect()` não existe no arquivo Figma
- Re-copy o link do componente no Figma e extraia o node-id correto

### "Property X not found"
- O componente Figma não tem a propriedade esperada pelo `.figma.ts`
- Crie a propriedade no componente Figma com o **nome exato** (case-sensitive)

## Estrutura de Pastas

```
restaurante-app/
├── figma.config.json          # Config do Code Connect
├── .env.local                 # FIGMA_TOKEN + FIGMA_FILE_KEY
└── src/ui/
    ├── Button.figma.ts        # Button → Figma
    ├── Card.figma.ts          # Card → Figma
    ├── Badge.figma.ts         # Badge → Figma
    ├── FormInput.figma.ts     # FormInput → Figma
    └── ProductCard.figma.ts   # ProductCard → Figma

restaurante-web/               # (mesma estrutura)
restaurante-site/
├── figma.config.json
└── src/components/
    ├── Button.figma.ts
    └── Card.figma.ts
```

## Próximos Passos

1. [ ] Criar componentes no Figma com propriedades listadas acima
2. [ ] Atualizar node IDs nos `.figma.ts`
3. [x] Rodar `npm run figma:parse` em cada projeto
4. [x] Manter Storybook publico + node map + CI + smoke como fonte oficial
5. [ ] Rodar `npm run figma:publish:dry` apenas se o time optar por validar Code Connect write
6. [ ] Rodar `npx figma connect publish --token $FIGMA_TOKEN` apenas se houver decisao de usar plano com write
7. [ ] Criar `.figma.ts` para componentes restantes (Navbar, Sidebar, Table, Modal, etc.)
