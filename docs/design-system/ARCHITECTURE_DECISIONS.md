# Architecture Decision Records — Monorepo Modernization

**Date:** 2026-04-16  
**Status:** Completed  
**Format:** ADR (Architecture Decision Records)

---

## ADR-001: pnpm + Turborepo para Workspace Orchestration

### Context

Monorepo com 5 aplicações independentes (app, web, ops, site, balança-bridge) + banco de dados. Necessidade de:

- Compartilhar código entre app/web
- Orchestrar builds sem duplicação
- Manter isolamento de dependências

### Decision

Adotar **pnpm 10.33** (workspace nativo) + **Turborepo 2.9.6** (task orchestration).

### Alternatives Considered

1. **npm workspaces** — Mais pesado, hoisting implícito
2. **yarn v3 PnP** — Menor adoção na comunidade React Native
3. **Lerna (monorepo classic)** — Menos moderno, mais setup
4. **Apenas npm scripts** — Sem cache, sem task parallelization

### Decision Rationale

- pnpm: Eficiência de disco (symlinks), hoisting explícito
- Turborepo: Native React/Next.js support, caching, parallelization
- Combinação: Padrão de mercado, suportado by Vercel/Expo

### Consequences

- ✅ Workspace management simplificado
- ✅ CI/CD speedup com caching
- ✅ Task isolation + dependency graph
- ⚠️ Requires pnpm 10.x+ (may not be available on some infra)
- ⚠️ Learning curve for team (mitigated by docs)

### Status

✅ Implemented and Validated

---

## ADR-002: 4 Shared Packages (@restaurante/\*)

### Context

Duplicação de componentes entre app e web (Button, Input, Forms, etc.).  
Duplicação de validação (Zod schemas).  
Duplicação de design tokens (colors, spacing).

### Decision

Criar 4 packages compartilhados:

- `@restaurante/ui` — Componentes RN + React
- `@restaurante/tokens` — Design tokens (colors, spacing, etc.)
- `@restaurante/schemas` — Zod validation schemas
- `@restaurante/config` — Configurações runtime (Supabase factory)

### Alternatives Considered

1. **Monorepo com shared folder (`libs/`)** — Menos isolado, mais acoplamento
2. **Separate npm packages** — Versionamento complexo, overhead
3. **Copy-paste sharing** — Inconsistência, difícil manutenção (current state)

### Decision Rationale

- Packages = clear boundaries + explicit dependencies
- workspace:\* protocol = versioning automático
- pnpm hoisting = sem node_modules bloat
- TypeScript paths = painless imports

### Consequences

- ✅ Single source of truth for UI/schemas/tokens
- ✅ Easy to test components in isolation
- ✅ Clear dependency graph
- ⚠️ Requires discipline to keep packages focused
- ⚠️ Circular dependency risk (mitigated by package boundaries)

### Status

✅ Implemented and Validated

---

## ADR-003: Storybook at Root (not per-app)

### Context

Documentation of UI components. Options:

- Storybook in restaurante-app
- Storybook in restaurante-web
- Shared Storybook at root

### Decision

**Centralized Storybook at root** (`.storybook/`).

### Alternatives Considered

1. **Storybook per app** — Duplicated setup, inconsistent docs
2. **No Storybook** — No visual regression testing, hard to explore components
3. **External Chromatic** — Adds cost, requires integration

### Decision Rationale

- Single source of truth for component stories
- Easier to maintain (one config, one build)
- Snapshots + visual regression in one place
- DX: developers explore all components in one place

### Consequences

- ✅ Centralized docs + testing
- ✅ Easier CI integration
- ✅ Shared Storybook addons (a11y, docs, etc.)
- ⚠️ Build complexity (Vite alias preservation required)
- ⚠️ Larger build artifact (mitigated by caching)

### Key Implementation Detail

**Storybook Vite alias preservation** was critical:

```typescript
// ❌ WRONG: overwrites baseConfig.resolve.alias
resolve: { alias: { 'react-native': 'react-native-web', ... } }

// ✅ CORRECT: preserves existing
resolve: { alias: { ...(baseConfig.resolve?.alias ?? {}), 'react-native': 'react-native-web', ... } }
```

### Status

✅ Implemented and Validated (EXIT:0 build)

---

## ADR-004: React Hook Form 7.x + Zod 4.x for Forms

### Context

Forms in app/web with different validation approaches. Need unified, type-safe form handling.

### Decision

Standardize on **React Hook Form 7.x** (form state) + **Zod 4.x** (validation).

### Alternatives Considered

1. **Formik** — More verbose, less performant
2. **React Final Form** — Older API, less popular
3. **Manual form handling** — Lots of boilerplate (current state)
4. **Valibot** — Newer, similar to Zod but smaller bundle

### Decision Rationale

- RHF: Minimal re-renders, small bundle, React Native support
- Zod: Type inference, runtime validation, DX
- Combination: Industry standard, large community

### Consequences

