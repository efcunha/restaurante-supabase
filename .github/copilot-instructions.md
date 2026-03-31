# Agent Skills for GitHub Copilot

This setup uses a local project-specific skill at `.github\skills\restaurante-supabase\SKILL.md`.
This workspace also includes the UI/UX Pro Max Copilot workflow at `.github/prompts/ui-ux-pro-max/PROMPT.md`.

When working in this repository, consult the relevant skill before proposing or implementing changes.

## Repository Context

- `restaurante-app/` is the React Native and Expo mobile app.
- `restaurante-web/` is the web project and may mirror some mobile flows, but React Native guidance should only be applied where relevant.
- `restaurante-ops/` is the SaaS operations/admin service (auth, metrics, billing and operational reconciliation).
- Prefer solutions that fit the current repository structure and existing patterns.

## Project Guardrails Snapshot (Synced from Skill)

Source of truth:
- `.github/skills/restaurante-supabase/SKILL.md`

Critical rules to always enforce in this repository:
- Multi-tenant safety first: all data access must respect `company_id` and Supabase RLS.
- Never hardcode secrets in source code (especially integration/webhook steps).
- Protect critical flows (`Balcao`, `Mesa`, `Delivery`, `Montagem`) from behavior regressions.
- Protect remuneration flows (`subscriptions`, `invoices`, `payment_methods`, `webhook_events`, `billing_audit_log`) from behavioral regressions.
- Preserve app/web parity for mirrored modules; avoid one-sided refactors when both sides are equivalent.
- For new UI, use design tokens and stable exports (`src/ui/`) instead of ad-hoc styling.
- Use feature flags for rollout/rollback (`*_UI_NEXT`) and promote canary waves in order.

Operational reminders from recent incidents:
- Delivery completion logic must reconcile payment + comanda closure, not only order status.
- In `orders`, cancellation status is `cancelled`; keep `cancelada` semantics for comanda state only.
- In `product_adicionais`, category constraints (`selection_type`, `max_choices`) must stay consistent per `company_id + product_id + category`; if inconsistent at runtime, enforce fail-safe by smallest positive `max_choices`.
- Avoid duplicate `.neq` filters for the same field in Supabase/PostgREST queries (can lead to 400).
- If `webhook=200` but no payment row inserted, validate `code_delivery_payment` inputs and flow publish/enabled status.
- In `restaurante-ops` reconcile flow, keep `public.reconcile_billing_event_atomic` as the single write path for invoice/subscription/webhook/audit updates.
- In monorepo deploys for `restaurante-ops`, use `railway up --service restaurante-ops --path-as-root ./restaurante-ops` to avoid root autodetection failures.
- Supabase CLI is installed via Scoop (`C:\Users\ECUNHA\scoop\shims\supabase.exe`); avoid `npm install -g supabase` (unsupported by Supabase).
- Migration sync policy: whenever a new migration file is created, apply it to the target DB immediately and verify it appears in migration history.
- **Migration Reference**: For complete list of applied migrations, see `.github/skills/restaurante-supabase/SKILL.md` section "Banco de Dados — Migracoes de referencia". Snapshot below lists only critical hardening migrations.
- Security docs generated on 2026-03-23: `docs/security/SECURITY_AUDIT_REPORT_2026-03-23.md`, `docs/security/REMEDIATION_PLAN_DETAILED.md`, `docs/security/LGPD_COMPLIANCE_GUIDE.md`, `docs/security/EXECUTIVE_SUMMARY_PT.md`, `docs/security/SECURITY_DOCUMENTATION_INDEX.md`.
- Secrets hardening implemented: use `database-backup/.env.local` (gitignored) + `database-backup/.env.example`; legacy `config.local.sh`/`config.example.sh` removed.
- `profiles` hardening implemented in `database-backup/migrations/20260323183000_harden_profiles_rls_and_role_guardrails.sql` and applied remotely.
- `product_adicionais` normalization hardening implemented in `database-backup/migrations/20260329113000_normalize_product_adicionais_category_constraints.sql` and applied/remotely registered (`supabase_migrations.schema_migrations`).
- `product_adicionais` null/trigger fix applied in `database-backup/migrations/20260329140000_fix_adicionais_unico_null_and_trigger.sql` (uniqueness constraint + trigger correction for null category edge cases).
- `public.profiles` now uses restrictive policies (self + admin/gerente same-company), no longer `SELECT USING (true)`.
- `handle_new_user` and role checks were aligned to canonical roles (`admin`, `gerente`, `garcom`, `cozinheiro`, `montagem`, `entregador`, `caixa`) with legacy alias normalization.
- `LicenseGate` component exists in app/web (`restaurante-app/src/components/LicenseGate.tsx` + `restaurante-web/src/components/LicenseGate.tsx`) but does NOT yet wrap operational screens (`NovoPedidoScreen`, `ComandaGerenciamentoScreen`, `RotasDeliveryScreen`). Do NOT set `billing_enabled=true` in production until this coverage is complete.
- Environment policy: there is currently no dedicated staging environment; deployments and validations run directly in production.
- Production-only rule: for sensitive changes (security, auth, billing, RLS, CORS, rate limiting), require guarded rollout, smoke tests, and explicit evidence docs update in the same work cycle.

