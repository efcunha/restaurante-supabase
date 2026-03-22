# Agent Skills for GitHub Copilot

This workspace includes the Callstack Agent Skills repository at `.github/agent-skills`.
This setup also uses a local project-specific skill at `c:\Users\ECUNHA\.copilot\skills\restaurante-supabase\SKILL.md`.
This workspace also includes the UI/UX Pro Max Copilot workflow at `.github/prompts/ui-ux-pro-max/PROMPT.md`.

When working in this repository, consult the relevant skill before proposing or implementing changes.

## Repository Context

- `restaurante-app/` is the React Native and Expo mobile app.
- `restaurante-web/` is the web project and may mirror some mobile flows, but React Native guidance should only be applied where relevant.
- `restaurante-ops/` is the SaaS operations/admin service (auth, metrics, billing and operational reconciliation).
- Prefer solutions that fit the current repository structure and existing patterns.

## Project Guardrails Snapshot (Synced from Skill)

Source of truth:
- `c:\Users\ECUNHA\.copilot\skills\restaurante-supabase\SKILL.md`

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
- Avoid duplicate `.neq` filters for the same field in Supabase/PostgREST queries (can lead to 400).
- If `webhook=200` but no payment row inserted, validate `code_delivery_payment` inputs and flow publish/enabled status.
- In `restaurante-ops` reconcile flow, keep `public.reconcile_billing_event_atomic` as the single write path for invoice/subscription/webhook/audit updates.
- In monorepo deploys for `restaurante-ops`, use `railway up --service restaurante-ops --path-as-root ./restaurante-ops` to avoid root autodetection failures.
- Supabase CLI is installed via Scoop (`C:\Users\ECUNHA\scoop\shims\supabase.exe`); avoid `npm install -g supabase` (unsupported by Supabase).
- Migration sync policy: whenever a new migration file is created, apply it to the target DB immediately and verify it appears in migration history.

Maintenance policy for these instruction files:
- Keep this file as orchestration/routing + concise guardrails.
- Keep detailed domain/implementation guidance in the project skill file.
- When rules change, update the skill first, then refresh this snapshot section.

## Skill Routing

### Primary project skill (always first)

For any task in this repository, start with:

- `c:\Users\ECUNHA\.copilot\skills\restaurante-supabase\SKILL.md`

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

- Keep `c:\Users\ECUNHA\.copilot\skills\restaurante-supabase\SKILL.md` as the source for repository architecture and domain constraints.
- Use the UI/UX Pro Max prompt to generate design-system recommendations and UI/UX guardrails for app or web surfaces.
- If both apply, combine them: repository skill first for constraints, then `/ui-ux-pro-max` for visual/design workflow.

#### Mandatory enforcement

- For any code change proposal, review, or implementation in this repository, consult `c:\Users\ECUNHA\.copilot\skills\restaurante-supabase\SKILL.md` first.
- Do not provide project-specific implementation guidance until this primary skill has been considered.
- If the task is specialized, combine the primary skill with the relevant Callstack skill.
- In case of conflict, prioritize the project-specific skill (`restaurante-supabase`) for domain and architecture decisions, and use Callstack skills as complementary technical references.
- If a required skill cannot be accessed, explicitly state that limitation and proceed with conservative recommendations aligned with existing repository patterns.

#### Mandatory enforcement for RN and CI topics

For tasks involving React Native, Expo, performance, upgrades, GitHub Actions, CI pipelines, build artifacts, PR workflow, branching, or `gh` CLI operations:

1. First consult `c:\Users\ECUNHA\.copilot\skills\restaurante-supabase\SKILL.md`.
2. Then consult the corresponding Callstack skill:
	- RN performance/rendering/bundle/profiling -> `.github/agent-skills/skills/react-native-best-practices/SKILL.md`
	- RN/Expo upgrade path -> `.github/agent-skills/skills/upgrading-react-native/SKILL.md`
	- CI/GitHub Actions/build artifacts -> `.github/agent-skills/skills/github-actions/SKILL.md`
	- PR flow/branching/gh CLI -> `.github/agent-skills/skills/github/SKILL.md`
	- Brownfield native/Expo integration path -> `.github/agent-skills/skills/react-native-brownfield-migration/SKILL.md`
