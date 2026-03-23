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

## Test Onboarding (Mercado Pago)

Use test credentials only through environment management:

1. App and web:
	- copy `restaurante-app/.env.example` to `.env`
	- copy `restaurante-web/.env.example` to `.env`
	- configure `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`
	- enable billing flags only in controlled environments:
	  - `EXPO_PUBLIC_FEATURE_BILLING`
	  - `EXPO_PUBLIC_FEATURE_BILLING_LICENSE_GATE`
	  - `EXPO_PUBLIC_FEATURE_BILLING_SCREEN`
2. Edge Functions:
	- copy `database-backup/supabase/functions/.env.example` to `.env`
	- set `MERCADOPAGO_PUBLIC_KEY`, `MERCADOPAGO_ACCESS_TOKEN`, and `MERCADOPAGO_WEBHOOK_SECRET`
	- optionally set `MERCADOPAGO_NOTIFICATION_URL` to the future webhook endpoint for Pix reconciliation
3. Hosted environments:
	- set credentials with `supabase secrets set ...`
	- never commit any provider key/token to git

Quick validation:

- Open Billing screen in app or web as company admin.
- Confirm provider readiness (`billing-provider-status`) is `configured=true`.
- Trigger card setup bootstrap (`billing-create-checkout`) and ensure audit log entry in `billing_audit_log`.
- Trigger Pix fallback (`billing-create-pix-fallback`) and ensure audit log entry in `billing_audit_log`.

## Executable Setup Checklist

Windows (PowerShell):

```powershell
# 1) App and Web env files
Copy-Item restaurante-app/.env.example restaurante-app/.env
Copy-Item restaurante-web/.env.example restaurante-web/.env

# 2) Edge Functions local env
Copy-Item database-backup/supabase/functions/.env.example database-backup/supabase/functions/.env

# 3) Optional: set test credentials only in current shell session
$env:MP_PUBLIC_KEY = "<your_test_public_key>"
$env:MP_ACCESS_TOKEN = "<your_test_access_token>"
$env:MP_WEBHOOK_SECRET = "<your_webhook_secret_or_placeholder>"

# 4) Push secrets to hosted Supabase project (do not commit them)
Set-Location database-backup
supabase secrets set MERCADOPAGO_PUBLIC_KEY=$env:MP_PUBLIC_KEY MERCADOPAGO_ACCESS_TOKEN=$env:MP_ACCESS_TOKEN MERCADOPAGO_WEBHOOK_SECRET=$env:MP_WEBHOOK_SECRET
```

Bash:

```bash
# 1) App and Web env files
cp restaurante-app/.env.example restaurante-app/.env
cp restaurante-web/.env.example restaurante-web/.env

# 2) Edge Functions local env
cp database-backup/supabase/functions/.env.example database-backup/supabase/functions/.env

# 3) Optional: set test credentials in current shell session
export MP_PUBLIC_KEY="<your_test_public_key>"
export MP_ACCESS_TOKEN="<your_test_access_token>"
export MP_WEBHOOK_SECRET="<your_webhook_secret_or_placeholder>"

# 4) Push secrets to hosted Supabase project
cd database-backup
supabase secrets set MERCADOPAGO_PUBLIC_KEY="$MP_PUBLIC_KEY" MERCADOPAGO_ACCESS_TOKEN="$MP_ACCESS_TOKEN" MERCADOPAGO_WEBHOOK_SECRET="$MP_WEBHOOK_SECRET"
```

Security notes:

- Keep test and production credentials strictly separated by environment.
- Prefer rotating exposed test access tokens before shared QA runs.
- Never store provider secrets in migration files or source-controlled `.env.example` files.
- If any Mercado Pago or Supabase credential appears in chat, terminal output, screenshots, or logs, rotate it immediately and rerun the billing smoke checks before continuing QA.
