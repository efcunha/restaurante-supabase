# Awesome Copilot - Squad Matrix - 2026-04-20

## Objetivo

Definir uso pratico por squad para recursos do awesome-copilot sem violar os guardrails do monorepo.

## Regra de precedencia (obrigatoria)

1. Comecar sempre por `.github/skills/restaurante-supabase/SKILL.md`.
2. Para RN/CI, usar skills locais especializadas como fonte primaria:
   - `.github/skills/react-native-best-practices/SKILL.md`
   - `.github/skills/github-actions/SKILL.md`
3. Plugins do awesome-copilot entram como complemento (planejamento, scaffolding de testes, revisao de prompt).
4. Em conflito, vencem regras locais: `company_id`, RLS, idempotencia de billing, LGPD e rollout guardado em producao.

## Matriz por squad

| Squad                                  | Escopo principal                              | Skills locais (prioridade)                                                        | Plugin/skill awesome-copilot (complemento)                                                                                                | Quando usar                                                                                    |
| -------------------------------------- | --------------------------------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| App (restaurante-app)                  | RN/Expo, UX mobile, fluxos operacionais       | `restaurante-supabase`, `react-native-best-practices`, `ui-ux-pro-max`            | `project-planning/create-implementation-plan`, `testing-automation/playwright-generate-test`                                              | Planejar refactor de fluxo, validar cenarios espelhados app/web e preparar cobertura de testes |
| Web (restaurante-web/restaurante-site) | Expo Web, E2E Playwright, UI publica/admin    | `restaurante-supabase`, `github-actions`, `ui-ux-pro-max`                         | `testing-automation/playwright-explore-website`, `testing-automation/playwright-generate-test`, `project-planning/create-technical-spike` | Gerar casos E2E, investigar regressao de UI e estruturar spikes tecnicos                       |
| Ops (restaurante-ops)                  | Auth, billing, reconciliacao, observabilidade | `restaurante-supabase` (fallback conservador para especializacoes nao instaladas) | `project-planning/create-implementation-plan`, `security-best-practices/ai-prompt-engineering-safety-review`                              | Mudancas de risco em auth/billing, revisao de prompts e planos com checklist de seguranca      |
| Platform/CI (monorepo)                 | Workflows, releases, qualidade                | `restaurante-supabase`, `github-actions`                                          | `project-planning/update-implementation-plan`                                                                                             | Quebrar entregas em fases verificaveis e ajustar planos de implementacao                       |

## Playbook rapido por tipo de demanda

### 1) Nova feature sensivel (auth, billing, RLS)

1. Ler skill local `restaurante-supabase`.
2. Abrir plano com `project-planning/create-implementation-plan`.
3. Rodar gate de prompt com `security-best-practices/ai-prompt-engineering-safety-review`.
4. Implementar com evidencias no mesmo ciclo (smoke e docs).

### 2) Regressao funcional em fluxo critico

1. Confirmar invariantes da skill local (`Balcao`, `Mesa`, `Delivery`, `Montagem`).
2. Usar `project-planning/create-technical-spike` para reduzir desconhecidos.
3. Cobrir com testes (quando aplicavel, `testing-automation/playwright-generate-test`).

### 3) Tarefa de qualidade/planejamento continuo

1. Revisar plano atual com `project-planning/update-implementation-plan`.
2. Atualizar checkpoints e criterios de validacao antes de codigo novo.

## Plugins instalados e estado

- `awesome-copilot@awesome-copilot`: meta descoberta de skills/instructions/agents.
- `project-planning@awesome-copilot`: instalado e recomendado para planejamento.
- `testing-automation@awesome-copilot`: instalado e recomendado para suporte de testes.
- `security-best-practices@awesome-copilot`: instalado e recomendado para revisao de prompt de risco.

## Limites e riscos conhecidos

- Nao usar templates genericos sem conferir guardrails do projeto.
- Nao substituir validacao de producao controlada por sugestoes de plugin.
- Nao assumir staging dedicado: politica atual e producao com rollout guardado.
