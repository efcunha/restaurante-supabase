# Modernização do Monorepo Restaurante Supabase

**Data:** 2026-04-16  
**Status:** ✅ Completo

## Resumo Executivo

O monorepo foi modernizado com infraestrutura de workspace profissional:

- **pnpm 10.33** + **Turborepo 2.9.6** para orquestração de tarefas
- **4 packages compartilhados** (`@restaurante/ui`, `@restaurante/tokens`, `@restaurante/schemas`, `@restaurante/config`)
- **React Hook Form 7.x + Zod 4.x** para formulários type-safe
- **NativeWind 4.2** para estilo com Tailwind em RN/Expo
- **Storybook 8.6** configurado no root para documentação de UI
- **Husky 9.1 + lint-staged + commitlint** para git hooks
- **TypeScript strict mode** com aliases calibrados

## Estrutura Final

```
restaurante-supabase/
├── .storybook/
│   ├── main.ts              # Config Vite+React, aliases para packages
│   ├── preview.ts
│   └── stories/             # 5 stories: Button, Input, Forms, Product, Checkout
├── packages/
│   ├── ui/                  # @restaurante/ui - Componentes RN/React
│   │   ├── src/
│   │   │   ├── components/  # Button, Input, Card, Modal, Badge, Loader
│   │   │   ├── forms/       # LoginForm, CadastroForm, CheckoutForm, EnderecoForm (RHF+Zod)
│   │   │   └── index.ts
│   │   └── tsconfig.json    # Paths para @restaurante/* resolvem corretamente
│   ├── tokens/              # @restaurante/tokens - Design tokens
│   │   ├── src/
│   │   │   ├── index.ts     # colors, spacing, radius, typography, shadow, breakpoints
│   │   │   └── tailwind-preset.cjs  # Preset Tailwind sem imports TS
│   │   └── tsconfig.json
│   ├── schemas/             # @restaurante/schemas - Zod schemas
│   │   ├── src/
│   │   │   ├── forms.ts     # loginSchema, cadastroSchema, checkoutSchema, enderecoSchema
│   │   │   └── index.ts
│   │   └── tsconfig.json
│   └── config/              # @restaurante/config - Configurações globais
│       ├── src/
│       │   ├── supabase.ts  # createSupabasePublicClient factory
│       │   └── index.ts
│       └── tsconfig.json
├── restaurante-app/         # React Native Expo (mobile)
│   ├── tsconfig.json        # Aliases: @/*, @restaurante/*
│   ├── babel.config.js      # module-resolver + nativewind/babel
│   ├── metro.config.js      # withNativeWind
│   ├── tailwind.config.js   # Preset @restaurante/tokens
│   ├── global.css           # Tailwind directives
│   └── src/
├── restaurante-web/         # React Expo (web)
│   ├── tsconfig.json        # Idem app
│   ├── babel.config.js      # Idem app
│   ├── metro.config.js      # Idem app
│   ├── tailwind.config.js   # Idem app
│   ├── global.css           # Idem app
│   └── src/
├── restaurante-ops/         # Node.js SaaS operations
├── restaurante-site/        # Next.js site
├── balanca-bridge/          # Bridge para balança
├── package.json             # Root: turbo, storybook, husky, @storybook/react, react-native-web
├── tsconfig.base.json       # Base com strict mode
├── pnpm-workspace.yaml      # Define packages/ + app/web/ops/site/bridge
├── turbo.json               # Tasks: dev, build, lint, type-check
├── .prettierrc.json         # Formatação
├── commitlint.config.cjs    # Commit lint
└── .husky/                  # Git hooks
    ├── pre-commit           # lint-staged
    └── commit-msg           # commitlint
```

## Implementação Detalhada

### 1. Workspace Root & pnpm Workspaces

- **package.json root** com devDependencies compartilhadas (turbo, storybook, husky, prettier)
- **pnpm-workspace.yaml** define `restaurante-app`, `restaurante-web`, `restaurante-ops`, `restaurante-site`, `balanca-bridge`, `packages/*`
- Scripts raiz: `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm format`

### 2. Packages Compartilhados

#### `packages/tokens` — Design Tokens

- `colors`: primária, secundária, success, danger, neutral
- `spacing`: 4px a 64px em steps de 4
- `radius`, `typography`, `shadow`, `breakpoints`
- **Tailwind preset** hardcoded (sem importação TS) para evitar ESM/CJS mismatch

