# Awesome Copilot Integration - 2026-04-20

## Objetivo

Registrar a instalacao do marketplace `awesome-copilot` e o cruzamento com skills/documentacao existentes do monorepo.

## Status de instalacao

Instalado via Copilot CLI (escopo de usuario):

- `awesome-copilot@awesome-copilot`
- `project-planning@awesome-copilot`
- `testing-automation@awesome-copilot`
- `security-best-practices@awesome-copilot`

Comando usado:

```bash
copilot plugin install awesome-copilot@awesome-copilot
copilot plugin install project-planning@awesome-copilot
copilot plugin install testing-automation@awesome-copilot
copilot plugin install security-best-practices@awesome-copilot
```

## Cruzamento com o repositorio

### Fonte primaria obrigatoria (continua igual)

- `.github/skills/restaurante-supabase/SKILL.md`
- `.github/copilot-instructions.md`

### Skills locais ja instaladas (prioridade alta)

- `.github/skills/restaurante-supabase/SKILL.md`
- `.github/skills/react-native-best-practices/SKILL.md`
- `.github/skills/github-actions/SKILL.md`
- `.github/skills/ui-ux-pro-max/SKILL.md`

### Recursos do awesome-copilot com melhor aderencia

- `project-planning/skills/create-implementation-plan`
- `project-planning/skills/create-technical-spike`
- `project-planning/skills/update-implementation-plan`
- `testing-automation/skills/playwright-generate-test`
- `testing-automation/skills/playwright-explore-website`
- `security-best-practices/skills/ai-prompt-engineering-safety-review`

## Politica de precedencia

1. Regras do repositório sempre vencem (multi-tenant, `company_id`, RLS, billing idempotente, rollout guardado em producao, LGPD).
2. Skills locais do repositório sao primeira escolha para implementacao.
3. Awesome Copilot entra como acelerador de planejamento, teste e revisao.
4. Em caso de conflito entre templates genericos e regras internas, manter o padrao interno.

## Observacoes operacionais

- `gh skill` ainda nao esta disponivel no GitHub CLI local (`gh 2.89.0`), por isso foi usado `copilot plugin install`.
- Evitar vendorizar o repositorio `github/awesome-copilot` dentro deste monorepo.
- Preferir instalacao por usuario e documentacao de roteamento no `copilot-instructions.md`.