Consolidated security hardening snapshot (2026-03-24):
- CORS hardening applied in Supabase Edge Functions: request-scoped allowlist, no wildcard fallback.
- E2E secret hardening applied: removed hardcoded Supabase keys/URLs from tests and switched to env-based resolution.
- `restaurante-ops` rate limiting hardening applied: Redis-first limiter, strict fail-closed option (`RATE_LIMIT_FALLBACK_ENABLED=false`) and explicit 503 handling when limiter backend is unavailable.
- Production validation completed for login path on `https://ops.restaurante-web.app.br`: threshold enforcement confirmed with HTTP 429 + required headers.
- Billing remains not live in production; billing-specific 429/503 validation is required in staging-equivalent controlled checks before production go-live.

Maintenance policy for these instruction files:
- Keep this file as orchestration/routing + concise guardrails.
- Keep detailed domain/implementation guidance in the project skill file.
- When rules change, update the skill first, then refresh this snapshot section.

## Skill Routing

### Primary project skill (always first)

For any task in this repository, start with:

- `.github\skills\restaurante-supabase\SKILL.md`

Use this as the main source for domain rules, architecture, naming, and feature-specific constraints for this project.

Then route to Callstack skills for specialized guidance (performance, upgrades, CI, GitHub workflow, brownfield migration).

### UI/UX workflow

For UI/UX design direction, visual exploration, design system generation, or interface quality reviews:

- Use `.github/prompts/ui-ux-pro-max/PROMPT.md`
- Invoke it in GitHub Copilot with `/ui-ux-pro-max <pedido>`
- Team shortcut guide: `.github/prompts/ui-ux-pro-max/ATALHO-USO-INTERNO.md`
- Team execution pack: `.github/prompts/ui-ux-pro-max/PACK-EXECUCAO-UIUX.md`
- Team onboarding index: `.github/prompts/ui-ux-pro-max/ONBOARDING-UIUX.md`

Usage rules:

- Keep `.github\skills\restaurante-supabase\SKILL.md` as the source for repository architecture and domain constraints.
- Use the UI/UX Pro Max prompt to generate design-system recommendations and UI/UX guardrails for app or web surfaces.
- If both apply, combine them: repository skill first for constraints, then `/ui-ux-pro-max` for visual/design workflow.

#### Mandatory enforcement

- For any code change proposal, review, or implementation in this repository, consult `.github/skills/restaurante-supabase/SKILL.md` first.
- Do not provide project-specific implementation guidance until this primary skill has been considered.
- If the task is specialized, combine the primary skill with the relevant Callstack skill.
- In case of conflict, prioritize the project-specific skill (`restaurante-supabase`) for domain and architecture decisions, and use Callstack skills as complementary technical references.
- If a required skill cannot be accessed, explicitly state that limitation and proceed with conservative recommendations aligned with existing repository patterns.
- For requests involving problem/code analysis or implementation of a new flow, feature, or resource, apply the "Modo de Atuacao: Desenvolvedor Full Stack Senior" from `.github/skills/restaurante-supabase/SKILL.md`.
- In these requests, prioritize repository guardrails first (security, multi-tenant, `company_id`, RLS, critical flows, and billing integrity).

