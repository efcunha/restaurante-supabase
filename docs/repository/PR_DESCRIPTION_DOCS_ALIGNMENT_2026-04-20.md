# docs: align runbooks with production-only environment policy

## Summary

This PR aligns repository documentation with the current operational policy: there is no dedicated staging environment, and sensitive changes must use guarded rollout with controlled production validation.

## Why

Recent docs and instruction files had mixed guidance:

- Some runbooks still suggested staging-first execution.
- Core guardrails and security docs already state production-only validation for sensitive flows.
- This mismatch could cause operational confusion during incident response, billing/security checks, and rollout planning.

## Scope

Updated instruction/skill docs:

- `.github/copilot-instructions.md`
- `.github/skills/restaurante-supabase/SKILL.md`
- `.github/skills/github-actions/SKILL.md`

Updated operational docs:

- `docs/design-system/DOCUMENTATION_INDEX.md`
- `docs/design-system/MODERNIZATION_COMPLETE.md`
- `docs/design-system/NEXT_STEPS.md`
- `docs/design-system/DEPLOYMENT_GUIDE.md`
- `docs/LGPD/INCIDENT-RESPONSE-PLAN.md`
- `docs/TEF-Balança/PR3_VALIDACAO_SMOKE_TESTING_2026-04-13.md`
- `docs/saas-billing/mercadopago-edge-functions.md`
- `docs/security/SECURITY_AUDIT_REPORT_2026-03-23.md`

Added governance artifact:

- `docs/repository/STAGING_REFERENCES_CLASSIFICATION_2026-04-20.md`

## Key Changes

1. LicenseGate status synchronized with Q2 security documentation:

- Updated from "not yet covering operational screens" to "coverage documented as complete".
- Billing go-live guardrail remains unchanged: keep `billing_enabled=true` blocked until active subscription validation + controlled checks.

2. Security snapshot references updated:

- Added explicit Q2 remediation tracking docs to instruction snapshot.

3. Staging wording normalized in active runbooks:

- Replaced staging-first operational guidance with controlled production validation and guarded rollout.

4. CLI wording clarified:

- Removed ambiguous wording mixing Railway and Supabase CLI context in CI skill notes.

5. Staging references classification documented:

- New inventory file classifies references as operational-active, roadmap-future, or historical-evidence.

## Security Impact

- No code-path behavior changes.
- No secret handling changes in runtime logic.
- Documentation now better matches current security operating model, reducing execution risk caused by contradictory runbooks.

## Testing / Validation

Documentation validation performed via targeted text searches:

- Confirmed removal of active staging-first instructions in runbooks touched by this PR.
- Confirmed presence of controlled production wording in updated files.
- Confirmed consistency of LicenseGate/billing guidance with Q2 security docs.

## Risks

- Low risk (docs-only).
- Minor risk of over-normalizing historical docs; mitigated by keeping historical/audit context where appropriate and classifying references in the inventory doc.

## Rollback

- Revert this PR (docs-only) if wording needs further refinement.
- No database, infra, or application rollback required.

## Follow-ups (optional)

1. Add a docs lint/check to flag new "staging-first" wording in operational runbooks.
2. Include a short "Environment Policy" snippet template for future runbooks.
3. Review legacy audit docs quarterly to keep checklist snippets aligned with current operations.
