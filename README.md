# restaurante-supabase

Monorepo do ecossistema `restaurante-supabase`, com app POS, web POS, backoffice SaaS, billing, migrations e documentação operacional.

## Status Atual (2026-04-16)

### Monorepo Modernization ✅ Production Ready

**2026-04-16:** Modernização completa do monorepo com infraestrutura profissional:

- ✅ **pnpm 10.33 + Turborepo 2.9.6** para workspace orchestration
- ✅ **4 shared packages** (`@restaurante/ui`, `@restaurante/tokens`, `@restaurante/schemas`, `@restaurante/config`)
- ✅ **React Hook Form 7.x + Zod 4.x** para formulários type-safe
- ✅ **NativeWind 4.2.1** para Tailwind em React Native/Expo
- ✅ **Storybook 8.6.18** no root com Vite builder
- ✅ **Husky + lint-staged + commitlint** git hooks
- ✅ **TypeScript strict mode** com aliases calibrados
- ✅ **Zero breaking changes** — existindo flows continuam funcionando
- ✅ **Non-destructive** — fácil migração incremental

**Documentação da modernização:**

- **[GETTING_STARTED.md](./GETTING_STARTED.md)** — Guia rápido para desenvolvedores
- **[MONOREPO_MODERNIZATION.md](./MONOREPO_MODERNIZATION.md)** — Documentação técnica completa
- **[MODERNIZATION_COMPLETE.md](./MODERNIZATION_COMPLETE.md)** — Checklist de conclusão
- **[MODERNIZATION_INVENTORY.md](./MODERNIZATION_INVENTORY.md)** — Inventário de mudanças

**Verificação de mudanças:**

```bash
# Instalar e rodar localmente
pnpm install
pnpm dev              # Todos os apps em paralelo (Turbo)
pnpm storybook:web    # Storybook no localhost:6006

# Type-check global
pnpm typecheck

# Lint + format
pnpm lint
pnpm format
```

### Status PDV & Billing (2026-04-08)

- Integracao PDV (maquininha) com simplificacao de UX concluida em app e web.
- `restaurante-web` publicado em producao no Railway com healthcheck OK.
- Build Android `preview` concluido no EAS para `restaurante-app`.
- Gate de TypeScript do `restaurante-app` reabilitado (`npm run type-check` sem erros).
- Snyk Code Scan executado nos arquivos alterados sem novos issues.
- Smoke E2E web de fluxos criticos (`balcao`, `mesa`, `pizza`, `delivery`, `mesa-consolidacao`) executado com sucesso.

**Referencias de continuidade:**

- `docs/PROMPT_CONTINUACAO_DIA_SEGUINTE.md`
- `docs/maquininha/04-plano-execucao-testes-rollout.md`

## Estrutura principal

- `restaurante-app/`: app mobile React Native + Expo
- `restaurante-web/`: app web / Expo Web + E2E
- `restaurante-ops/`: backoffice SaaS / auth / metrics / billing operations
- `database-backup/`: migrations, backup, restore e Edge Functions
- `docs/saas-billing/`: documentação de domínio e arquitetura de billing
- `docs/`: documentação transversal do monorepo (inclui `design-system/`, `saas-billing/` e `scripts/`)
- `docs/scripts/`: scripts utilitários de nível monorepo

## Entradas recomendadas

- `docs/README.md`: índice geral de documentação
- `docs/repository/DOMAINS.md`: mapa conceitual dos domínios do repositório
- `docs/repository/SCRIPTS_INVENTORY.md`: inventário de scripts e inconsistências conhecidas
- `docs/forms/README.md`: índice de automação semi-automática segura de formulários
- `docs/repository/FORM_AUTOMATION_SEMI_AUTO_RUNBOOK.md`: runbook da automação semi-automática segura de formulários
- `docs/security/README.md`: pacote de auditoria, remediação e compliance
- `docs/saas-billing/README.md`: visão de domínio de billing
- `docs/saas-billing/operations/README.md`: runbooks e checklists operacionais
- `docs/scripts/README.md`: convenção de scripts do monorepo
- `restaurante-app/scripts/README.md`: scripts do app mobile
- `restaurante-web/scripts/README.md`: scripts do web
- `restaurante-ops/scripts/README.md`: scripts do ops
- `database-backup/supabase/functions/scripts/README.md`: scripts operacionais das Edge Functions de billing

## Convenção prática

- documentação durável e transversal deve ir para `docs/`
- runbooks e documentos temporais de billing devem ir para `docs/saas-billing/operations/`
- scripts globais do monorepo devem ir para `docs/scripts/<dominio>/`
- scripts específicos devem permanecer no `scripts/` do respectivo subprojeto