#### Mandatory enforcement for RN and CI topics

For tasks involving React Native, Expo, performance, upgrades, GitHub Actions, CI pipelines, build artifacts, PR workflow, branching, or `gh` CLI operations:

1. First consult `.github\skills\restaurante-supabase\SKILL.md`.
2. Then consult the corresponding Callstack skill:
	> **STATUS: `.github/agent-skills/` is not installed in this repository. Use local repository skills when available and conservative fallback for the remaining topics.**
	- RN performance/rendering/bundle/profiling -> `.github/skills/react-native-best-practices/SKILL.md` (**INSTALLED LOCAL SKILL**)
	- RN/Expo upgrade path -> no dedicated local skill installed; use primary project skill + conservative fallback
	- CI/GitHub Actions/build artifacts -> `.github/skills/github-actions/SKILL.md` (**INSTALLED LOCAL SKILL**)
	- PR flow/branching/gh CLI -> no dedicated local skill installed; use primary project skill + conservative fallback
	- Brownfield native/Expo integration path -> no dedicated local skill installed; use primary project skill + conservative fallback
3. Do not answer with implementation-level recommendations until both checks above are completed.
4. If any required skill cannot be accessed, explicitly state the missing file and provide a conservative fallback aligned with existing repository patterns.
5. For substantial implementation guidance, explicitly mention which skill(s) were consulted before presenting the solution.

Hard-stop gate:

- If Callstack skill files cannot be accessed due to a transient I/O error, apply conservative fallback aligned with existing repository patterns rather than blocking entirely.
- Start the response with the missing-skill limitation block from the mandatory response format, stating which file could not be read.
- Full block (no implementation steps) applies only when the **primary project skill** (`.github\skills\restaurante-supabase\SKILL.md`) cannot be accessed.

### React Native and Expo work

> **INSTALLED LOCAL SKILL**: `.github/skills/react-native-best-practices/SKILL.md`

For React Native performance, rendering, memory, bundle, startup, and profiling topics, start with:

- `.github/skills/react-native-best-practices/SKILL.md`

Then use detailed references from:

- no dedicated `references/` subtree is installed for this skill in this repository; apply conservative fallback aligned with existing patterns

Rules:

- Measure before optimizing when the issue is performance-related.
- Prefer targeted fixes over broad rewrites.
- For large lists, evaluate FlashList or other virtualization guidance from the skill.
- For rendering bottlenecks, use profiling guidance before introducing memoization.

### React Native upgrades

> **NOT INSTALLED**: `.github/agent-skills/skills/upgrading-react-native/SKILL.md` — apply conservative fallback aligned with existing patterns.

For React Native, Expo SDK, CocoaPods, Gradle, and template-diff upgrade tasks, start with:

- `.github/agent-skills/skills/upgrading-react-native/SKILL.md` (**NOT INSTALLED**)

Then use detailed references from:

- `.github/agent-skills/skills/upgrading-react-native/references/` (**NOT INSTALLED**)

Rules:

- Follow the documented upgrade sequence.
- Use canonical template diffs and validate native changes explicitly.
- Keep upgrade verification separate from unrelated refactors.

### GitHub Actions and CI builds

> **INSTALLED LOCAL SKILL**: `.github/skills/github-actions/SKILL.md`

For GitHub Actions workflows, build artifacts, CI download flows, and mobile build automation, start with:

- `.github/skills/github-actions/SKILL.md`

Then use detailed references from:

- no dedicated `references/` subtree is installed for this skill in this repository; apply conservative fallback aligned with existing patterns

### GitHub workflow operations

