# Rate Limiting Hardening Evidence Template

## Change Metadata
- Date (UTC):
- Environment: (staging | production)
- Service URL:
- Commit/Tag:
- Operator:

## Configuration Snapshot (No Secrets)
- RATE_LIMIT_FALLBACK_ENABLED:
- AUTH_RATE_LIMIT_MAX_ATTEMPTS:
- AUTH_RATE_LIMIT_WINDOW_MS:
- RATE_LIMIT_BILLING_MAX_ATTEMPTS:
- RATE_LIMIT_BILLING_WINDOW_MS:
- REDIS_URL configured: (yes/no)

## Functional Validation (429)
### Login
- Command used:
- Result:
- Retry-After present: (yes/no)
- X-RateLimit-Remaining present: (yes/no)
- X-RateLimit-Reset present: (yes/no)
- Evidence file path:

### Billing
- Command used:
- Result:
- Retry-After present: (yes/no)
- X-RateLimit-Remaining present: (yes/no)
- X-RateLimit-Reset present: (yes/no)
- Evidence file path:

## Fail-Closed Validation (503)
- Outage simulation method:
- Login endpoint returned 503: (yes/no)
- Billing endpoints returned 503: (yes/no)
- Error message validated: (yes/no)
- Evidence file path:

## Logs Validation
- auth.rate_limit_unavailable observed: (yes/no)
- billing.rate_limit_unavailable observed: (yes/no)
- Log extraction command:
- Log evidence path:

## Monitoring Window (First 60 min)
- 429 rate:
- 503 rate:
- Redis error/latency anomalies:
- Business regression detected: (yes/no)

## Rollback (if needed)
- Rollback executed: (yes/no)
- Time rollback started:
- Time rollback completed:
- Post-rollback validation result:

## Final Decision
- Promotion approved: (yes/no)
- Approved by:
- Notes:
