# restaurante-supabase

Monorepo do ecossistema `restaurante-supabase`, com app POS, web POS, backoffice SaaS, billing, migrations e documentação operacional.

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