> **NOT INSTALLED**: no dedicated local skill for GitHub workflow operations is installed in this repository; apply conservative fallback aligned with existing patterns.

For pull requests, stacked PRs, branch management, and `gh` CLI usage, start with:

- `.github/skills/restaurante-supabase/SKILL.md`

Then use detailed references from:

- no dedicated `references/` subtree is installed for GitHub workflow operations in this repository; apply conservative fallback aligned with existing patterns

### Brownfield migration

> **NOT INSTALLED**: no dedicated local skill for brownfield migration is installed in this repository; apply conservative fallback aligned with existing patterns.

For incremental migration between native and React Native or Expo integration in native apps, start with:

- `.github/skills/restaurante-supabase/SKILL.md`

Then use detailed references from:

- no dedicated `references/` subtree is installed for brownfield migration in this repository; apply conservative fallback aligned with existing patterns

## How to Use These Skills in Chat

When deeper context is needed, explicitly reference the relevant skill file in chat, for example:

- `#file:.github/skills/react-native-best-practices/SKILL.md` 
- `#file:.github/skills/github-actions/SKILL.md`

Start with the main `SKILL.md` file, then open individual reference files for implementation details.

For UI/UX workflow usage, explicitly reference `.github/prompts/ui-ux-pro-max/PROMPT.md` or invoke `/ui-ux-pro-max` in chat.

## Context7 Skill Routing (Library Docs)

> **STATUS: Context7 MCP tools available** — Use when querying external library documentation. Fall back to web search only if Context7 is transientally unavailable.

For any request involving library/framework API docs, setup instructions, version-specific usage, or code generation based on external packages:

- Prefer Context7 MCP tools first (`mcp_context7_resolve-library-id` then `mcp_context7_query-docs`).
- Resolve the library ID before querying docs unless the user already provides an explicit Context7 ID (`/org/project` or `/org/project/version`).
- Favor Context7 output over memory-based API recall when there is potential version drift.
- If Context7 is unavailable (transient error), state the limitation and provide conservative guidance backed by local files or memory.

Examples of Context7 queries:
- Supabase Auth setup for latest version
- React Native 0.84.0 API reference
- TypeScript 5.x strict mode rules
- Expo Router latest navigation patterns

Prompt pattern to force Context7 usage:

```text
Use Context7 for this request.
Library: <name>
Task: <what you need>
Version (optional): <x.y.z>
```

## Mandatory Response Format (RN/CI)

For RN/CI-related implementation guidance, start the response with a short checklist block before any recommendation:

```text
Skills consulted:
- .github\skills\restaurante-supabase\SKILL.md
- <one relevant specialized SKILL.md path>

Scope:
- <what part of the codebase is affected>

Decision basis:
- <1-2 bullets summarizing why this approach matches project + specialized skill>
```

If a required skill file is not accessible, replace the checklist with:

```text
Skills consulted:
- .github\skills\restaurante-supabase\SKILL.md (status: OK/FAILED)
- <required specialized SKILL.md path> (status: FAILED)

Limitation:
- Could not access required skill file(s): <path>

Fallback:
- Provide conservative guidance aligned with existing repository patterns only.
```

## Quick Prompts (RN/CI)

Use these prompts in Copilot Chat to force explicit skill context:

```text
#file:.github/skills/restaurante-supabase/SKILL.md
#file:.github/skills/react-native-best-practices/SKILL.md
#file:restaurante-app/src/screens/NovoPedidoScreen.tsx

Profile this screen and propose a measured optimization plan with no behavior changes.
```

```text
#file:.github/skills/restaurante-supabase/SKILL.md
#file:restaurante-app/package.json

Plan an Expo SDK + React Native upgrade path for this repository with risk checklist and verification gates. No dedicated upgrade skill is installed in this repository, so use conservative fallback aligned with existing patterns.
```

```text
#file:.github/skills/restaurante-supabase/SKILL.md
#file:.github/skills/github-actions/SKILL.md

Create a GitHub Actions workflow to build Android emulator APK and iOS simulator artifacts and document download commands.
```

