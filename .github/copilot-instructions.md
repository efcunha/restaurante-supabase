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