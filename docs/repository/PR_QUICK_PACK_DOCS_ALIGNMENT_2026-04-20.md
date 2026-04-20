# PR Quick Pack - Docs Alignment (2026-04-20)

## Suggested PR Title

chore(docs): align runbooks with production-only validation policy

## Short PR Description

This PR aligns active runbooks and instruction docs with the current environment policy: no dedicated staging exists, so sensitive validations must run via controlled production checks and guarded rollout.

It also synchronizes LicenseGate/billing guidance with Q2 security tracking and removes ambiguous CLI wording in CI documentation.

Scope is documentation-only. No runtime logic, schema, or infrastructure behavior was changed.

## Merge Checklist

- [ ] Reviewed changed docs for operational consistency
- [ ] Confirmed no active staging-first instructions remain in updated runbooks
- [ ] Confirmed LicenseGate and billing go-live guidance matches Q2 docs
- [ ] Confirmed no secrets or credentials were introduced in docs
- [ ] Confirmed docs-only scope (no app/runtime behavior change)
- [ ] Linked detailed PR description: docs/repository/PR_DESCRIPTION_DOCS_ALIGNMENT_2026-04-20.md
- [ ] Linked staging references classification: docs/repository/STAGING_REFERENCES_CLASSIFICATION_2026-04-20.md

## Optional Commit Message

chore(docs): normalize staging references to controlled production checks
