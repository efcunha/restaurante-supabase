# MASTER Design System

## Objetivo

Este documento define a direção visual global do ecossistema `restaurante-supabase`.

Ele serve como fonte de verdade para decisões de UI em:

- `restaurante-app`
- `restaurante-web`
- `restaurante-site`
- `restaurante-ops`

Este `MASTER.md` deve orientar novas telas, refactors visuais e futuras páginas específicas em `docs/design-system/pages/`.

## Referências Externas Utilizadas

Este sistema foi sintetizado a partir de duas referências do catálogo `awesome-design-md` / `getdesign.md`:

### 1. Starbucks

Usado como referência para:

- sensação de hospitalidade
- superfícies claras e quentes
- linguagem de ordering e retail
- CTAs arredondados e amigáveis
- clareza em cards de produto, formulário e jornada de compra

### 2. Linear

Usado como referência para:

- precisão operacional
- escaneabilidade de dashboards e listas
- densidade controlada de informação
- hierarquia textual limpa
- feedback de estado, filtros, chips e painéis administrativos

## Regra de Adaptação

As referências acima não devem ser copiadas literalmente.

Aplicar somente:

- linguagem visual
- princípios de composição
- ritmo de layout
- comportamento de componentes

Não replicar:

- logos
- naming de marcas
- copy
- ilustrações proprietárias
- identidade cromática literal sem adaptação ao projeto

## Posicionamento Visual do Produto

O projeto deve parecer:

- confiável para operação diária
- acolhedor para contextos de atendimento e venda
- rápido de escanear sob pressão operacional
- moderno sem cair em estética genérica de SaaS escuro

Resumo visual:

- base clara e neutra
- verde como eixo de marca e confirmação
- superfícies administrativas mais densas, mas ainda legíveis
- destaque por contraste e hierarquia, não por excesso de efeitos

## Princípios de Design

### 1. Hospitalidade com disciplina

Interfaces de venda, cardápio e atendimento devem transmitir calor humano, sem perder objetividade.

### 2. Operação primeiro

No admin e em fluxos críticos, legibilidade e velocidade de decisão valem mais do que ornamentação.

### 3. Familiaridade entre superfícies

App e web devem compartilhar a mesma linguagem base. Diferenças de layout podem existir, mas cor, tipografia, espaçamento e feedbacks devem soar como o mesmo produto.

### 4. Destaque com parcimônia

Usar o verde de marca para ação e confirmação. Evitar múltiplas cores de destaque concorrendo entre si.

### 5. Densidade progressiva

Telas públicas e de ordering podem respirar mais. Telas operacionais podem ser mais compactas, desde que preservem contraste, foco e alvos de toque adequados.

## Tokens Locais como Fonte de Verdade

Toda implementação deve partir de:

- `@restaurante/tokens`
- `restaurante-web/src/design-system/tokens.ts`
- `src/ui/` e componentes compartilhados

Nunca hardcodar valores visuais novos diretamente na interface sem antes avaliar se devem virar token.

## Paleta Base

### Marca

Usar a família `brand` existente como eixo principal:

| Papel              | Token              | Valor atual |
| ------------------ | ------------------ | ----------- |
| Brand subtle bg    | `colors.brand.50`  | `#eef9f1`   |
| Brand soft bg      | `colors.brand.100` | `#d4f1dc`   |
| Brand default      | `colors.brand.500` | `#2e9f4d`   |
| Brand strong       | `colors.brand.600` | `#227d3d`   |
| Brand pressed      | `colors.brand.700` | `#1c6233`   |
| Brand deep surface | `colors.brand.800` | `#184f2b`   |

### Neutros

Usar `neutral` como base estrutural de toda UI:

| Papel            | Token                | Valor atual |
| ---------------- | -------------------- | ----------- |
| App canvas       | `colors.neutral.50`  | `#f8f9fa`   |
| Secondary canvas | `colors.neutral.100` | `#eef1f4`   |
| Border soft      | `colors.neutral.200` | `#dde3ea`   |
| Border default   | `colors.neutral.300` | `#c5ced9`   |
| Muted text       | `colors.neutral.500` | `#6f8299`   |
| Secondary text   | `colors.neutral.700` | `#38495f`   |
| Primary text     | `colors.neutral.900` | `#162230`   |
| Surface white    | `colors.neutral.0`   | `#ffffff`   |

### Semânticos

