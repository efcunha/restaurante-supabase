# Mercado Pago Edge Functions

## Secrets

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `MERCADOPAGO_ACCESS_TOKEN`
- `MERCADOPAGO_PUBLIC_KEY`
- `MERCADOPAGO_WEBHOOK_SECRET`

## Secure Setup for Test Credentials

Do not commit test or production credentials to source code, `.env.example`, or migration files.

Recommended flow:

1. Keep credentials only in local `.env` files ignored by git, Railway variables, or Supabase Edge Function secrets.
2. For local Supabase Edge Functions, create `database-backup/supabase/functions/.env` from `database-backup/supabase/functions/.env.example`.
3. For hosted environments, set secrets with Supabase CLI:

```bash
cd database-backup
supabase secrets set MERCADOPAGO_PUBLIC_KEY=... MERCADOPAGO_ACCESS_TOKEN=... MERCADOPAGO_WEBHOOK_SECRET=...
```

4. Validate readiness by invoking `billing-provider-status` from app/web BillingScreen.
5. Keep production and test credentials in separate environments (never shared across staging/prod).

Operational note:

- `MERCADOPAGO_PUBLIC_KEY` can be returned to the client only through secure backend contract (`billing-create-checkout`) and only for authenticated admin flow.
- `MERCADOPAGO_ACCESS_TOKEN` and `MERCADOPAGO_WEBHOOK_SECRET` must remain server-side only.

## Deploy and Smoke Test Runbook

### 1) Local development (serve functions)

```bash
cd database-backup/supabase
supabase functions serve --env-file ./functions/.env
```

Windows fallback when `supabase` is not in PATH:

```powershell
cd database-backup/supabase
C:/Users/ECUNHA/scoop/shims/supabase.exe functions serve --env-file ./functions/.env
```

### 2) Deploy billing functions

```bash
cd database-backup/supabase
supabase functions deploy billing-provider-status
supabase functions deploy billing-create-checkout
supabase functions deploy billing-create-pix-fallback
```

Quick post-deploy preflight:

- Calling these functions with anon key should return `401` (`Authenticated user not found for this request.`).
- This confirms endpoints are deployed and auth guards are active.

### 3) Minimal smoke test (authenticated admin)

Use a valid user JWT from a company admin account and your project URL:

Preferred (scripted):

```bash
export SUPABASE_PROJECT_URL="https://<project-ref>.supabase.co"
export USER_JWT="<valid_admin_user_jwt>"
bash database-backup/supabase/functions/scripts/billing-smoke-test.sh
```

```powershell
$env:SUPABASE_PROJECT_URL = "https://<project-ref>.supabase.co"
$env:USER_JWT = "<valid_admin_user_jwt>"
powershell -NoProfile -ExecutionPolicy Bypass -File database-backup/supabase/functions/scripts/billing-smoke-test.ps1
```

Manual (single-call debugging):

```bash
export SUPABASE_PROJECT_URL="https://<project-ref>.supabase.co"
export USER_JWT="<valid_admin_user_jwt>"

curl -i "$SUPABASE_PROJECT_URL/functions/v1/billing-provider-status" \
	-H "Authorization: Bearer $USER_JWT" \
	-H "Content-Type: application/json" \
	-d '{}'

curl -i "$SUPABASE_PROJECT_URL/functions/v1/billing-create-checkout" \
	-H "Authorization: Bearer $USER_JWT" \
	-H "Content-Type: application/json" \
	-d '{}'

curl -i "$SUPABASE_PROJECT_URL/functions/v1/billing-create-pix-fallback" \
	-H "Authorization: Bearer $USER_JWT" \
	-H "Content-Type: application/json" \
	-d '{}'
```

Expected outcomes:

- `billing-provider-status`: returns provider readiness and subscription linkage metadata.
- `billing-create-checkout`: returns `pending_client_tokenization` when provider is configured.
- `billing-create-pix-fallback`: returns `pix_fallback_pending_provider_charge` when provider is configured.

### 4) Post-smoke verification in database

Confirm inserts in `billing_audit_log` for:

- `billing.checkout.requested`
- `billing.pix.requested`

Preferred (scripted audit check):

```bash
export SUPABASE_PROJECT_URL="https://<project-ref>.supabase.co"
export SUPABASE_ANON_KEY="<anon_key>"
export USER_JWT="<valid_admin_user_jwt>"
export BILLING_AUDIT_WINDOW_MINUTES="60"
bash database-backup/supabase/functions/scripts/billing-audit-check.sh
```

```powershell
$env:SUPABASE_PROJECT_URL = "https://<project-ref>.supabase.co"
$env:SUPABASE_ANON_KEY = "<anon_key>"
$env:USER_JWT = "<valid_admin_user_jwt>"
$env:BILLING_AUDIT_WINDOW_MINUTES = "60"
powershell -NoProfile -ExecutionPolicy Bypass -File database-backup/supabase/functions/scripts/billing-audit-check.ps1
```

### 5) One-command full verification

Run smoke + audit in sequence:

```bash
export SUPABASE_PROJECT_URL="https://<project-ref>.supabase.co"
export SUPABASE_ANON_KEY="<anon_key>"
export USER_JWT="<valid_admin_user_jwt>"
bash database-backup/supabase/functions/scripts/billing-verify-all.sh
```

```powershell
$env:SUPABASE_PROJECT_URL = "https://<project-ref>.supabase.co"
$env:SUPABASE_ANON_KEY = "<anon_key>"
$env:USER_JWT = "<valid_admin_user_jwt>"
powershell -NoProfile -ExecutionPolicy Bypass -File database-backup/supabase/functions/scripts/billing-verify-all.ps1
```

## Functions Introduced Now

### `billing-provider-status`

Purpose:

- validate the authenticated admin
- inspect provider configuration
- summarize subscription linkage
- expose readiness for the BillingScreen

### `billing-create-checkout`

Purpose:

- validate the authenticated admin
- log the checkout/card-setup request
- return the Mercado Pago public key when configured
- establish the backend contract that the client will use for tokenization setup

Current limitation:

- card tokenization is not completed yet in the client flow
- this function returns readiness metadata and audit trace, not a production checkout URL

### `billing-create-pix-fallback`

Purpose:

- validate the authenticated admin
- register the intent to regularize through Pix
- expose provider readiness and the next backend step

Current limitation:

- Pix charge emission is not completed yet in provider integration

## Next Backend Steps

1. Add Mercado Pago customer upsert flow
2. Add tokenized card setup persistence into `payment_methods`
3. Add recurring subscription creation and update of `subscriptions.mp_*`
4. Add Pix invoice generation and persistence into `invoices`
5. Add webhook endpoint for payment and subscription events