3. Do not answer with implementation-level recommendations until both checks above are completed.
4. If any required skill cannot be accessed, explicitly state the missing file and provide a conservative fallback aligned with existing repository patterns.
5. For substantial implementation guidance, explicitly mention which skill(s) were consulted before presenting the solution.

Hard-stop gate:

- If the required skill checks are not completed, do not provide implementation steps, code suggestions, or migration commands.
- In that case, respond only with the missing-skill limitation block from the mandatory response format.

### React Native and Expo work

For React Native performance, rendering, memory, bundle, startup, and profiling topics, start with:

- `.github/agent-skills/skills/react-native-best-practices/SKILL.md`

Then use detailed references from:

- `.github/agent-skills/skills/react-native-best-practices/references/`

Rules:

- Measure before optimizing when the issue is performance-related.
- Prefer targeted fixes over broad rewrites.
- For large lists, evaluate FlashList or other virtualization guidance from the skill.
- For rendering bottlenecks, use profiling guidance before introducing memoization.

### React Native upgrades

For React Native, Expo SDK, CocoaPods, Gradle, and template-diff upgrade tasks, start with:

- `.github/agent-skills/skills/upgrading-react-native/SKILL.md`

Then use detailed references from:

- `.github/agent-skills/skills/upgrading-react-native/references/`

Rules:

- Follow the documented upgrade sequence.
- Use canonical template diffs and validate native changes explicitly.
- Keep upgrade verification separate from unrelated refactors.

### GitHub Actions and CI builds

For GitHub Actions workflows, build artifacts, CI download flows, and mobile build automation, start with:

- `.github/agent-skills/skills/github-actions/SKILL.md`

Then use detailed references from:

- `.github/agent-skills/skills/github-actions/references/`

### GitHub workflow operations

For pull requests, stacked PRs, branch management, and `gh` CLI usage, start with:

- `.github/agent-skills/skills/github/SKILL.md`

Then use detailed references from:

- `.github/agent-skills/skills/github/references/`

### Brownfield migration

For incremental migration between native and React Native or Expo integration in native apps, start with:

- `.github/agent-skills/skills/react-native-brownfield-migration/SKILL.md`

Then use detailed references from:

- `.github/agent-skills/skills/react-native-brownfield-migration/references/`

## How to Use These Skills in Chat

When deeper context is needed, explicitly reference the relevant skill file in chat, for example:

- `#file:.github/agent-skills/skills/react-native-best-practices/SKILL.md`
- `#file:.github/agent-skills/skills/github-actions/SKILL.md`

Start with the main `SKILL.md` file, then open individual reference files for implementation details.

For UI/UX workflow usage, explicitly reference `.github/prompts/ui-ux-pro-max/PROMPT.md` or invoke `/ui-ux-pro-max` in chat.

## Mandatory Response Format (RN/CI)

For RN/CI-related implementation guidance, start the response with a short checklist block before any recommendation:

```text
Skills consulted:
- c:\Users\ECUNHA\.copilot\skills\restaurante-supabase\SKILL.md
- <one relevant Callstack SKILL.md path>

Scope:
- <what part of the codebase is affected>

Decision basis:
- <1-2 bullets summarizing why this approach matches project + specialized skill>
```

If a required skill file is not accessible, replace the checklist with:

```text
Skills consulted:
- c:\Users\ECUNHA\.copilot\skills\restaurante-supabase\SKILL.md (status: OK/FAILED)
- <required Callstack SKILL.md path> (status: FAILED)

Limitation:
- Could not access required skill file(s): <path>

Fallback:
- Provide conservative guidance aligned with existing repository patterns only.
```

## Quick Prompts (RN/CI)

Use these prompts in Copilot Chat to force explicit skill context:

```text
#file:c:\Users\ECUNHA\.copilot\skills\restaurante-supabase\SKILL.md
#file:.github/agent-skills/skills/react-native-best-practices/SKILL.md
#file:restaurante-app/src/screens/NovoPedidoScreen.tsx

Profile this screen and propose a measured optimization plan with no behavior changes.
```