Preservar o conjunto existente:

| Papel   | Token            | Valor atual |
| ------- | ---------------- | ----------- |
| Success | `colors.success` | `#16a34a`   |
| Warning | `colors.warning` | `#d97706`   |
| Danger  | `colors.danger`  | `#dc2626`   |
| Info    | `colors.info`    | `#0284c7`   |

## Regras de Cor

1. Verde é a cor principal de ação, progresso e confirmação.
2. Vermelho aparece apenas em erro, risco e destruição.
3. Laranja é reservado para alerta e atenção operacional.
4. Azul informativo deve aparecer como apoio, não como eixo estético.
5. Evitar interfaces com muitos blocos saturados simultaneamente.
6. Evitar acento roxo como linguagem dominante deste produto.

## Atmosfera por Superfície

### Ordering, cardápio e experiência pública

- base clara
- sensação calorosa
- cards respiráveis
- CTAs visíveis e amigáveis
- hierarquia simples entre produto, preço, adicionais e ação

### Backoffice e operação

- base neutra mais fria
- contraste mais firme entre superfície e painel
- tabelas, listas e chips com leitura rápida
- destaques menores e mais precisos
- menos blocos hero, mais blocos utilitários

### Marketing e landing pages

- narrativa mais emocional que o admin
- uso pontual de áreas verdes e blocos de contraste
- tipografia com mais presença, mas sem perder sobriedade
- imagens devem complementar a mensagem, não carregar a interface sozinhas

## Tipografia

### Direção

Seguir uma tipografia sans limpa, pragmática e contemporânea.

Princípio:

- hospitalidade no tom
- precisão na composição

Enquanto não houver troca oficial de fonte, respeitar os tokens existentes e a pilha atual do projeto.

### Escala recomendada

Basear a implementação em `fontSizes`, `fontWeights`, `lineHeights` e presets já existentes.

Hierarquia sugerida:

| Papel       | Uso                                           |
| ----------- | --------------------------------------------- |
| `headingXL` | hero, dashboards principais, cabeçalhos-chave |
| `headingL`  | seções principais                             |
| `headingM`  | subtítulos, cards destacados                  |
| `body`      | texto padrão                                  |
| `small`     | metadata, suporte, hint                       |
| `button`    | botões e chips acionáveis                     |

### Regras tipográficas

1. Títulos curtos e claros.
2. Corpo de texto com boa altura de linha e contraste alto.
3. Metadados devem ser discretos, mas legíveis.
4. Evitar variação excessiva de pesos e tamanhos na mesma tela.
5. Em telas operacionais, priorizar consistência e alinhamento acima de expressividade.

## Espaçamento

Seguir a grade de 4px já existente.

Tokens-base:

- `spacing.1` = 4
- `spacing.2` = 8
- `spacing.3` = 12
- `spacing.4` = 16
- `spacing.5` = 20
- `spacing.6` = 24
- `spacing.8` = 32
- `spacing.10` = 40
- `spacing.12` = 48
- `spacing.16` = 64

Regras:

1. `16px` é o ritmo padrão entre elementos relacionados.
2. `24px` ou `32px` devem separar blocos de seção.
3. Em telas compactas, reduzir densidade com critério, sem colar elementos.
4. Em listas operacionais, manter alinhamento rígido e espaçamento previsível.

## Bordas, Radius e Forma

O produto deve equilibrar acolhimento e precisão.

Usar:

- `borderRadius.sm` e `md` para inputs, chips e pequenos controles
- `borderRadius.lg` para cards padrão
- `borderRadius.xl` para modais, painéis destacados e blocos hero
- `borderRadius.full` para pills, badges e CTAs específicos

Diretriz geral:

- ordering e marketing aceitam formas mais suaves
- admin privilegia `md` e `lg` com aparência mais técnica

## Sombras e Profundidade

Sombras devem ser sutis e raras.

Usar:

- `shadows.sm` para cartões leves
- `shadows.md` para painéis e dropdowns
- `shadows.lg` somente em modais, drawers e elementos flutuantes prioritários

Evitar:

- sombras pesadas
- blur excessivo
- elevação ornamental sem função de hierarquia

## Componentes

### Botões

Direção:

- primário com `brand.500/600`
- secundário com contorno neutro ou fundo claro
- ghost para ações contextuais
- destrutivo explícito apenas quando necessário

Regras:

