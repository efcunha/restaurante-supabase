# Rollout Plan

## Phase 0

- Document the domain and implementation strategy
- Add BillingScreen surfaces in app and web
- Add Edge Function scaffolding and contracts

## Phase 1

- Surface billing in registration and login copy
- Add Admin menu entry for subscription management
- Add trial-state visibility for admins

## Phase 2

- Connect BillingScreen to Edge Functions
- Return provider health and subscription status from backend orchestration
- Allow manual Pix regularization request flow

## Phase 3

- Replace placeholder checkout initiation with Mercado Pago public-key tokenization in client
- Persist tokenized references through Edge Functions
- Add webhook processing and idempotent invoice updates

## Phase 4

- Activate LicenseGate-driven navigation to BillingScreen
- Turn billing requirements on per environment or canary wave
- Validate `is_test` bypass and rollback flags

## Phase 5

- Start `restaurante-ops` as a separate backoffice project
- Add portfolio metrics, customer lifecycle dashboard and billing operations panel
- Keep POS flows isolated in `restaurante-app` and `restaurante-web`

## Phase 6

- Integrate `restaurante-ops` with billing Edge Functions and reconciliation workflows
- Add daily aggregates for usage and conversion metrics
- Add operational alerts and audit-driven support views

## Validation Checklist

- Trial company can see billing status
- Admin can open billing management from app and web
- No sensitive payment data is stored in client tables
- Webhook processing is idempotent
- Trial expiry rules remain consistent with `get_company_subscription_state`
