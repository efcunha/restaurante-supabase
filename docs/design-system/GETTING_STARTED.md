# 🚀 Getting Started com o Novo Monorepo

## Instalação & Setup

```bash
# 1. Instalar dependências
pnpm install

# 2. Inicia dev com Turbo (todos os apps em paralelo)
pnpm dev

# 3. Storybook (documentação de componentes)
pnpm storybook:web
# Abre em http://localhost:6006/

# 4. Type-check global
pnpm typecheck

# 5. Lint global
pnpm lint
```

## Usar Componentes Compartilhados

### Dentro de `restaurante-app` ou `restaurante-web`:

```typescript
// ✅ Componentes RN/React
import { Button, Input, Card, Modal, Badge, Loader } from '@restaurante/ui';

// ✅ Formulários com RHF + Zod
import { LoginForm, CadastroForm, CheckoutForm } from '@restaurante/ui';

// ✅ Design tokens
import { colors, spacing, radius, typography } from '@restaurante/tokens';

// ✅ Schemas de validação
import { loginSchema, cadastroSchema, checkoutSchema } from '@restaurante/schemas';

// ✅ Supabase client
import { createSupabasePublicClient } from '@restaurante/config';

// ✅ Aliases locais
import { MyLocalComponent } from '@/components/MyLocalComponent';
```

## Exemplo: Usar LoginForm

```typescript
import { LoginForm } from '@restaurante/ui';

export function LoginScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 16 }}>
      <LoginForm
        onSubmit={(data) => {
          // data é type-safe: { email: string; password: string }
          console.log('Login:', data);
        }}
      />
    </View>
  );
}
```

## Adicionar Novo Componente

### 1. Criar em `packages/ui/src/components/MyComponent.tsx`

```typescript
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { colors } from '@restaurante/tokens';

export interface MyComponentProps {
  title: string;
  onPress?: () => void;
}

export function MyComponent({ title, onPress }: MyComponentProps) {
  return (
    <Pressable onPress={onPress}>
      <View style={{ padding: 16, backgroundColor: colors.primary }}>
        <Text style={{ color: 'white', fontSize: 16 }}>{title}</Text>
      </View>
    </Pressable>
  );
}
```

### 2. Exportar em `packages/ui/src/index.ts`

```typescript
export { MyComponent, type MyComponentProps } from './components/MyComponent';
```

### 3. Usar em qualquer app

```typescript
import { MyComponent } from '@restaurante/ui';

// Type-safe!
<MyComponent title="Hello" onPress={() => console.log('clicked')} />
```

### 4. (Opcional) Adicionar story em `.storybook/stories/MyComponent.stories.tsx`

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { MyComponent } from '@restaurante/ui';

export default {
  title: 'Components/MyComponent',
  component: MyComponent,
} as Meta;

export const Default: StoryObj = {
  args: { title: 'Test Component' },
};
```

## Adicionar Novo Schema de Validação

### 1. Adicionar em `packages/schemas/src/forms.ts`

```typescript
import { z } from 'zod';

export const myNewSchema = z.object({
  field1: z.string().min(1, 'Required'),
  field2: z.number().positive(),
});

export type MyNewForm = z.infer<typeof myNewSchema>;
```

### 2. Exportar em `packages/schemas/src/index.ts`

```typescript
export { myNewSchema, type MyNewForm } from './forms';
```

### 3. Usar com React Hook Form

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { myNewSchema, type MyNewForm } from '@restaurante/schemas';

export function MyFormComponent() {
  const { register, handleSubmit } = useForm<MyNewForm>({
    resolver: zodResolver(myNewSchema),
  });

  return (
    <form onSubmit={handleSubmit((data) => {
      // data é type-safe!
      console.log(data);
    })}>
      {/* ... form fields ... */}
    </form>
  );
}
```

## Adicionar Novo Design Token

### 1. Editar `packages/tokens/src/index.ts`