#### `packages/schemas` — Zod Schemas

- `loginSchema`: email, senha
- `cadastroSchema`: name, email, password, confirmPassword, phone
- `checkoutSchema`: items, total, paymentMethod
- `enderecoSchema`: rua, numero, complemento, bairro, cidade, estado, cep
- Re-exporta tudo em `index.ts` para uso simplificado

#### `packages/ui` — Componentes & Formas

**Componentes:**

- `Button`: Pressable com variantes (primary/secondary/danger), loading state, disabled
- `Input`: TextInput com label, erro, secureTextEntry, placeholder
- `Card`: View com border/radius/padding dos tokens
- `Modal`: Modal nativo com overlay, dimissível
- `Badge`: Badges com 4 tones (neutral/success/warning/danger)
- `Loader`: ActivityIndicator centralizado

**Formulários (React Hook Form 7.x + Zod):**

- `LoginForm`: email, senha com validação
- `CadastroForm`: cadastro completo
- `CheckoutForm`: formulário de pagamento
- `EnderecoForm`: endereço com 7 campos

#### `packages/config` — Configurações

- `createSupabasePublicClient()`: Factory para cliente Supabase público com validação de env
- `getSingletonSupabasePublicClient()`: Singleton para garantir instância única

### 3. Integração em Apps (restaurante-app & restaurante-web)

#### tsconfig.json

```json
{
  "baseUrl": ".",
  "paths": {
    "@/*": ["src/*"],
    "@restaurante/ui": ["../packages/ui/src"],
    "@restaurante/tokens": ["../packages/tokens/src"],
    "@restaurante/schemas": ["../packages/schemas/src"],
    "@restaurante/config": ["../packages/config/src"]
  }
}
```

#### babel.config.js

- `babel-plugin-module-resolver` para resolver aliases
- `nativewind/babel` plugin (antes de `react-native-reanimated/plugin`)

#### metro.config.js

- `withNativeWind(config, { input: './global.css' })`

#### global.css

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

#### tailwind.config.js

```js
module.exports = {
  presets: [require('@restaurante/tokens/src/tailwind-preset.cjs')],
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
};
```

### 4. Storybook no Root

#### .storybook/main.ts

- Framework: `@storybook/react-vite`
- Stories glob: `./stories/**/*.stories.tsx` (relativo ao `.storybook/`)
- Aliases: `react-native` → `react-native-web`, + monorepo packages
- **Crucial:** Preserva `baseConfig.resolve?.alias` ao adicionar aliases customizados

#### Dependências Root

- `@storybook/react@^8.6.18` (peer do `@storybook/react-vite`)
- `react-native-web@^0.21.2` (necessário para resolver `react-native` imports no build Vite)

### 5. Git Hooks & Qualidade

#### Husky 9.1

- `.husky/pre-commit`: Executa `pnpm lint-staged`
- `.husky/commit-msg`: Valida com `commitlint`

#### lint-staged

```json
{
  "*.{js,jsx,ts,tsx}": ["pnpm -r lint", "pnpm -r type-check"],
  "*.{json,md,yml,yaml}": ["prettier --write"]
}
```

#### commitlint.config.cjs

- Extends `@commitlint/config-conventional`
- Garante commits com estrutura: `<type>(<scope>): <subject>`

## Validações Executadas

### TypeScript

- ✅ `restaurante-app`: 11 erros pré-existentes (Figma connectors, ARIA roles, BatchOperationHelper — não introduzidos pela modernização)
- ✅ `restaurante-web`: 1 erro pré-existente (BatchOperationHelper — não relacionado)
- ✅ `packages/ui`, `packages/tokens`, `packages/schemas`, `packages/config`: Sem erros de tipo

### Storybook

- ✅ Build (`CI=1 npx storybook build`): `EXIT:0`
- ✅ Dev server (`npx storybook dev -p 6006`): Inicia em 405ms, manager em 165ms, preview em 405ms
- ✅ Stories encontradas e compiladas: 5 stories base (Button, Input, FormStates, ProductCard, CheckoutComponents)

### Smoke Tests

- ✅ `pnpm install`: 1823 pacotes, 0 new errors
- ✅ Husky prepare: Configurado
- ✅ Postinstall scripts: Patches app/web aplicados

## Como Usar

### Desenvolvimento

