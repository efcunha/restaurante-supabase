# PR Master Pack - Docs Alignment (2026-04-20)

## 1) Suggested Title

chore(docs): align runbooks with production-only validation policy

## 2) Full Description (Detailed)

### Summary

This PR aligns repository documentation with the current operational policy: there is no dedicated staging environment, and sensitive changes must use guarded rollout with controlled production validation.

### Why

Recent docs and instruction files had mixed guidance:

- Some runbooks still suggested staging-first execution.
- Core guardrails and security docs already state production-only validation for sensitive flows.
- This mismatch could cause operational confusion during incident response, billing/security checks, and rollout planning.

### Scope

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

### Key Changes

1. LicenseGate status synchronized with Q2 security documentation.

- Updated from “not yet covering operational screens” to “coverage documented as complete”.
- Billing go-live guardrail remains unchanged: keep `billing_enabled=true` blocked until active subscription validation + controlled checks.

2. Security snapshot references updated.

- Added explicit Q2 remediation tracking docs to instruction snapshot.

3. Staging wording normalized in active runbooks.

- Replaced staging-first operational guidance with controlled production validation and guarded rollout.

4. CLI wording clarified.

- Removed ambiguous wording mixing Railway and Supabase CLI context in CI skill notes.

5. Staging references classification documented.

- New inventory file classifies references as operational-active, roadmap-future, or historical-evidence.

### Security Impact

- No code-path behavior changes.
- No secret handling changes in runtime logic.
- Documentation now better matches current security operating model, reducing execution risk caused by contradictory runbooks.

### Testing / Validation

Documentation validation performed via targeted text searches:

- Confirmed removal of active staging-first instructions in runbooks touched by this PR.
- Confirmed presence of controlled production wording in updated files.
- Confirmed consistency of LicenseGate/billing guidance with Q2 security docs.

### Risks

- Low risk (docs-only).
- Minor risk of over-normalizing historical docs; mitigated by keeping historical/audit context where appropriate and classifying references in the inventory doc.

### Rollback

- Revert this PR (docs-only) if wording needs further refinement.
- No database, infra, or application rollback required.

### Follow-ups (Optional)

1. Add a docs lint/check to flag new “staging-first” wording in operational runbooks.
2. Include a short “Environment Policy” snippet template for future runbooks.
3. Review legacy audit docs quarterly to keep checklist snippets aligned with current operations.

## 3) Short Description (Quick)

This PR aligns active runbooks and instruction docs with the current environment policy: no dedicated staging exists, so sensitive validations must run via controlled production checks and guarded rollout.

It also synchronizes LicenseGate/billing guidance with Q2 security tracking and removes ambiguous CLI wording in CI documentation.

Scope is documentation-only. No runtime logic, schema, or infrastructure behavior was changed.

## 4) Merge Checklist

- [ ] Reviewed changed docs for operational consistency
- [ ] Confirmed no active staging-first instructions remain in updated runbooks
- [ ] Confirmed LicenseGate and billing go-live guidance matches Q2 docs
- [ ] Confirmed no secrets or credentials were introduced in docs
- [ ] Confirmed docs-only scope (no app/runtime behavior change)
- [ ] Linked detailed PR description: docs/repository/PR_DESCRIPTION_DOCS_ALIGNMENT_2026-04-20.md
- [ ] Linked staging references classification: docs/repository/STAGING_REFERENCES_CLASSIFICATION_2026-04-20.md

## 5) Reviewer Note (2-3 lines)

This PR is docs-only and aligns runbooks/instructions with the current production-only environment policy (no dedicated staging).
Operational guidance now consistently uses controlled production checks + guarded rollout for sensitive flows.
No runtime behavior, schema, or infrastructure logic was changed.

## 6) Reviewer Note (1 line)

Docs-only alignment: removed staging-first operational guidance and normalized to controlled production validation with guarded rollout.

## 7) Audit FAQ

### 1) Why change staging references now?

Because active runbooks had conflicting operational instructions versus current policy. Aligning wording reduces execution risk and ambiguity in sensitive workflows.

### 2) Did this change production behavior?

No. This PR changes documentation only. No app/backend runtime logic, DB schema, migrations, infra config, or rollout flags were modified.

### 3) Are secrets or credentials affected?

No runtime secret changes. The docs reinforce separation of environments and secure secret handling patterns.

### 4) Does this enable billing in production?

No. Billing guardrails remain unchanged. `billing_enabled=true` stays blocked until active subscription validation and controlled go-live checks.

### 5) How was consistency validated?

Through targeted text searches and cross-check against security Q2 docs/instruction snapshot. Active runbooks were updated; historical/audit references were classified rather than blindly rewritten.

### 6) What if staging is created later?

Current docs already allow this as roadmap context. Operational runbooks can be re-baselined when a formal staging environment exists.

### 7) What is the rollback plan?

Revert docs commits. Since scope is documentation-only, there is no runtime rollback procedure required.

## 8) Copy/Paste PR Comment

Reviewed scope confirms documentation-only alignment.

- Environment policy normalized to controlled production checks (no dedicated staging).
- Security/billing guardrails preserved.
- No runtime or schema impact.

## 9) Optional Commit Message

chore(docs): normalize staging references to controlled production checks

## 10) Related Files

- `docs/repository/PR_DESCRIPTION_DOCS_ALIGNMENT_2026-04-20.md`
- `docs/repository/PR_QUICK_PACK_DOCS_ALIGNMENT_2026-04-20.md`
- `docs/repository/PR_REVIEWER_NOTE_AND_AUDIT_FAQ_2026-04-20.md`
- `docs/repository/STAGING_REFERENCES_CLASSIFICATION_2026-04-20.md`
