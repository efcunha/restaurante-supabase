# Plano de Migração: roles.js → roles.ts

**Status**: Planejado (não iniciado)  
**Data**: Mar 30, 2026  
**Prioridade**: Média (qualidade técnica, não risco operacional urgente)  
**Scope**: restaurante-app/src/auth/roles.js + restaurante-web/src/auth/roles.js

---

## Contexto

### Situação Atual
- 🔴 `roles.js` — arquivo **legado em JavaScript** sem tipagem estrita
- ✅ Resto do projeto TypeScript estrito (`tsconfig.json`: `"strict": true`)
- ⚠️ Exportações utilizadas em múltiplos arquivos críticos (auth, screens, guards)
- ❌ Sem type hints → potencial source de bugs em refactors

### Impacto
- **Low risk**: arquivo pequeno, API simples (enum de roles + helpers)
- **Medium effort**: requer validação em app + web, possível ajuste de imports
- **Medium value**: type-safety em autorização (alta importância operacional)

---

## Escopo de Mudança

### Arquivos Envolvidos
```
restaurante-app/
├── src/auth/roles.js → roles.ts ✨ MIGRAR
└── src/auth/roles.d.ts (se existir, remover)

restaurante-web/
├── src/auth/roles.js → roles.ts ✨ MIGRAR
└── src/auth/roles.d.ts (se existir, remover)

// Dependentes (validar após migração)
- restaurante-app/src/screens/*.tsx (imports)
- restaurante-app/src/components/*.tsx (imports)
- restaurante-web/src/screens/*.tsx (imports)
- restaurante-web/src/components/*.tsx (imports)
```

### Conteúdo Esperado Atual (roles.js)
```javascript
// Exemplo baseado em padrños operacionais
const ROLES = {
  ADMIN: 'admin',
  GERENTE: 'gerente',
  GARCOM: 'garcom',
  COZINHEIRO: 'cozinheiro',
  MONTAGEM: 'montagem',
  ENTREGADOR: 'entregador',
  CAIXA: 'caixa'
};

const canManage = (role, targetRole) => {
  // Lógica de permissão
};

const getRoleLabel = (role) => {
  // Tradução legível
};

module.exports = { ROLES, canManage, getRoleLabel };
```

---

## Plano de Implementação

### Fase 1: Preparação (30 min)

1. **Auditar conteúdo atual**:
   ```bash
   cat restaurante-app/src/auth/roles.js
   cat restaurante-web/src/auth/roles.js
   diff restaurante-app/src/auth/roles.js restaurante-web/src/auth/roles.js
   ```
   → Confirmar que conteúdo é idêntico entre app e web

2. **Mapper de dependentes**:
   ```bash
   grep -r "from.*roles" restaurante-app/src --include="*.ts" --include="*.tsx"
   grep -r "from.*roles" restaurante-web/src --include="*.ts" --include="*.tsx"
   ```
   → Listar todos os arquivos que importam roles

3. **Backup e versão**:
   - Criar branch: `feat/migrate-roles-js-to-ts`
   - Commit inicial: "docs: plan roles.js → roles.ts migration"

### Fase 2: Definir Types (15 min)

Criar `roles.ts` com tipagem estrita:

```typescript
// restaurante-app/src/auth/roles.ts (template)

export const CANONICAL_ROLES = {
  ADMIN: 'admin',
  GERENTE: 'gerente',
  GARCOM: 'garcom',
  COZINHEIRO: 'cozinheiro',
  MONTAGEM: 'montagem',
  ENTREGADOR: 'entregador',
  CAIXA: 'caixa'
} as const;

export type CanonicalRole = typeof CANONICAL_ROLES[keyof typeof CANONICAL_ROLES];

export interface RolePermissionsMap {
  [key in CanonicalRole]?: CanonicalRole[];
}

/**
 * Verifies if a user with `userRole` can manage a target `targetRole`
 * (e.g., gerente can manage garcom, but not admin)
 */
export const canManage = (userRole: CanonicalRole, targetRole: CanonicalRole): boolean => {
  const permissions: RolePermissionsMap = {
    admin: Object.values(CANONICAL_ROLES),
    gerente: [CANONICAL_ROLES.GARCOM, CANONICAL_ROLES.COZINHEIRO, /* ... */],
    // ... outros roles
  };
  return permissions[userRole]?.includes(targetRole) ?? false;
};

/**
 * Human-readable label for a role (pt-BR)
 */
export const getRoleLabel = (role: CanonicalRole): string => {
  const labels: Record<CanonicalRole, string> = {
    admin: 'Administrador',
    gerente: 'Gerente',
    garcom: 'Garçom',
    cozinheiro: 'Cozinheiro',
    montagem: 'Montagem',
    entregador: 'Entregador',
    caixa: 'Caixa'
  };
  return labels[role] ?? role;
};

export default {
  CANONICAL_ROLES,
  canManage,
  getRoleLabel
};
```

### Fase 3: Migrar restaurante-app (20 min)

1. **Criar roles.ts** com conteúdo tipado acima
2. **Remover roles.js** (se existir)
3. **Atualizar imports**:
   ```typescript
   // Antes
   const { ROLES, canManage } = require('../auth/roles');
   
   // Depois
   import { CANONICAL_ROLES, canManage, type CanonicalRole } from '@/auth/roles';
   // ou
   import { canManage } from '@/auth/roles';
   ```
