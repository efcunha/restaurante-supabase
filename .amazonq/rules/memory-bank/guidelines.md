# Development Guidelines

## Code Quality Standards

### TypeScript
- Strict mode enabled across all subprojects (`tsc --noEmit` must pass with zero errors)
- Prefer `.tsx` for components, `.ts` for services/utils/types
- Legacy `.js` files exist but new code must be TypeScript
- Type definitions live in `src/types/` (shared) or co-located `types.ts` in feature modules
- Use explicit interfaces for service method params and return types

### File Naming
- Screens: `PascalCaseScreen.tsx` (e.g., `NovoPedidoScreen.tsx`, `CaixaFechamentoScreen.tsx`)
- Services: `PascalCaseService.ts` (e.g., `LoggerService.ts`, `CaixaService.ts`)
- Hooks: `useCamelCase.ts` (e.g., `useComandaManagement.ts`, `useNovoPedido.ts`)
- Types: `camelCase.types.ts` or `types.ts` within feature folders
- Utils: `camelCase.ts` (e.g., `formatCurrency.ts`, `dateUtils.ts`)
- UI components: `PascalCase.tsx` with optional `.stories.tsx` and `.figma.tsx` siblings
- Migrations: `YYYYMMDDHHMMSS_descriptive_name.sql`

### Module Organization
- Feature modules in `src/features/<name>/` with barrel `index.ts` re-exporting public API
- Barrel exports use named re-exports: `export { ComponentName } from './components/ComponentName'`
- Utils barrel (`src/utils/index.ts`) re-exports with `export * from './module'`
- UI barrel (`src/ui/index.ts`) re-exports all foundational components by name

## Architectural Patterns

### Service Layer (Singleton Pattern)
Services are exported as singleton instances:
```typescript
class LoggerService {
  logError(error: Error | string, context: string = '', extra: SentryExtra = {}): void { ... }
  info(message: string, context?: LogContext): void { ... }
  warn(message: string, context?: LogContext): void { ... }
}
export default new LoggerService();
```
- All business logic lives in `src/services/`
- Screens call services, never Supabase directly
- Services handle error logging internally via LoggerService

### Logger Usage Pattern
- Use `logger.logError(error, 'ContextName', { key: value })` for errors — signature is `(Error|string, context, extra)`
- Use `logger.info(message)` for audit trail events
- Use `logger.warn(message)` for non-critical issues
- Replace all `console.error` / `console.log` with logger calls in production code
- `__DEV__` guard: logger only writes to console in dev, always sends to Sentry in prod
- Sensitive data is auto-scrubbed (password, token, secret, auth, key, credit_card, cvv, card_number)

### Feature Flags (Progressive Rollout)
- All new features start disabled (`false`) in `defaultFlags`
- Override via `EXPO_PUBLIC_FEATURE_*` environment variables
- Per-screen `_uiNext` flags control UI component migration rollout
- Feature groups: security (Fase 1), performance (Fase 2), data normalization (Fase 3), advanced (Fase 4), UI migration (Fase 5), billing (Fase 6), PDV (Fase 7)
- E2E tests can toggle flags via `window.__E2E_FEATURE_FLAGS__` in dev mode
- Check with `isFeatureEnabled('flagName')` — never read `featureFlags` directly in screens

### State Management
- React Context for cross-cutting concerns: `AuthContext`, `BillingContext`, `OrderContext`, `ToastContext`
- No Redux — state is context-based with hooks
- Realtime subscriptions use Supabase Realtime with 300ms debounce

### Foundational UI Components
Import from `src/ui` (not `src/components/ui-next`):
- `StateView` — loading/error/empty states (use for all async data screens)
- `ScreenHeader` — consistent screen headers
- `SectionHeader` — section dividers
- `ConfirmActionDialog` — destructive action confirmation (`role="alertdialog"`)
- `FormSection` + `FieldRow` — form layouts
- `DataListItem` — list item display
- `ListContainer` — scrollable list wrapper

### Screen Implementation Pattern
1. Wrap in `ScreenScaffold` (provides KeyboardAvoidingView + operator subtitle)
2. Use `StateView` for loading/error/empty states
3. Add logger calls: errors, security events, audit trail
4. Add `aria-label` on icon-only buttons
5. Add `aria-live="polite"` on realtime-updating regions
6. Apply 300ms debounce on Supabase realtime subscriptions

### i18n
- Portuguese (`pt`) is the default and fallback language
- Translations in `src/i18n/locales/pt.json` and `en.json`
- Use `useTranslation()` hook, never hardcode user-facing strings
- `useSuspense: false` — required for React Native compatibility
- `__DEV__` enables i18n debug mode

## Security Practices
- No PII in logs — logger auto-redacts sensitive keys
- Email sanitization before logging (auth flows)
- `company_id` scoping on all queries (multi-tenant RLS)
- Biometric auth via `expo-local-authentication` + `expo-secure-store`
- MFA support via `MFAService`
- Role-based access: admin, gerente, garçom — check in screens with conditional rendering
- Snyk Code Scan on all modified files before merge
- Credentials never in code — use `EXPO_PUBLIC_*` env vars for client, server-only vars in ops `.env`

## Testing Conventions
- TypeScript gate: `npm run type-check` must pass (zero errors) before any PR
- E2E (web): Playwright specs in `restaurante-web/e2e/` — smoke critical flows: balcão, mesa, pizza, delivery, mesa-consolidação
- E2E navigation uses fallback chain for resilience
- Unit tests (app): Jest in `src/__tests__/` — services and hooks
- Security validation: `0 high Snyk issues` required on modified files
- Anti-loop rule: if a validation fails 2 times on the same check, stop and report cause

## Storybook & Design System
- Web Storybook is source of truth for component catalog
- Every UI component needs: `.tsx` (component) + `.stories.tsx` (story) + `.figma.tsx` (Figma Code Connect)
- Validate with: `validate-figma-node-map.mjs` and `smoke-storybook-public.mjs`
- CI guardrail: `storybook-figma-guardrails.yml`
- App mirrors stories for internal governance but web is canonical

## Build & Babel
- Babel: `babel-preset-expo` + `react-native-reanimated/plugin` (reanimated plugin must be last)
- `api.cache(true)` for build performance
- `patch-package` runs on `postinstall` for dependency patches
- Metro bundler for app/web, Webpack 5 for Storybook

## Web-Specific Rules
- Breakpoints: sm=640, md=768, lg=1024, xl=1280 (design tokens)
- Grid: 12 columns, 24px gutter
- PDV screens: compact density (less padding, more info per viewport)
- Admin screens: spacious layout, sidebar + content on lg+
- `aria-live="polite"` on realtime screens (Cozinha, Montagem, PedidosProntos, Delivery, Reservas)
- `role="alert"` on critical errors
- Focus management in modals (focus first interactive element)
- Tab order must be logical in forms

## App/Web Parity
- Implement web first for non-native-dependent screens, then mirror to app
- Both share identical `src/` structure: services, hooks, types, utils, config, context
- `ui/` components are mirrored with same API surface
- Design tokens (`design-system/tokens.ts`) shared: breakpoints, colors
- `colors.ts` in theme has migration guidance toward `designColors`
