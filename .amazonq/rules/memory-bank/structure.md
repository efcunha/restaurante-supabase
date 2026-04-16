# Project Structure

## Root Layout
```
restaurante-supabase/
├── restaurante-app/       # Mobile app (React Native + Expo 54)
├── restaurante-web/       # Web POS (Expo Web 54) + E2E
├── restaurante-ops/       # Backoffice SaaS server (Node.js)
├── restaurante-site/      # Marketing site (Next.js 16)
├── database-backup/       # Supabase migrations, Edge Functions, backup
├── balanca-bridge/        # USB serial bridge for scales
├── docs/                  # Cross-cutting documentation
├── scripts/               # Monorepo-level utility scripts
└── .github/               # CI workflows, Dependabot, Copilot instructions
```

## Shared Source Layout (restaurante-app & restaurante-web)
Both app and web share a mirrored `src/` structure:
```
src/
├── auth/              # Role definitions (roles.js)
├── components/        # Shared components
│   ├── comandas/      # Comanda-specific components
│   ├── PDV/           # POS-specific components (web only: NovoPedidoModal)
│   ├── ui/            # Legacy UI (Toast)
│   └── ui-next/       # Next-gen design system components (22+ components)
├── config/            # Feature flags, Firebase, Sentry, Supabase config
├── context/           # React contexts (Auth, Billing, Order, Toast)
├── design-system/     # Design tokens and index
├── features/          # Feature modules
│   ├── admin/         # Admin feature components + types
│   ├── delivery/      # Delivery feature (web only)
│   ├── maquininha/    # TEF/card machine integration (web)
│   ├── new-order/     # New order flow
│   ├── payments/      # Payment feature
│   └── pdv/           # PDV feature (hooks, services, types)
├── hooks/             # Custom hooks (comanda, menu, order, responsive, stats)
├── i18n/              # Internationalization (config + locales pt/en)
├── layouts/           # ScreenScaffold (KeyboardAvoidingView + operator subtitle)
├── navigation/        # LazyScreens for code splitting
├── screens/           # All screen components (~35+ screens)
│   └── admin/menu/    # Admin menu sub-screens
├── services/          # Business logic services (~40+ services)
│   ├── optimization/  # Performance: batch ops, connection pool, dedup, realtime
│   └── supabase/      # Supabase-specific service implementations
├── theme/             # colors.ts (with designColors migration guidance)
├── types/             # TypeScript type definitions (order, models, performance)
├── ui/                # Foundational UI components
└── utils/             # Utility functions (logger, currency, date, validation, errors)
```

## restaurante-ops Structure
```
restaurante-ops/src/
├── auth/              # Middleware, session, Supabase auth
├── config/            # Environment config
├── lib/               # Core libraries (HTTP server, logger, rate limiter, Redis, alerts)
├── modules/           # Business modules
│   ├── billing/       # Billing operations, plan config
│   ├── customers/     # Customer lifecycle
│   ├── metrics/       # Supabase metrics, observability
│   ├── payment-gateway.ts  # MercadoPago integration
│   └── ops-security.ts     # Security module
└── views/             # Server-rendered views (dashboard, observability)
```

## Database & Migrations
```
database-backup/
├── migrations/        # 50+ SQL migrations (schema, RLS, billing, LGPD, triggers)
├── supabase/
│   ├── functions/     # Edge Functions (billing-webhook, billing-checkout, create-company)
│   │   ├── _shared/   # Shared Edge Function utilities
│   │   └── scripts/   # Billing smoke tests and validation scripts
│   └── migrations/    # Supabase CLI managed migrations (synced with migrations/)
├── scripts/           # RLS smoke tests, device binding validation
└── backups/           # Database dump files
```

## Architectural Patterns
- **Monorepo with shared patterns**: app and web mirror the same src/ structure for parity
- **Feature-based modules**: `features/` directory groups related components, hooks, services, types
- **Service layer**: `services/` contains all business logic, decoupled from screens
- **Context-based state**: React Context for Auth, Billing, Order, Toast
- **Foundational UI layer**: `ui/` exports StateView, ScreenHeader, SectionHeader, ConfirmActionDialog, FormSection, FieldRow, DataListItem, ListContainer
- **Design system with Figma Code Connect**: `.figma.tsx` files alongside components, validated by CI
- **Feature flags**: `config/featureFlags.ts` controls progressive rollout (`_uiNext` flags)
- **Multi-tenant RLS**: Supabase Row Level Security with company_id scoping
- **Edge Functions for billing**: Deno-based Supabase Edge Functions for payment webhooks
- **Observability**: Centralized logging via LoggerService → ops server → Supabase isolated project