```text
#file:c:\Users\ECUNHA\.copilot\skills\restaurante-supabase\SKILL.md
#file:.github/agent-skills/skills/upgrading-react-native/SKILL.md

Plan an Expo SDK + React Native upgrade path for this repository with risk checklist and verification gates.
```

```text
#file:c:\Users\ECUNHA\.copilot\skills\restaurante-supabase\SKILL.md
#file:.github/agent-skills/skills/github-actions/SKILL.md

Create a GitHub Actions workflow to build Android emulator APK and iOS simulator artifacts and document download commands.
```

```text
#file:c:\Users\ECUNHA\.copilot\skills\restaurante-supabase\SKILL.md
#file:.github/agent-skills/skills/github/SKILL.md

Propose a safe stacked PR merge plan with gh CLI commands for this branch chain.
```

```text
#file:c:\Users\ECUNHA\.copilot\skills\restaurante-supabase\SKILL.md
#file:.github/agent-skills/skills/react-native-brownfield-migration/SKILL.md

Design a phased brownfield integration plan for adding Expo features into an existing native app path.
```

## Quick Prompts by Target (App/Web)

Use these variants when you want explicit scope by codebase area.

### Mobile app (`restaurante-app`)

```text
#file:c:\Users\ECUNHA\.copilot\skills\restaurante-supabase\SKILL.md
#file:.github/agent-skills/skills/react-native-best-practices/SKILL.md
#file:restaurante-app/src/screens/NovoPedidoScreen.tsx

Review this screen for render bottlenecks, propose measured optimizations, and keep behavior unchanged.
```

```text
#file:c:\Users\ECUNHA\.copilot\skills\restaurante-supabase\SKILL.md
#file:.github/agent-skills/skills/upgrading-react-native/SKILL.md
#file:restaurante-app/package.json

Plan a safe Expo SDK + React Native upgrade path for this app with risks, checkpoints, and rollback criteria.
```

### Web app (`restaurante-web`)

```text
#file:c:\Users\ECUNHA\.copilot\skills\restaurante-supabase\SKILL.md
#file:.github/agent-skills/skills/github-actions/SKILL.md
#file:restaurante-web/playwright.config.ts

Propose CI changes to build and publish emulator/simulator artifacts and include artifact download commands.
```

```text
#file:c:\Users\ECUNHA\.copilot\skills\restaurante-supabase\SKILL.md
#file:.github/agent-skills/skills/github/SKILL.md
#file:restaurante-web/e2e/delivery.spec.ts

Create a safe stacked PR plan for this area, including gh CLI commands and merge order.
```

## Usage Runbook

Use this order to keep responses consistent with mandatory skill checks:

1. Choose scope first (`restaurante-app` or `restaurante-web`) and attach one real target file.
2. Attach the primary project skill: `#file:c:\Users\ECUNHA\.copilot\skills\restaurante-supabase\SKILL.md`.
3. Attach exactly one specialized Callstack skill matching the task type.
4. Ask for a constrained output (plan, checklist, or implementation with no behavior change).
5. Verify the response starts with the mandatory RN/CI checklist block.

## Supabase Migration Workflow (Mandatory)

Use this workflow for any schema/function/index change in Supabase to avoid drift between repository and database.

1. Create migration first (before manual SQL in dashboard):

```bash
supabase migration new <migration_name_in_snake_case>
```

2. Add SQL to the generated file in `database-backup/migrations/`.
3. Apply migration immediately to the target DB (same work session).
4. Verify migration is registered in remote history (`supabase_migrations.schema_migrations` / `list_migrations`).
5. Commit migration file in the same PR as the feature/fix.

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

Task-to-skill quick map:

- RN performance or rendering -> `.github/agent-skills/skills/react-native-best-practices/SKILL.md`
- RN/Expo upgrade -> `.github/agent-skills/skills/upgrading-react-native/SKILL.md`
- CI/build artifacts -> `.github/agent-skills/skills/github-actions/SKILL.md`
- PR workflow/branching -> `.github/agent-skills/skills/github/SKILL.md`
- Brownfield integration -> `.github/agent-skills/skills/react-native-brownfield-migration/SKILL.md`