4. **Validar tipos**:
   ```bash
   cd restaurante-app
   npm run type-check
   ```
5. **Testar imports**:
   ```bash
   npm run lint
   npm run test --testPathPattern roles
   ```

### Fase 4: Migrar restaurante-web (20 min)

1-5. Repetir Fase 3 para web
6. **Sincronizar conteúdo entre app e web**:
   ```bash
   diff restaurante-app/src/auth/roles.ts restaurante-web/src/auth/roles.ts
   # Resultado esperado: files are identical (ou minimal comment diffs)
   ```

### Fase 5: E2E Validation (15 min)

1. **Smoke test app**:
   ```bash
   cd restaurante-app
   npm start  # ou run:android, run:ios
   # Testar manual: Login → permissões funcionam?
   ```

2. **Smoke test web**:
   ```bash
   cd restaurante-web
   npm start:web
   # Testar manual: Login → permissões funcionam?
   ```

3. **E2E CLI**:
   ```bash
   # Maestro (app)
   maestro test .maestro/balcao.yaml --udid emulator-5554
   
   # Playwright (web)
   npx playwright test e2e/balcao.spec.ts --workers=1
   ```

### Fase 6: Merge & Deploy (10 min)

1. **Commit & PR**:
   ```bash
   git add -A
   git commit -m "feat: migrate roles.js to roles.ts with strict typing

   - Implement canonical role types (CanonicalRole union)
   - Add RolePermissionsMap for permission management
   - Maintain parity between app and web
   - Validated with type-check, lint, and E2E"
   
   gh pr create --title "Migrate roles.js to roles.ts (strict typing)"
   ```

2. **Approvals**:
   - Code review (verify type safety)
   - CI/CD gates (lint, type check, E2E pass)

3. **Merge & Monitor**:
   ```bash
   gh pr merge --squash --auto
   ```
   - Monitor Sentry for next 24h (zero new errors expected)

---

## Timeline & Effort

| Fase | Duração | Effort | Blocker |
|------|---------|--------|---------|
| Prep | 30 min | Low | None |
| Types | 15 min | Low | None |
| App Migration | 20 min | Low | Type-check pass |
| Web Migration | 20 min | Low | Type-check pass |
| E2E Validation | 15 min | Medium | Maestro + Playwright pass |
| Merge & Monitor | 10 min | Low | CI/CD gates pass |
| **Total** | **110 min (~2h)** | **Medium** | **E2E required** |

**Recommended**: Executar em single sprint (não quebrar em múltiplos commits se possível)

---

## Checklist de Sucesso

- [ ] roles.ts criado em restaurante-app com tipos
- [ ] roles.ts criado em restaurante-web com tipos
- [ ] roles.js removido (ou gitignored se legacy compat necessária)
- [ ] Todos os imports atualizados (grep confirma 0 require/roles)
- [ ] `npm run type-check` passa em app
- [ ] `npm run type-check` passa em web
- [ ] `npm run lint` passa em app
- [ ] `npm run lint` passa em web
- [ ] Maestro balcao.yaml E2E passa
- [ ] Playwright balcao.spec.ts E2E passa
- [ ] Sentry: 0 new errors após deploy (24h monitoring)
- [ ] Parity check: `diff roles.ts` entre app e web = minimimal

---

## Rollback Plan

Se alguma coisa quebrar pós-merge:

```bash
# Revert PR
gh pr revert <pr-number> --create-pr

# Deploy rollback
git revert <commit-hash>
git push

# Investigar:
# What broke? (check Sentry + test logs)
# Root cause?
# Fix + re-PR quando pronto
```

---

## Dependências & Riscos

### Dependências
- ✅ Nenhuma — roles.js é isolado, sem dependências externas
- ✅ TypeScript e ESLint já configurados corretamente

### Riscos (Baixos)
| Risco | Probabilidade | Mitigação |
|-------|--------------|-----------|
| Type hints incorretos | Baixa | Code review, type-check |
| Import paths quebrados | Baixa | Grep + grep-replace validação |
| Behavior change (canManage logic) | Baixa | E2E validation |

---

## Notas Operacionais

1. **Não quebra comportamento** — refactor puro, sem lógica nova
2. **Pode ser agendado** — não é pré-requisito para outras features
3. **Boa oportunidade** — quando aguardando review de PR maior
4. **Post-Merge Monitoring** — padrão de 24h no Sentry (mesmo para low-risk)

---

## Referências

- **SKILL.md**: Arquivos de referência (alta prioridade) — `restaurante-app/src/auth/roles.js`, `restaurante-web/src/auth/roles.js`
- **sentryConfig.js**: Similar legado .js file — padrão para considerar (por enquanto: sem plano)
- **Canonical Roles**: `admin`, `gerente`, `garcom`, `cozinheiro`, `montagem`, `entregador`, `caixa` (per SKILL.md)

---

## Status Tracking

| Data | Status | Nota |
|------|--------|------|
| Mar 30, 2026 | Planejado | Plano documentado, aguardando agendamento |
| — | Em Progresso | (quando iniciado) |
| — | Completed | (após merge) |

---

**Next Step**: Agendar para próximo sprint ou slot de "tech debt" e iniciar Fase 1 quando pronto.