```bash
# Instalar dependências
pnpm install

# Rodar todos os projetos em dev (turbo mode)
pnpm dev

# Turbo com filter para apenas apps
pnpm dev -- --filter="restaurante-app" --filter="restaurante-web"

# Storybook
pnpm storybook:web  # Abre em localhost:6006

# Type-check global
pnpm typecheck

# Lint global
pnpm lint

# Format
pnpm format
```

### Usar Packages Compartilhados

```typescript
// Button component
import { Button } from '@restaurante/ui';

// Design tokens
import { colors, spacing } from '@restaurante/tokens';

// Schemas
import { loginSchema } from '@restaurante/schemas';

// Config
import { createSupabasePublicClient } from '@restaurante/config';

// Aliases locais
import { MyLocalComponent } from '@/components/MyLocalComponent';
```

### Adicionar Componente Novo a `packages/ui`

1. Criar `packages/ui/src/components/MyComponent.tsx`
2. Re-exportar em `packages/ui/src/index.ts`
3. Adicionar story em `.storybook/stories/MyComponent.stories.tsx`
4. Re-exporta automáticamente em apps via alias `@restaurante/ui`

### Adicionar Schema Novo a `packages/schemas`

1. Criar schema em `packages/schemas/src/forms.ts`
2. Re-exportar em `packages/schemas/src/index.ts`
3. Usar em forms com `@restaurante/schemas`

## Decisões de Arquitetura

### Por que pnpm + Turborepo?

- **pnpm**: Workspace native, economia de disco com link simbólico, hoisting explícito
- **Turborepo**: Task orchestration, caching, parallel execution, task dependencies

### Por que packages no root e não dentro de apps?

- Reutilização entre `restaurante-app` e `restaurante-web`
- Isolamento de domínio (UI, schemas, tokens, config são domínios independentes)
- Facilita versionamento e CI/CD futuro (package versioning)

### Por que NativeWind no monorepo?

- Tokens centralizados via Tailwind
- Mesmo design system para app e web
- DX melhorada: Tailwind className intellisense em ambos

### Por que Storybook no root?

- UI library única, stories em um lugar
- Snapshots e visual regression testing centralizados
- Deploy de docs uma única vez

### Por que Zod + React Hook Form?

- Type safety end-to-end
- Validação colocada (schema define form + tipos)
- DX: Auto-inference de tipos em `useForm<T>()`

## Erros Pré-Existentes Não Corrigidos

Estes erros já existiam antes da modernização e não são regressões:

### restaurante-app

- `src/screens/RotasDeliveryScreen.tsx(117,27)`: Expected 0 arguments, but got 1
- `src/services/optimization/BatchOperationHelper.ts(81,51)`: Argument type mismatch (Partial<T> not assignable)
- `src/ui/*.figma.tsx`: Cannot find module (Figma connectors)
- `src/ui/ConfirmActionDialog.tsx`, `StateView.tsx`: ARIA role type mismatches (alertdialog, status)

### restaurante-web

- `src/services/optimization/BatchOperationHelper.ts(81,51)`: Idem app

**Ação recomendada:** Corrigir em PR separado após confirmar estabilidade de deploy da modernização.

## Próximos Passos

1. **Migração gradual de componentes:**
   - Converter componentes locais em `restaurante-app/src/ui/` para `packages/ui/`
   - Usar alias `@restaurante/ui` em novas telas

2. **Validação E2E:**
   - Rodar testes Playwright em `restaurante-app` e `restaurante-web`
   - Confirmar que aliases não quebram navegação

3. **Documentação de componentes:**
   - Expandir Storybook com mais stories (estados, variantes, edge cases)
   - Adicionar accessibility testing com `@storybook/addon-a11y`

4. **Performance:**
   - Medir bundle size antes/depois (alias impacts?)
   - Avaliar lazy loading de packages

5. **Migração de Supabase Config:**
   - Mover `supabase.ts` local para `packages/config` (se ainda não unificado)
   - Garantir reutilização entre app/web/ops

## Referências

- `.github/skills/restaurante-supabase/SKILL.md` — Guardrails do projeto
- `pnpm-workspace.yaml` — Definição oficial dos workspace packages
- `turbo.json` — Task configuration
- `tsconfig.base.json` + `packages/*/tsconfig.json` — TypeScript paths
- `.storybook/main.ts` — Storybook config com Vite aliases

---

**Última atualização:** 2026-04-16  
**Responsável:** GitHub Copilot
