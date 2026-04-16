# Technology Stack

## Languages & Runtimes
- TypeScript 5.9 (strict mode) — primary language across all subprojects
- JavaScript — legacy components (gradually migrating to TS)
- SQL — Supabase migrations and RLS policies
- Deno — Supabase Edge Functions

## Frontend Frameworks
| Subproject | Framework | Version |
|---|---|---|
| restaurante-app | React Native + Expo | React 19.2, Expo 54, RN 0.84 |
| restaurante-web | Expo Web | React 19.1, Expo 54, RN 0.84 |
| restaurante-site | Next.js | Next 16, React 19.2 |

## Backend
- **restaurante-ops**: Node.js (ESM), plain HTTP server (no Express), TypeScript
- **Supabase**: PostgreSQL, Auth, Storage, Realtime, Edge Functions
- **Firebase**: Legacy integration (Firestore) — migration to Supabase ongoing
- **Redis**: Rate limiting and caching in ops server

## Key Dependencies
- `@supabase/supabase-js` ^2.94 — database, auth, realtime
- `@react-navigation/native` ^6 — navigation (stack + bottom tabs)
- `react-native-reanimated` ^4 — animations
- `react-native-gesture-handler` ^2.28 — gestures
- `i18next` + `react-i18next` — internationalization
- `@sentry/react-native` ^8 — error tracking
- `expo-secure-store` — secure credential storage
- `expo-local-authentication` — biometric auth
- `react-native-esc-pos-printer` — thermal printer integration
- `uuid` ^13 — ID generation
- `firebase` ^12 — legacy Firestore (being migrated)

## Testing
- **Unit/Integration**: Jest 29 + jest-expo + @testing-library/react-native (app only)
- **E2E Web**: Playwright 1.58 (`restaurante-web/e2e/`)
- **E2E Mobile**: Maestro (`restaurante-app/.maestro/`)
- **Property-based**: fast-check
- **Security**: Snyk Code Scan (`.snyk` configs in app, web, ops)

## Build & Deploy
| Subproject | Build | Deploy |
|---|---|---|
| restaurante-app | EAS Build (preview/production) | EAS + OTA (expo-updates) |
| restaurante-web | `expo export -p web` | Railway (`railway.json`) |
| restaurante-ops | `tsc -p tsconfig.json` | Railway |
| restaurante-site | `next build` | Railway |
| database-backup | Supabase CLI | `supabase db push` |

## Development Commands
### restaurante-web
- `npm start` — Expo Web dev server (port 8081)
- `npm run build` — production export
- `npm run test:e2e` — Playwright E2E tests

### restaurante-app
- `npm start` — Expo dev server
- `npm test` — Jest unit tests
- `npm run type-check` — TypeScript validation
- `npm run deploy:eas:android` — EAS Android build

### restaurante-ops
- `npm run dev` — tsx watch mode
- `npm run build` — TypeScript compile
- `npm run test` — Node.js test runner
- `npm run check` — TypeScript noEmit check

### restaurante-site
- `npm run dev` — Next.js dev
- `npm run build` — Next.js production build

## Environment & Tooling
- Node.js >= 18 (web), >= 20 (site)
- ESLint 9 + typescript-eslint + eslint-plugin-react
- Prettier (`.prettierrc` + `.prettierignore`)
- patch-package for dependency patches
- Dependabot (`.github/dependabot.yml`)
- Metro bundler (app + web)
