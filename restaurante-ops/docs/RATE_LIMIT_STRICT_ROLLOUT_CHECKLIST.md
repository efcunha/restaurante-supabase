# Rate Limit Strict Rollout Checklist

## Objective
Enable strict fail-closed behavior for protected routes in restaurante-ops using:
- RATE_LIMIT_FALLBACK_ENABLED=false

## Preconditions
- Redis service is provisioned and healthy.
- REDIS_URL is present in runtime environment.
- Latest backend code is deployed with strict-mode handling.

## 1) Environment Configuration
Set these variables in production:
- RATE_LIMIT_FALLBACK_ENABLED=false
- REDIS_URL=redis://:password@host:port
- AUTH_RATE_LIMIT_MAX_ATTEMPTS=8
- AUTH_RATE_LIMIT_WINDOW_MS=900000
- RATE_LIMIT_BILLING_MAX_ATTEMPTS=30
- RATE_LIMIT_BILLING_WINDOW_MS=60000

## 2) Deploy
- Deploy restaurante-ops service with updated environment.
- Ensure deployment health checks pass before traffic validation.

## 3) Validation (Functional)
### Login route
- Trigger repeated failed logins and confirm 429 after threshold.
- Validate headers: Retry-After, X-RateLimit-Remaining, X-RateLimit-Reset.
- Automated option:
  - `BASE_URL=https://<ops-domain> ATTEMPTS=10 ./scripts/rate-limit-smoke.sh`
  - `BASE_URL=https://<ops-domain> ATTEMPTS=10 REPORT_FILE=./tmp/rate-limit-login-smoke.txt ./scripts/rate-limit-smoke.sh`
  - `BASE_URL=https://<ops-domain> ATTEMPTS=10 powershell -NoProfile -ExecutionPolicy Bypass -File ./scripts/rate-limit-smoke.ps1`
  - `$env:BASE_URL='https://<ops-domain>'; $env:ATTEMPTS='10'; $env:REPORT_FILE='./tmp/rate-limit-login-smoke.txt'; powershell -NoProfile -ExecutionPolicy Bypass -File ./scripts/rate-limit-smoke.ps1`
  - `npm run rate-limit:smoke` (bash) or `npm run rate-limit:smoke:ps` (PowerShell)

### Billing routes
- Trigger repeated POST operations and confirm 429 after threshold.
- Validate same rate-limit headers for blocked responses.
- Automated option (requires authenticated cookie + payload):
  - `AUTH_COOKIE='ops_session=<token>' BILLING_JSON='{"companyId":"<uuid>","idempotencyKey":"smoke-1","eventType":"payment_received","paymentStatus":"paid"}' BASE_URL=https://<ops-domain> ./scripts/rate-limit-smoke.sh`
  - PowerShell session example:
    - `$env:AUTH_COOKIE='ops_session=<token>'; $env:BILLING_JSON='{"companyId":"<uuid>","idempotencyKey":"smoke-1","eventType":"payment_received","paymentStatus":"paid"}'; $env:BASE_URL='https://<ops-domain>'; powershell -NoProfile -ExecutionPolicy Bypass -File ./scripts/rate-limit-smoke.ps1`

## 4) Validation (Fail-Closed)
Simulate Redis unavailability (temporary disconnect or invalid REDIS_URL in staging) and confirm:
- POST /auth/login returns 503 (HTML response)
- Billing protected routes return 503 (JSON response)
- Logs contain:
  - auth.rate_limit_unavailable
  - billing.rate_limit_unavailable

Command suggestion for fail-closed validation after inducing Redis outage in staging:
- `BASE_URL=https://<ops-staging-domain> ATTEMPTS=2 ./scripts/rate-limit-smoke.sh`
- `BASE_URL=https://<ops-staging-domain> ATTEMPTS=2 powershell -NoProfile -ExecutionPolicy Bypass -File ./scripts/rate-limit-smoke.ps1`

## 5) Monitoring Window (First 60 minutes)
Track:
- 429 response rate (expected under abuse only)
- 503 response rate (should remain near zero)
- Redis connectivity/latency/errors
- Login and billing success rates (no business regression)

## 6) Rollback Strategy
If Redis instability causes sustained 503 impact:
1. Set RATE_LIMIT_FALLBACK_ENABLED=true
2. Redeploy/restart service
3. Keep incident notes and restore strict mode after Redis stabilization

## 7) Evidence to Attach in Change Log
- Environment variable snapshot (without secrets)
- Endpoint validation outputs for 429 and 503 scenarios
- Log excerpts proving unavailable-event handling
- Timestamp of strict mode enablement
- Output of `./scripts/rate-limit-smoke.sh`
- Output of `./scripts/rate-limit-smoke.ps1`
- Report file generated via `REPORT_FILE` env var

Suggested evidence commands:
- Bash login report:
  - `BASE_URL=https://<ops-domain> ATTEMPTS=10 REPORT_FILE=./tmp/rate-limit-login-smoke.txt ./scripts/rate-limit-smoke.sh`
- PowerShell login report:
  - `$env:BASE_URL='https://<ops-domain>'; $env:ATTEMPTS='10'; $env:REPORT_FILE='./tmp/rate-limit-login-smoke.txt'; powershell -NoProfile -ExecutionPolicy Bypass -File ./scripts/rate-limit-smoke.ps1`

Note:
- Prefer report outputs under `restaurante-ops/tmp/` (already ignored by git).

Evidence consolidation template:
- `docs/RATE_LIMIT_EVIDENCE_TEMPLATE.md`
