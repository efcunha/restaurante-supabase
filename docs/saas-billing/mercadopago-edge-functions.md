# Mercado Pago Edge Functions

## Secrets

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `MERCADOPAGO_ACCESS_TOKEN`
- `MERCADOPAGO_PUBLIC_KEY`
- `MERCADOPAGO_WEBHOOK_SECRET`
- `MERCADOPAGO_NOTIFICATION_URL` (optional, recommended for automatic Pix reconciliation)

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

### Secret Rotation Runbook

Rotate immediately if any key/token appears in chat, terminal output, screenshots, logs, or a committed file.

Rotation order:

1. Generate new Mercado Pago sandbox or live credentials in the provider console.
2. Update hosted Supabase secrets first:

```bash
cd database-backup
supabase secrets set MERCADOPAGO_PUBLIC_KEY="<new_public_key>" MERCADOPAGO_ACCESS_TOKEN="<new_access_token>" MERCADOPAGO_WEBHOOK_SECRET="<new_webhook_secret>"
```

3. Redeploy billing functions after secret update:

```bash
cd database-backup
supabase functions deploy billing-provider-status --no-verify-jwt
supabase functions deploy billing-create-checkout --no-verify-jwt
supabase functions deploy billing-create-pix-fallback --no-verify-jwt
supabase functions deploy billing-webhook
```

4. Only after successful validation, revoke old Mercado Pago credentials in the provider console.
5. Remove any local temporary files, shell history snippets, or copied payloads containing the exposed values.

Post-rotation validation:

1. `billing-provider-status` returns `configured=true`.
2. `billing-create-checkout` returns `ready_for_tokenization`.
3. Card save flow returns `card_saved`.
4. `billing-create-pix-fallback` returns `pix_ready`.
5. `billing-webhook` validates with the new secret.
6. `billing_audit_log` does not contain raw token, QR, or card-last-four artifacts.

Operational note:

- `MERCADOPAGO_PUBLIC_KEY` can be returned to the client only through secure backend contract (`billing-create-checkout`) and only for authenticated admin flow.
- `MERCADOPAGO_ACCESS_TOKEN` and `MERCADOPAGO_WEBHOOK_SECRET` must remain server-side only.
- `MERCADOPAGO_NOTIFICATION_URL` should target the future billing webhook endpoint and stay server-side.

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
supabase functions deploy billing-webhook
```

Current project operational note:

- `billing-provider-status`, `billing-create-checkout`, and `billing-create-pix-fallback` may be deployed with `--no-verify-jwt` when the platform gateway rejects otherwise valid project JWTs.
- In this mode, `requireSecureAdmin()` remains mandatory and is the real auth barrier.
- `billing-webhook` must keep provider-signature auth and does not use JWT.

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

Webhook smoke test (requires a valid MP test payment ID and configured `MERCADOPAGO_WEBHOOK_SECRET`):

```bash
# Simulates a payment.updated webhook — replace <ts>, <hmac>, <request-id>, and <payment_id>
curl -i "$SUPABASE_PROJECT_URL/functions/v1/billing-webhook" \
	-X POST \
	-H "Content-Type: application/json" \
	-H "x-signature: ts=<ts>,v1=<hmac>" \
	-H "x-request-id: <request-id>" \
	-d '{"action":"payment.updated","data":{"id":"<payment_id>"}}'
```

Expected outcomes:

- `billing-provider-status`: returns provider readiness and subscription linkage metadata.
- `billing-create-checkout`: returns `pending_client_tokenization` when provider is configured.
- `billing-create-pix-fallback`: returns `pix_ready` with `pixQrCode`, `pixQrCodeText`, `pixExpiresAt`, and persists the invoice when provider is configured.
- `billing-webhook`: returns `{ ok: true }` for valid signatures; `401` for invalid/stale signatures.

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

Purpose (two-mode endpoint):

**Mode A** — no `cardToken` in body:
- validate the authenticated admin
- return `MERCADOPAGO_PUBLIC_KEY` for client-side card tokenization via Mercado Pago.js SDK

**Mode B** — `cardToken` in body:
- validate the admin and multi-tenant context
- upsert Mercado Pago Customer (creates if missing, reuses `subscriptions.mp_customer_id`)
- store the card in MP Vault via `POST /v1/customers/{id}/cards`
- persist display-safe fields to `payment_methods` (`last_four`, `brand`, `expiry_month`, `expiry_year`, `mp_card_id`)
- mark the new card as default
- return `{ status: 'card_saved', paymentMethodId, card: { brand, lastFour, expiryMonth, expiryYear } }`

Security notes:

- Card token is validated for format before calling MP; invalid formats return `400`
- Token expired/invalid on MP side returns `422` so the client can re-tokenize
- `mp_card_id` stored (durable reference); raw card token never logged or persisted
- No CVV, no full PAN stored anywhere

### `billing-create-pix-fallback`

Purpose:

- validate the authenticated admin with multi-tenant isolation
- reuse an unexpired pending Pix invoice without calling Mercado Pago again
- invalidate expired Pix invoices before reissue
- issue a Pix charge to Mercado Pago and persist the invoice with QR and copia-e-cola data
- return `pix_ready` with `pixQrCode`, `pixQrCodeText`, `pixExpiresAt`, and `invoiceId`

Security notes:

- Fail-closed when `MERCADOPAGO_ACCESS_TOKEN` is absent
- Fail-closed when payer email or fiscal document (CNPJ/CPF) is missing from `companies`/`profiles`
- No payment state stored unless MP returns full QR data
- `X-Idempotency-Key: billing-pix:{companyId}:{invoiceId}` prevents duplicate MP charges

### `billing-webhook`

Purpose:

- receive Mercado Pago `payment.updated` and `payment.created` webhooks
- verify HMAC-SHA256 signature from `x-signature` header (reject stale timestamps > 5 minutes)
- fetch full payment details from MP API using the `data.id` field
- map final MP statuses (`approved` → `paid`; `rejected`/`cancelled`/`refunded`/`charged_back` → `failed`)
- call `reconcile_billing_event_atomic` as the single write path for all billing state transitions
- handle idempotency automatically via `webhook_events` UNIQUE constraint inside the RPC
- always return `200` for non-security errors to prevent infinite MP retries

Security notes:

- Requires `MERCADOPAGO_WEBHOOK_SECRET` — returns `503` if not configured (fail-closed)
- Constant-time HMAC comparison to prevent timing attacks
- Logs only `mpStatus`, action, and error codes — never logs payment amounts, PIX keys, or PII
- `SYSTEM_ACTOR_ID` (`00000000-0000-0000-0000-000000000000`) used as actor for webhook-reconciled audit entries

## Next Backend Steps

1. Deploy all four functions and run smoke tests
2. Set `MERCADOPAGO_NOTIFICATION_URL` to the deployed `billing-webhook` URL
3. Add tokenized card setup: Mercado Pago SDK client-side tokenization → `billing-create-checkout` persists token into `payment_methods`
4. Add recurring subscription auto-charge flow (trial → active transition)
5. Background job for grace period / suspension enforcement (trial expiry → status change)
