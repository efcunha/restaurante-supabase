# SaaS Billing Initiative

This folder centralizes the implementation plan, architectural boundaries, and operational handoff for the SaaS billing rollout.

## Objectives

- Add subscription management to the operational products without mixing customer success and backoffice concerns into the POS flows.
- Introduce a dedicated billing surface in the operational app and web products.
- Keep all payment-provider mutations outside the client, using Supabase Edge Functions.
- Prepare the future `restaurante-ops` project as a separate domain for customer lifecycle, contracts, metrics, and support.

## Deliverables In Scope

- BillingScreen in app and web
- Admin entry point for subscription management
- Billing communication in login and registration flows
- Mercado Pago Edge Function scaffolding
- Root-level documentation for rollout and architecture

## Operational Rule

- Company signup still creates a 30-day trial.
- Payment method capture is surfaced early but becomes mandatory before trial expiration.
- License blocking remains a post-trial operational concern, never a login concern.

## Related Code

- `restaurante-app/src/context/BillingContext.tsx`
- `restaurante-web/src/context/BillingContext.tsx`
- `database-backup/migrations/20260321120000_create_billing_tables.sql`
- `database-backup/migrations/20260321130000_add_is_test_to_companies.sql`