1. Botões principais devem ser fáceis de localizar em até 1 segundo.
2. Botões lado a lado precisam de hierarquia inequívoca.
3. Não usar múltiplos primários disputando atenção no mesmo bloco.
4. Altura de toque deve mirar `44px+` em mobile.

### Cards

Cards são a unidade principal do produto.

Direção:

- fundo claro
- borda suave
- radius `lg`
- sombra discreta ou nenhuma, dependendo da densidade da tela

Cards podem ser:

- informativos
- clicáveis
- operacionais com status
- agrupadores de formulário

### Inputs e formulários

Direção:

- estrutura limpa
- labels estáveis
- feedback de foco evidente
- validação sem ruído visual excessivo

Regras:

1. Foco deve aparecer com contraste claro.
2. Estados de erro devem combinar cor e texto, nunca cor sozinha.
3. Campos relacionados devem ser agrupados visualmente.
4. Em mobile, evitar layouts de formulário densos demais.

### Tabelas, listas e chips operacionais

Inspirar-se mais na disciplina do `Linear` do que em páginas de marketing.

Direção:

- cabeçalhos claros
- linhas com separação sutil
- chips curtos e facilmente comparáveis
- ênfase por estado e alinhamento, não por decoração

## Layout

### Padrão geral

1. Cabeçalho claro com contexto da tela.
2. Conteúdo organizado em blocos previsíveis.
3. Ação principal sempre visível ou facilmente reencontrável.
4. Feedback operacional próximo ao local da ação.

### Densidade por dispositivo

#### Mobile

- pilha vertical
- CTAs acessíveis pelo polegar
- cards mais respiráveis
- formulários em uma coluna

#### Tablet e desktop

- grids mais densos
- sidebar quando houver benefício real
- painéis paralelos apenas quando reduzirem navegação

## Responsividade

Respeitar os breakpoints do sistema:

- `sm: 640`
- `md: 768`
- `lg: 1024`
- `xl: 1280`

Regras:

1. Nenhuma tela crítica deve depender de hover para ser utilizável.
2. Menus, filtros e ações devem continuar acessíveis por teclado e toque.
3. Informações densas devem colapsar por prioridade, não de forma arbitrária.
4. Em tabelas, preferir adaptação por cards ou linhas expandidas quando necessário.

## Acessibilidade

Obrigatório:

1. Contraste AA mínimo para texto normal.
2. Indicadores de foco visíveis.
3. Estados não comunicados apenas por cor.
4. Alvos de toque adequados em mobile.
5. Ordem visual coerente com ordem semântica.

Usar também as regras de `colorUsageRules` existentes em `restaurante-web/src/design-system/tokens.ts`.

## Do's

- usar verdes e neutros do sistema existente
- manter superfícies claras e limpas na maior parte do produto
- usar cards e seções com agrupamento evidente
- tratar o admin como ferramenta de alta legibilidade
- introduzir calor visual nos fluxos de atendimento e venda
- transformar qualquer nova decisão visual em token quando ela se repetir

## Don'ts

- não introduzir paleta paralela sem necessidade
- não copiar Starbucks ou Linear literalmente
- não usar roxo como acento principal do produto
- não aplicar glassmorphism pesado, blur decorativo ou gradientes genéricos por padrão
- não usar sombras profundas em toda a interface
- não sacrificar legibilidade para parecer mais “premium”

## Estratégia de Implementação

Ao implementar novas superfícies:

1. partir deste `MASTER.md`
2. verificar se a tela precisa de override em `docs/design-system/pages/<page>.md`
3. mapear a UI para tokens existentes
4. adicionar ou ajustar tokens compartilhados antes de hardcodar estilo local
5. usar `src/ui/` e exports estáveis sempre que possível

## Próximos Overrides Recomendados

Páginas candidatas para overrides específicos:

- `docs/design-system/pages/admin-dashboard.md`
- `docs/design-system/pages/public-menu.md`
- `docs/design-system/pages/checkout.md`
- `docs/design-system/pages/auth.md`

## Resumo Executivo

Este design system deve combinar:

- o acolhimento e a clareza comercial de experiências de hospitality/retail
- a precisão e a disciplina visual de ferramentas operacionais modernas

Resultado esperado:

- interfaces amigáveis para atendimento
- dashboards legíveis sob pressão
- aparência contemporânea sem cair em clonagem visual ou tendências descartáveis