```typescript
export const tokens = {
  // Existentes...
  colors: {
    /* ... */
  },
  spacing: {
    /* ... */
  },

  // Novo!
  shadows: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
  },
};
```

### 2. Usar em componentes

```typescript
import { tokens } from '@restaurante/tokens';

const boxStyle = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  // ou com Tailwind: className="shadow-md"
};
```

## TypeScript Path Aliases

### Em apps (restaurante-app, restaurante-web):

| Alias                  | Resolução                 | Uso                                                                |
| ---------------------- | ------------------------- | ------------------------------------------------------------------ |
| `@/*`                  | `src/*`                   | `import { helper } from '@/utils/helper'`                          |
| `@restaurante/ui`      | `../packages/ui/src`      | `import { Button } from '@restaurante/ui'`                         |
| `@restaurante/tokens`  | `../packages/tokens/src`  | `import { colors } from '@restaurante/tokens'`                     |
| `@restaurante/schemas` | `../packages/schemas/src` | `import { loginSchema } from '@restaurante/schemas'`               |
| `@restaurante/config`  | `../packages/config/src`  | `import { createSupabasePublicClient } from '@restaurante/config'` |

## TypeScript Strict Mode

Todos os projetos usam `strict: true`. Dicas:

```typescript
// ❌ Evite
const data: any = fetchData();

// ✅ Prefira
interface UserData {
  id: string;
  name: string;
}
const data: UserData = fetchData();

// ❌ Evite parâmetros sem tipo
function process(value) {
  /* ... */
}

// ✅ Prefira
function process(value: string): void {
  /* ... */
}
```

## Git Hooks & Quality

### Commit com validação automática

```bash
# Seu commit passará por:
# 1. Pre-commit: lint-staged (eslint, prettier)
# 2. Commit-msg: commitlint (mensagem estruturada)

git commit -m "feat(ui): add new button variant"
# ✅ Passou? Commit criado.
# ❌ Erros? Mensagem de erro, volta a editar.
```

### Formato de commit esperado

```
<type>(<scope>): <subject>

<body (opcional)>
```

Tipos: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`  
Escopos: `ui`, `schemas`, `tokens`, `config`, `app`, `web`, `ops`, `site`

Exemplo:

```
feat(ui): add avatar component with initials

- Supports image fallback to initials
- Type-safe props via TypeScript
- Includes Storybook story
```

## Troubleshooting

### "Cannot find module '@restaurante/ui'"

- Solução: `pnpm install` novamente
- Verificar: `packages/ui/src/index.ts` exporta o componente

### "TypeScript error: 'any' implicitly has type 'unknown'"

- Solução: Adicione tipo explícito
- Exemplo: `function process(value: string): void`

### "Storybook não carrega stories"

- Solução: Stories devem estar em `.storybook/stories/**/*.stories.tsx`
- Verificar: `.storybook/main.ts` tem o glob correto

### "Metro error: Cannot resolve 'babel-plugin-module-resolver'"

- Solução: `pnpm install` e reinicia `expo start`
- Verificar: `babel.config.js` tem o plugin listado

## Próximos Passos Recomendados

1. **Migrar componentes existentes**: Mover UI local para `packages/ui`
2. **E2E testing**: Validar fluxos críticos com nova estrutura
3. **Bundle analysis**: Verificar se aliases impactam tamanho final
4. **Storybook expansão**: Adicionar mais stories e accessibility tests
5. **Documentação**: Expandir guidelines de componentes

## Referências

- [MONOREPO_MODERNIZATION.md](./MONOREPO_MODERNIZATION.md) — Guia técnico completo
- [.storybook/](../.storybook/) — Configuração do Storybook
- [packages/](../packages/) — Código das packages compartilhadas
- [pnpm docs](https://pnpm.io/) — Workspace documentation
- [Turborepo docs](https://turbo.build/) — Task orchestration

---

**Versão:** 1.0  
**Data:** 2026-04-16  
**Mantido por:** GitHub Copilot