- ✅ Type-safe forms (inference from schema)
- ✅ Reduced boilerplate (auto validation)
- ✅ Better performance (minimal re-renders)
- ⚠️ New dependency learning curve
- ⚠️ Must update existing forms gradually

### Status

✅ Implemented (4 forms in packages/ui, no regressions in existing forms)

---

## ADR-005: NativeWind 4.2.1 for Styling

### Context

Styling approach for React Native + web:

- Inline styles (current) — repetitive
- StyleSheet (RN) — not available on web
- Tailwind (web) — not available on RN
- CSS-in-JS — bundle size, performance

### Decision

**NativeWind 4.2.1**: Tailwind CSS compiled for React Native + Web.

### Alternatives Considered

1. **Tamagui** — More powerful, larger bundle, learning curve
2. **Styled Components** — Web-only
3. **React Native StyleSheet** — Not web-compatible
4. **Keep inline styles** — Inconsistency (current state)

### Decision Rationale

- Tailwind: Industry standard, large community
- NativeWind: RN compilation, Metro integration
- One design system: app + web visual consistency

### Consequences

- ✅ Consistent styling across platforms
- ✅ Centralized design tokens via Tailwind
- ✅ className intellisense (VSCode)
- ⚠️ Requires Tailwind preset in Metro config
- ⚠️ Bundle size: ~5-10KB (acceptable)

### Status

✅ Implemented (global.css in app/web, Tailwind preset in tokens)

---

## ADR-006: TypeScript Strict Mode Everywhere

### Context

TypeScript configuration across projects inconsistent:

- Some projects: `strict: false`
- Some files: implicit `any`
- Type coverage: ~60%

### Decision

**Enforce `strict: true`** across all projects and packages.

### Alternatives Considered

1. **Gradual rollout** — Splits the codebase, harder to maintain
2. **Strict in new code only** — Inconsistency between old/new
3. **No strict mode** — Miss bugs, hard to refactor (current state)

### Decision Rationale

- Catch bugs at compile time, not runtime
- Easier refactoring with type safety
- Better IDE support (VSCode, WebStorm)
- Industry best practice

### Consequences

- ✅ Safer codebase
- ✅ Better IDE support
- ✅ Easier refactoring
- ⚠️ Pre-existing code has 11 app errors + 1 web error (documented)
- ⚠️ Requires discipline from team (mitigated by pre-commit hooks)

### Pre-Existing Errors (not regressions)

- BatchOperationHelper.ts: Type inference issue
- Figma connectors: Module resolution
- ARIA role types: Dialog type mismatches

### Status

✅ Implemented (all new packages pass, app/web pre-existing errors documented)

---

## ADR-007: TypeScript Path Aliases for Imports

### Context

Import paths are verbose:

```typescript
import { Component } from '../../../components/Component';
import { helper } from '../../utils/helper';
```

### Decision

Implement **TypeScript path aliases** in each project:

```typescript
import { Component } from '@/components/Component';
import { helper } from '@/utils/helper';
import { Button } from '@restaurante/ui';
```

### Alternatives Considered

1. **No aliases** — Verbose, brittle with refactors
2. **Absolute imports via Node** — Runtime overhead
3. **Index re-exports** — Circular dependency risk

### Decision Rationale

- Clean imports
- Easier refactoring (move files without breaking)
- Workspace packages naturally use `@restaurante/*`
- Zero runtime overhead

### Consequences

- ✅ Cleaner code
- ✅ Easier refactoring
- ✅ IDE intellisense works perfectly
- ⚠️ Requires IDE setup (automatic in VSCode)
- ⚠️ Must maintain `tsconfig.json` + `babel.config.js` alignment

### Implementation Details

- `tsconfig.json`: `paths` configuration
- `babel.config.js`: `babel-plugin-module-resolver`
- `.storybook/main.ts`: Vite alias mapping
- `metro.config.js`: No changes needed (Babel handles it)

### Status

✅ Implemented and Validated

---

## ADR-008: Husky + lint-staged + commitlint for Quality Gates

### Context

Code quality varies. Need automated enforcement of:

- Linting standards
- TypeScript compilation
- Commit message format

### Decision

Implement **Git hooks** via Husky + lint-staged + commitlint.

### Alternatives Considered

1. **CI/CD only** — Feedback loop too slow
2. **Manual checks** — Inconsistent enforcement
3. **No checks** — Inconsistent codebase (current state)

### Decision Rationale

- Pre-commit: Fast feedback loop
- Commit-msg: Searchable, semantic commits
- lint-staged: Efficient (only changed files)

### Consequences

- ✅ Consistent code quality
- ✅ Atomic commits
- ✅ Semantic commit history
- ⚠️ Hook failures can be frustrating (can skip with --no-verify)
- ⚠️ Requires team adoption

### Setup

- `.husky/pre-commit`: runs `pnpm lint-staged`
- `.husky/commit-msg`: runs `commitlint --edit`
- `lint-staged`: eslint + prettier + typecheck on changed files

### Status

✅ Implemented and Validated

