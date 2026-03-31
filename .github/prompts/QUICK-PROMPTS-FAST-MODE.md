# Quick Prompts — Fast Mode (sem Callstack skills)

Use estes prompts quando quiser respostas rápidas **sem bloquear em dependências de Callstack skills**.
Cada prompt abaixo já inclui contexto do projeto, sem necessidade de linkar arquivos externos.

---

## 1. Performance & Rendering (RN)

### Rápido: Review de render bottlenecks
```
#file:.github/skills/restaurante-supabase/SKILL.md

Profile this screen for render inefficiency, identify 1-3 concrete fixes (no behavior changes), 
and suggest measurement approach. Focus on useMemo/React.memo usage.

Screen: [restaurante-app/src/screens/<SCREEN_NAME>.tsx]
```

### Rápido: Otimizar FlatList
```
#file:.github/skills/restaurante-supabase/SKILL.md

Optimize this FlatList for 100+ items: recommend removeClippedSubViews, keyExtractor, 
memoization strategy without breaking UI. Keep behavior identical.

File: [restaurante-app/src/screens/<SCREEN_NAME>.tsx]
```

### Rápido: Parallelizar queries
```
#file:.github/skills/restaurante-supabase/SKILL.md

Refactor data loading to use Promise.all for independent queries. 
Current flow: [describe sequential loads]
Screens affected: [list screens]
```

---

## 2. React Native API Divergence (0.81.5 vs 0.84.0)

### Rápido: Verificar após cambio web
```
#file:.github/skills/restaurante-supabase/SKILL.md

I added [describe API or change] to restaurante-web. 
Will this work in restaurante-app (RN 0.81.5) or need compatibility layer?
File: [restaurante-web/src/<path>]
```

### Rápido: Rodar lint de divergência
```bash
# Detecta APIs 0.82+ no web que não existem 0.81.5 app
bash scripts/check-rn-api-divergence.sh
```

---

## 3. Canary Rollout & Feature Flags (Phase 12)

### Rápido: Implementar feature flag
```
#file:.github/skills/restaurante-supabase/SKILL.md

Add a feature flag wrapper for [describe feature]. Should it use existing Phase 12 flags 
or new toggle? Which wave? (Auth/Ordering/Settlement/Admin)
```

### Rápido: Promover wave canary
```
#file:.github/skills/restaurante-supabase/SKILL.md

Ready to promote [Wave X] from canary. 
Current coverage: [describe users/companies reached]
Rollback plan if regression: [describe]
```

---

## 4. Billing & License Gate

### Rápido: Verificar LicenseGate coverage
```bash
# Valida se LicenseGate envolve telas críticas (pré-requisito billing)
bash scripts/check-license-gate-coverage.sh
```

### Rápido: Antes de ativar billing
```
#file:.github/skills/restaurante-supabase/SKILL.md

Ready to enable EXPO_PUBLIC_FEATURE_BILLING=true in production.
Checklist:
- LicenseGate wraps all critical screens? [run check-license-gate-coverage.sh]
- E2E test for blocked user → subscription prompt?
- Sentry baseline established?
- Rollback plan if billing_enabled fails?
```

---

## 5. Database & Schema

### Rápido: Aqui será a próxima migração
```
#file:.github/skills/restaurante-supabase/SKILL.md

Planning schema change: [describe change]
Impact analysis:
- Fluxos críticos afetados? [Balcao/Mesa/Delivery/Montagem]
- Company_id + RLS precisa ser revisada?
- Migrações anteriores similares? [referência]
```

### Rápido: Validar drift de migrations
```bash
cd database-backup
./check-migration-sync.sh
```

---

## 6. Segurança & Multi-tenant

### Rápido: RLS policy review
```
#file:.github/skills/restaurante-supabase/SKILL.md

Criando policy para table [table_name].
Requisitos:
- Company_id isolation: sim/não
- Roles envolvidas: [admin/gerente/garcom/...]
- Contratos existentes a não quebrar: [descrever]
```

