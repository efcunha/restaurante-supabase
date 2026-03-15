# Phase 12 Release Notes

Date: 2026-03-14
Scope: restaurante-app + restaurante-web
Status: Completed in staging (wave 4 / full-phase12)

## Summary

Phase 12 safe migration was completed with progressive rollout guards, canary validation by wave, and final promotion to full profile in staging.

## Delivered

- Feature flag guards wired in app/web for:
  - login_uiNext
  - registerCompany_uiNext
  - novoPedido_uiNext
  - delivery_uiNext
  - pagamento_uiNext
  - comandaGerenciamento_uiNext
  - admin_uiNext
- Env override parsing added for all Phase 12 flags in app/web feature flag config.
- Rollout helper CLI added in both projects:
  - scripts/phase12-profile.js
- NPM aliases added in app/web package scripts:
  - phase12:legacy
  - phase12:auth
  - phase12:ordering
  - phase12:settlement
  - phase12:full
- Env templates updated (app/web):
  - .env.example
  - .env.development.example
  - .env.staging.example
  - .env.production.example

## Canary Validation Evidence (Web)

- Auth wave test:
  - e2e/phase12-auth-canary.spec.ts
  - Result: 2 passed
- Ordering wave test:
  - e2e/phase12-ordering-canary.spec.ts
  - Result: 2 passed
- Settlement wave test:
  - e2e/phase12-settlement-canary.spec.ts
  - Result: 1 passed
- Admin wave test:
  - e2e/phase12-admin-canary.spec.ts
  - Result: 1 passed (validated before and after admin_uiNext enable)

## Rollout Progression Executed

- Wave 1: canary-auth
- Wave 2: canary-ordering
- Wave 3: canary-settlement
- Wave 4: full-phase12

Promotion was executed in both:

- restaurante-app/.env.staging
- restaurante-web/.env.staging

## Current Staging Flags

All Phase 12 flags are enabled in staging:

- EXPO_PUBLIC_FEATURE_LOGIN_UI_NEXT=true
- EXPO_PUBLIC_FEATURE_REGISTER_COMPANY_UI_NEXT=true
- EXPO_PUBLIC_FEATURE_NOVO_PEDIDO_UI_NEXT=true
- EXPO_PUBLIC_FEATURE_DELIVERY_UI_NEXT=true
- EXPO_PUBLIC_FEATURE_PAGAMENTO_UI_NEXT=true
- EXPO_PUBLIC_FEATURE_COMANDA_GERENCIAMENTO_UI_NEXT=true
- EXPO_PUBLIC_FEATURE_ADMIN_UI_NEXT=true

## Operational Commands

From restaurante-app or restaurante-web:

- Set full profile in staging:
  - npm run phase12:full -- --env .env.staging
- Roll back to legacy-safe in staging:
  - npm run phase12:legacy -- --env .env.staging

Run web canary checks:

- npx playwright test e2e/phase12-auth-canary.spec.ts --project=chromium --workers=1 --reporter=line
- npx playwright test e2e/phase12-ordering-canary.spec.ts --project=chromium --workers=1 --reporter=line
- npx playwright test e2e/phase12-settlement-canary.spec.ts --project=chromium --workers=1 --reporter=line
- npx playwright test e2e/phase12-admin-canary.spec.ts --project=chromium --workers=1 --reporter=line

## Rollback Guidance

If an incident occurs, move to the previous stable wave by applying the matching profile with scripts/phase12-profile.js or the npm aliases.

- Example immediate rollback from full-phase12 to settlement-only:
  - npm run phase12:settlement -- --env .env.staging

For full rollback:

- npm run phase12:legacy -- --env .env.staging

## Production Promotion Checklist

1. Apply baseline profile in production for controlled start:
  - npm run phase12:legacy -- --env .env.production
2. Promote by wave and validate after each profile:
  - npm run phase12:auth -- --env .env.production
  - npm run phase12:ordering -- --env .env.production
  - npm run phase12:settlement -- --env .env.production
  - npm run phase12:full -- --env .env.production
3. Run web canary specs after each wave before moving forward:
  - npx playwright test e2e/phase12-auth-canary.spec.ts --project=chromium --workers=1 --reporter=line
  - npx playwright test e2e/phase12-ordering-canary.spec.ts --project=chromium --workers=1 --reporter=line
  - npx playwright test e2e/phase12-settlement-canary.spec.ts --project=chromium --workers=1 --reporter=line
  - npx playwright test e2e/phase12-admin-canary.spec.ts --project=chromium --workers=1 --reporter=line
4. If any gate fails, roll back to the previous stable profile immediately.
5. Capture KPI deltas and incident notes per wave.

## Notes

- This phase intentionally kept data-flow/business logic stable while toggling UI branches.
- Runbook reference: PHASE_12_CANARY_RUNBOOK.md