---

## ADR-009: Design Tokens as CommonJS Tailwind Preset

### Context

Tailwind preset needed for app + web. Options:

1. **ESM preset** — Not compatible with Metro/CommonJS bundlers
2. **CJS preset** — Compatible but requires hardcoding values
3. **Runtime preset** — Adds startup overhead

### Decision

**CommonJS preset** with hardcoded values in `packages/tokens/src/tailwind-preset.cjs`.

### Rationale

- Metro compatibility (CommonJS)
- Zero runtime overhead
- Hardcoded values = predictable, auditable
- Can be regenerated if design system changes

### Trade-Off

- ⚠️ Values must be hardcoded (not imported from .ts)
- ✅ Solves ESM/CJS mismatch issue
- ✅ Prevents circular dependencies

### Example

```javascript
// packages/tokens/src/tailwind-preset.cjs
module.exports = {
  theme: {
    colors: {
      primary: '#007AFF',
      secondary: '#5856D6',
      // ...hardcoded
    },
  },
};
```

### Status

✅ Implemented and Validated

---

## ADR-010: Non-Destructive Modernization Approach

### Context

Monorepo modernization risk: breaking existing flows.

### Decision

**Make all changes non-destructive**:

- New packages layer on top
- Existing apps continue unchanged
- Old imports still work
- No migrations required
- Easy to rollback

### Strategy

1. Create packages without modifying existing code
2. Add aliases without breaking existing imports
3. Keep old components + add new shared components
4. App/web can opt-in to new packages at own pace

### Consequences

- ✅ Zero breaking changes
- ✅ Low risk deployment
- ✅ Easy rollback
- ✅ Gradual team adoption
- ⚠️ Temporary code duplication (intentional)
- ⚠️ Requires discipline to not use both old + new patterns

### Mitigation

- Documentation + examples
- Linting rules (future: ban local duplicates)
- Code review process

### Status

✅ Implemented (all existing flows unchanged)

---

## ADR-011: Turbo Tasks Configuration

### Context

How to organize builds in Turborepo?

### Decision

Define 4 core tasks:

1. `dev` — Development with watch (cache: false, persistent: true)
2. `build` — Production build (depends on ^build for transitive builds)
3. `lint` — ESLint validation
4. `type-check` — TypeScript checking

### Rationale

- `dev`: No cache (always fresh), persistent (don't stop)
- `build`: Cache-friendly, respects dependencies
- `lint` + `type-check`: Fast validation

### Configuration

```json
{
  "tasks": {
    "dev": { "cache": false, "persistent": true },
    "build": { "dependsOn": ["^build"] },
    "lint": {},
    "type-check": {}
  }
}
```

### Consequences

- ✅ Clear task hierarchy
- ✅ Parallel execution by default
- ✅ CI/CD speedup with caching
- ⚠️ Task interdependencies must be maintained

### Status

✅ Implemented and Validated

---

## Future ADRs (Potential)

- ADR-012: Monorepo package versioning strategy (Changesets, Lerna tags)
- ADR-013: Component testing library (Testing Library, Vitest)
- ADR-014: End-to-end testing framework (Playwright, Detox)
- ADR-015: Visual regression testing (Chromatic, Percy)
- ADR-016: Code splitting + tree-shaking optimization
- ADR-017: Micro-frontend architecture (if cross-company sharing)

---

## Summary Table

| ADR | Decision                | Status | Risk      |
| --- | ----------------------- | ------ | --------- |
| 001 | pnpm + Turborepo        | ✅     | 🟢 Low    |
| 002 | 4 Shared Packages       | ✅     | 🟢 Low    |
| 003 | Root Storybook          | ✅     | 🟡 Medium |
| 004 | RHF + Zod Forms         | ✅     | 🟢 Low    |
| 005 | NativeWind Styling      | ✅     | 🟢 Low    |
| 006 | TS Strict Mode          | ✅     | 🟡 Medium |
| 007 | Path Aliases            | ✅     | 🟢 Low    |
| 008 | Git Hooks (Husky)       | ✅     | 🟢 Low    |
| 009 | CJS Tailwind Preset     | ✅     | 🟢 Low    |
| 010 | Non-Destructive Changes | ✅     | 🟢 Low    |
| 011 | Turbo Tasks             | ✅     | 🟢 Low    |

---

## Revision History

| Date       | Change               | Author         |
| ---------- | -------------------- | -------------- |
| 2026-04-16 | Initial ADRs 001-011 | GitHub Copilot |

---

## References

- [MONOREPO_MODERNIZATION.md](./MONOREPO_MODERNIZATION.md) — Implementation details
- [.github/skills/restaurante-supabase/SKILL.md](.github/skills/restaurante-supabase/SKILL.md) — Project guardrails
- pnpm docs: https://pnpm.io/
- Turborepo docs: https://turbo.build/
- React Hook Form: https://react-hook-form.com/
- Zod: https://zod.dev/
- NativeWind: https://www.nativewind.dev/