### Rápido: Validar company_id em query
```
#file:.github/skills/restaurante-supabase/SKILL.md

Revisão rápida de query Supabase:
[paste query code]
Está respeitando company_id + RLS? Possíveis brechas?
```

---

## 7. CI/CD & Deployment

### Rápido: Antes de fazer deploy restaurante-ops
```
#file:.github/skills/restaurante-supabase/SKILL.md

Deploy de restaurante-ops:
Usar comando correto: railway up --service restaurante-ops --path-as-root ./restaurante-ops
Validação pós-deploy:
- Health check: [sugerir URL]
- Rate limit check: [sugerir comando curl]
- Error rate em Sentry: baseline aceitável?
```

### Rápido: Validar E2E crítico
```bash
# Mobile (app) — prerequisito: credenciais em .maestro/.env.maestro
cd restaurante-app
maestro test .maestro/balcao.yaml --udid emulator-5554

# Web
cd restaurante-web
npx playwright test e2e/balcao.spec.ts e2e/mesa.spec.ts \
  e2e/pizza.spec.ts e2e/delivery.spec.ts --workers=1
```

---

## 8. App/Web Parity

### Rápido: Detectar refactor um-lado
```
#file:.github/skills/restaurante-supabase/SKILL.md

Refatorei [describe] em restaurante-web.
Existe arquivo espelhado em restaurante-app que precisa atualizar?
Arquivos: [listar]
```

---

## 9. Troubleshooting

### Rápido: Build falha em Android
```
#file:.github/skills/restaurante-supabase/SKILL.md

Android build error: [paste error]
Verificar: 
- Sintaxe TS limpa? (Metro pode ficar ofuscado por shell text colado)
- Versões de dependência compatíveis?
- Invalidar cache: npm start -- --reset-cache
```

### Rápido: Database RLS bloqueando query
```
#file:.github/skills/restaurante-supabase/SKILL.md

Query retorna 0 rows em producao, mas não em local.
Possível causa: RLS policy não reconhece company_id do usuario.
Validar: auth.users + profiles no Supabase remoto (banco é fonte de verdade)
```

### Rápido: Maestro login não funciona
```
#file:.github/skills/restaurante-supabase/SKILL.md

Maestro balcao.yaml para em login (não navega para NovoPedido).
Bloqueador conhecido (Mar 28, 2026): perfil sem company_id.
Ação: validar usuario em auth.users + profiles; testar login manual no emulador.
```

---

## Prompt Rápido Universal

Copia, adapta e cola em Copilot Chat:

```
#file:.github/skills/restaurante-supabase/SKILL.md

[Descreva o que você quer fazer em max 2 parágrafos]

Contexto:
- Projeto espelhado? app/web
- Fluxo crítico? Balcao/Mesa/Delivery/Montagem/Billing
- Company_id + RLS considerado? Sim/Não
- Feature flag needed? Sim/Não
- E2E validação? Sim/Não

[Pause aqui para copilot responder com diagnóstico]
```

---

## Regra de Ouro para Fast Prompts

**1. Sempre incluir o SKILL.md principal** — sem links para Callstack (se não existir localmente, ignorar)
**2. Descrever o que você quer fazer**, não pedir "análise completa"
**3. Listar contexto: app/web, fluxo crítico, multi-tenant concerns
**4. Estar pronto para scripts**: `check-rn-api-divergence.sh`, `check-license-gate-coverage.sh`, `check-migration-sync.sh`
**5. Para temas complexos** (arquitetura, upgrade RN, migração), abrir chat dedicado com time — fast prompts servem só para ações imediatas

---

## Status (Mar 30, 2026)

✓ Prompts rápidos testados com principal SKILL.md local
✓ Scripts de validação disponíveis (`scripts/`)
✓ Fallback sem Callstack skills operacional — bloqueia sem depender de acesso online

Próximo: escalado rápido sem bloqueios em skills externas.