```text
#file:.github/skills/restaurante-supabase/SKILL.md
#file:restaurante-web/e2e/delivery.spec.ts

Propose a safe stacked PR merge plan with gh CLI commands for this branch chain. No dedicated GitHub workflow skill is installed in this repository, so use conservative fallback aligned with existing patterns.
```

```text
#file:.github/skills/restaurante-supabase/SKILL.md
#file:restaurante-app/package.json

Design a phased brownfield integration plan for adding Expo features into an existing native app path. No dedicated brownfield migration skill is installed in this repository, so use conservative fallback aligned with existing patterns.
```

## Quick Prompts by Target (App/Web)

Use these variants when you want explicit scope by codebase area.

### Mobile app (`restaurante-app`)

```text
#file:.github/skills/restaurante-supabase/SKILL.md
#file:.github/skills/react-native-best-practices/SKILL.md
#file:restaurante-app/src/screens/NovoPedidoScreen.tsx

Review this screen for render bottlenecks, propose measured optimizations, and keep behavior unchanged.
```

```text
#file:.github/skills/restaurante-supabase/SKILL.md
#file:restaurante-app/package.json

Plan a safe Expo SDK + React Native upgrade path for this app with risks, checkpoints, and rollback criteria. No dedicated upgrade skill is installed in this repository, so use conservative fallback aligned with existing patterns.
```

### Web app (`restaurante-web`)

```text
#file:.github/skills/restaurante-supabase/SKILL.md
#file:.github/skills/github-actions/SKILL.md
#file:restaurante-web/playwright.config.ts

Propose CI changes to build and publish emulator/simulator artifacts and include artifact download commands.
```

```text
#file:.github/skills/restaurante-supabase/SKILL.md
#file:restaurante-web/e2e/delivery.spec.ts

Create a safe stacked PR plan for this area, including gh CLI commands and merge order. No dedicated GitHub workflow skill is installed in this repository, so use conservative fallback aligned with existing patterns.
```

## Usage Runbook

Use this order to keep responses consistent with mandatory skill checks:

1. Choose scope first (`restaurante-app` or `restaurante-web`) and attach one real target file.
2. Attach the primary project skill: `#file:.github/skills/restaurante-supabase/SKILL.md`.
3. Attach exactly one specialized skill matching the task type when available in the repository.
4. Ask for a constrained output (plan, checklist, or implementation with no behavior change).
5. Verify the response starts with the mandatory RN/CI checklist block.

## Supabase Migration Workflow (Mandatory)

Use this workflow for any schema/function/index change in Supabase to avoid drift between repository and database.

1. Create migration first (before manual SQL in dashboard):

```bash
# Preferred (monorepo): create versioned file in database-backup/migrations first.
# If using Supabase CLI scaffolding locally, run from database-backup/supabase.
cd database-backup/supabase
supabase migration new <migration_name_in_snake_case>
```

2. Keep `database-backup/migrations/` as source-of-truth for committed migrations.
3. Apply migration immediately to the target DB (same work session).
4. Verify migration is registered in remote history (`supabase_migrations.schema_migrations` / `list_migrations`).
5. Validate drift status with `database-backup/check-migration-sync.sh`.
6. Commit migration file in the same PR as the feature/fix.
7. For RLS/security changes, validate remote `pg_policies`, changed function definitions, and key constraints after apply.

Remote-truth rule:

- If local `schema_dump.sql` and production behavior diverge, validate against remote catalog (`pg_policies`, `pg_constraint`, `pg_proc`) before final recommendations.
- Do not downgrade a confirmed remote risk to hypothetical based only on local dump files.

Fallback if `supabase` is not in PATH in a fresh terminal:

```bash
C:\Users\ECUNHA\scoop\shims\supabase.exe --version
```

### Emergency SQL Runbook (Manual SQL already executed)

If SQL was applied manually in the database:

1. Create a reconciliation migration file with the same intent.
2. Register/sync its version in migration history when needed.
3. Document why manual SQL was required.
4. Confirm local migration list and remote migration history are aligned before merge/deploy.
