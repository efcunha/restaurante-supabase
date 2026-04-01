# Security Remediation Week 1 Snapshot (2026-04-01)

Document: SECURITY_REMEDIATION_WEEK1_SNAPSHOT_2026-04-01.md
Date: 2026-04-01 18:31 UTC
Scope: restaurante-app, restaurante-web, restaurante-ops

## Executive Status

Week 1 security scope is functionally implemented for code hardening items.
Deployment-only items remain pending for `SEC-W1-002`.
`SEC-W1-001` moved to runtime decision gate due to Firebase legacy-only reachability.

Progress summary:
- Completed now: 8/10
- Pending deploy actions: 1/10 (`SEC-W1-002`)
- Decision gate: 1/10 (`SEC-W1-001`)

## Item-by-Item Status

1. SEC-W1-001 (Firebase key rotation): decision pending
- Code/examples sanitized and runbook prepared.
- Runtime assessment indicates Firebase remains in legacy services, with no clear active reachability outside `src/services`.
- Remaining action: close deprecation decision gate before forcing production rotation.

2. SEC-W1-002 (Cursor secret): ready for deploy
- Secret generated and code already requires runtime env in production.
- Remaining action: set CURSOR_SECRET in app via EAS/Expo env and in web via Railway, then validate pagination smoke.

3. SEC-W1-003 (Biometric hardening): completed
- Token-based biometric flow active.
- Password replay storage removed.

4. SEC-W1-004 (Android backup hardening): completed
- backup_rules.xml and data_extraction_rules.xml are in place.
- AndroidManifest points to both policy files.

5. SEC-W1-005 (Logging hardening): completed
- sentryConfig implemented for app and web with beforeSend scrubbing.
- Existing logger sanitization remains active as first layer.

6. OPS-2 (ops logs sanitization): completed
7. OPS-5 (server-only secrets and headers): completed
8. OPS-3 (rate limit strict validation): completed
9. OPS-1 (ops session/cookies hardening): completed
10. OPS-4 (billing smoke with eligible invoice): pending data availability

## Current Blocker Evidence

Railway CLI auth is not currently valid:
- Check command: railway whoami
- Result: Unauthorized (2026-04-01 17:10 UTC)

Latest validation note (2026-04-01 18:31 UTC):
- Hardcode scan for Firebase/CURSOR in app/web returned only placeholders in `.env.example`/`.env.staging`.
- Secure patterns remain present (`resolveCursorSecret`, `refreshSession`) in app/web auth and pagination paths.

Implication:
- Immediate deploy path is Railway UI for `SEC-W1-002` web target only.
- `SEC-W1-001` requires decision gate closure (deprecate vs rotate where still used).

## Fast Manual Execution Checklist (UI Path)

1. App mobile (`restaurante-app`) -> Expo/EAS env
- Set `CURSOR_SECRET`
- Build new app artifact

2. Railway Dashboard -> project restaurante-supabase -> service restaurante-web -> Variables
- Set `CURSOR_SECRET`

3. Wait for redeploy and run controlled smoke
- Login/auth path
- Cursor pagination path
- Sentry errors for missing key/secret should be absent

## Completion Gate for Week 1

Week 1 can be marked fully closed when both are true:
- SEC-W1-001 decision gate closed (deprecate or rotate only where runtime applies)
- SEC-W1-002 variables configured + smoke evidence recorded
