# Phase 12 - Canary Runbook

Date: 2026-03-14
Scope: restaurante-app + restaurante-web

## Goal

Operationalize Phase 12 progressive migration with explicit canary waves, hard rollback switches, and validation checkpoints.

## Migration Flags

The migration is controlled by these environment variables:

- EXPO_PUBLIC_FEATURE_LOGIN_UI_NEXT
- EXPO_PUBLIC_FEATURE_REGISTER_COMPANY_UI_NEXT
- EXPO_PUBLIC_FEATURE_NOVO_PEDIDO_UI_NEXT
- EXPO_PUBLIC_FEATURE_DELIVERY_UI_NEXT
- EXPO_PUBLIC_FEATURE_PAGAMENTO_UI_NEXT
- EXPO_PUBLIC_FEATURE_COMANDA_GERENCIAMENTO_UI_NEXT
- EXPO_PUBLIC_FEATURE_ADMIN_UI_NEXT

Environment examples updated with these flags:

- `restaurante-app/.env.example`
- `restaurante-app/.env.development.example`
- `restaurante-app/.env.staging.example`
- `restaurante-app/.env.production.example`
- `restaurante-web/.env.example`
- `restaurante-web/.env.development.example`
- `restaurante-web/.env.staging.example`
- `restaurante-web/.env.production.example`

## CLI Rollout Helper

To apply a full profile quickly without manual env editing:

In `restaurante-app`:

- `npm run phase12:legacy -- --env .env.staging`
- `npm run phase12:auth -- --env .env.staging`
- `npm run phase12:ordering -- --env .env.staging`
- `npm run phase12:settlement -- --env .env.staging`
- `npm run phase12:full -- --env .env.staging`

In `restaurante-web`:

- `npm run phase12:legacy -- --env .env.staging`
- `npm run phase12:auth -- --env .env.staging`
- `npm run phase12:ordering -- --env .env.staging`
- `npm run phase12:settlement -- --env .env.staging`
- `npm run phase12:full -- --env .env.staging`

Generic command in both projects:

- `npm run phase12:profile -- --profile canary-ordering --env .env.production`

Default state in code currently enables all canary waves except admin.

## Wave Matrix

| Wave | Screen/Feature | Flags ON | Flags OFF | Risk | Main KPI |
|---|---|---|---|---|---|
| 0 | Baseline (legacy freeze) | none | all | low | error baseline |
| 1 | Auth | LOGIN, REGISTER_COMPANY | others | low | login success rate |
| 2 | Ordering browse | NOVO_PEDIDO, DELIVERY | others | medium | order creation completion time |
| 3 | Settlement/Comandas | PAGAMENTO, COMANDA_GERENCIAMENTO | others | medium | payment completion + reopen rate |
| 4 | Admin | ADMIN (+ previous stable waves) | none | high | admin task completion + crash-free sessions |

Legend:
- LOGIN = EXPO_PUBLIC_FEATURE_LOGIN_UI_NEXT
- REGISTER_COMPANY = EXPO_PUBLIC_FEATURE_REGISTER_COMPANY_UI_NEXT
- NOVO_PEDIDO = EXPO_PUBLIC_FEATURE_NOVO_PEDIDO_UI_NEXT
- DELIVERY = EXPO_PUBLIC_FEATURE_DELIVERY_UI_NEXT
- PAGAMENTO = EXPO_PUBLIC_FEATURE_PAGAMENTO_UI_NEXT
- COMANDA_GERENCIAMENTO = EXPO_PUBLIC_FEATURE_COMANDA_GERENCIAMENTO_UI_NEXT
- ADMIN = EXPO_PUBLIC_FEATURE_ADMIN_UI_NEXT

## Recommended Rollout Order

1. Internal canary (ops/admin users only)
2. 10% of target users by role
3. 50% of target users by role
4. 100% for the current wave
5. Move to next wave only if all gates pass

## Quality Gates Per Wave

A wave can advance only if all checks are green for at least one full operating day:

1. No P0/P1 production errors linked to migrated screen
2. Crash-free sessions stable against baseline
3. Flow-specific success KPI stable or improved
4. No regression in payment/order integrity
5. Support volume does not spike for migrated flow

## Quick Rollback Playbook

If incident happens in a migrated wave:

1. Identify affected flow (auth/order/payment/comanda/admin)
2. Set corresponding EXPO_PUBLIC_FEATURE_* flag(s) to false
3. Redeploy/reload environment
4. Re-test critical path for impacted role
5. Keep incident notes with timestamp and failing action

Expected rollback behavior:
- Auth: fallback from ui-next input/button to legacy controls
- NovoPedido/Delivery: fallback on header/actions
- Pagamento: fallback CTA/search controls in payment components
- ComandaGerenciamento: fallback logout action
- Admin: fallback card rendering path

## Validation Checklist (Before Promotion)

### Quick automated canary checks (web)

Run from `restaurante-web`:

- Auth wave: `npx playwright test e2e/phase12-auth-canary.spec.ts --project=chromium --workers=1 --reporter=line`
- Ordering wave: `npx playwright test e2e/phase12-ordering-canary.spec.ts --project=chromium --workers=1 --reporter=line`

### Auth wave

- Login with valid credentials
- Login with invalid credentials and error feedback
- Password reset request
- Register company with valid data

### Ordering wave

- NovoPedido open, search, add/remove item, submit
- Delivery open, search, add/remove item, submit footer action
- Header actions and logout flow

### Settlement wave

- Comanda search
- Payment confirm action
- Split by people and split by items
- Comanda management list/details navigation

### Admin wave

- All admin cards render and open correct target
- Financial/system sections render consistently
- Modal navigation remains intact

## Suggested Environment Profiles

### Profile A: Legacy-safe

Set all migration flags to false.

### Profile B: Canary-auth

Set only LOGIN and REGISTER_COMPANY to true.

### Profile C: Canary-ordering

Set LOGIN, REGISTER_COMPANY, NOVO_PEDIDO, DELIVERY to true.

### Profile D: Canary-settlement

Set previous profile flags + PAGAMENTO + COMANDA_GERENCIAMENTO to true.

### Profile E: Full-phase12

Set all migration flags to true, including ADMIN.

## Incident Notes Template

Use this template for each issue found during rollout:

- Timestamp:
- Environment/profile:
- Role:
- Flow/screen:
- Steps to reproduce:
- Expected:
- Actual:
- Error log snippet:
- Rollback performed (yes/no):
- Follow-up action:

## Current Status Snapshot (2026-03-14)

Implemented and guarded:

- Auth: LoginScreen + RegisterCompanyScreen
- Ordering: NovoPedidoScreen (app/web), DeliveryScreen (web)
- Settlement: Pagamento feature controls + ComandaGerenciamento header action
- Admin: AdminActionCard rendering path

Pending operational step:

- Start wave-based deployment using this runbook and capture KPI deltas per wave.
