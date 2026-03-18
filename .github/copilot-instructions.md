# Agent Skills for GitHub Copilot

This workspace includes the Callstack Agent Skills repository at `.github/agent-skills`.
This setup also uses a local project-specific skill at `c:\Users\ECUNHA\.copilot\skills\restaurante-supabase\SKILL.md`.

When working in this repository, consult the relevant skill before proposing or implementing changes.

## Repository Context

- `restaurante-app/` is the React Native and Expo mobile app.
- `restaurante-web/` is the web project and may mirror some mobile flows, but React Native guidance should only be applied where relevant.
- Prefer solutions that fit the current repository structure and existing patterns.

## Skill Routing

### Primary project skill (always first)

For any task in this repository, start with:

- `c:\Users\ECUNHA\.copilot\skills\restaurante-supabase\SKILL.md`

Use this as the main source for domain rules, architecture, naming, and feature-specific constraints for this project.

Then route to Callstack skills for specialized guidance (performance, upgrades, CI, GitHub workflow, brownfield migration).

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