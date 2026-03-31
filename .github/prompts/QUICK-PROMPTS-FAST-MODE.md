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

### Fallback (sem Callstack skills):
```
Baseado no projeto restaurante-supabase (ver .github/skills/restaurante-supabase/SKILL.md):
- Foque em useMemo para derivados pesados (sort, filter, map complexas)
- Use React.memo para item renderers em FlatList
- Medir antes de otimizar (profiling com Hermes)
- Não quebrar comportamento — só eficiência de render

Screen: [restaurante-app/src/screens/<SCREEN_NAME>.tsx]
```

---

### Rápido: Otimizar FlatList
```
#file:.github/skills/restaurante-supabase/SKILL.md

Optimize this FlatList for 100+ items: recommend removeClippedSubViews, keyExtractor, 
memoization strategy without breaking UI. Keep behavior identical.

File: [restaurante-app/src/screens/<SCREEN_NAME>.tsx]
```

### Fallback (sem Callstack skills):
```
Baseado em padrões documentados (restaurante-supabase SKILL.md):
- Use keyExtractor consistente; evite index-based keys
- Aplique removeClippedSubViews={true} em listas longas
- Memoize item renderers com React.memo quando necessário
- Para 100+ items, considere FlashList ou virtualizacao customizada
- Evite re-renders do container durante scroll

File: [restaurante-app/src/screens/<SCREEN_NAME>.tsx]
```

---

### Rápido: Parallelizar queries
```
#file:.github/skills/restaurante-supabase/SKILL.md

Refactor data loading to use Promise.all for independent queries. 
Current flow: [describe sequential loads]
Screens affected: [list screens]
```

### Fallback (sem Callstack skills):
```
Padrão restaurante-supabase (SKILL.md, aprendizados Mar/2026):
- Use Promise.all() para paralelizar queries independentes
- Exemplo: const [cardapio, adicionais, mesa] = await Promise.all([...])
- Ganha latência sem aumentar complexity
- Especialmente útil em: NovoPedidoScreen, ComandaGerenciamentoScreen

Current flow: [describe sequential loads]
Screens affected: [list screens]
```


---

## 2. React Native API Divergence (0.84.0 — Alinhado ✅)

### Rápido: Verificar após cambio web
```
#file:.github/skills/restaurante-supabase/SKILL.md

I added [describe API or change] to restaurante-web. 
Will this work in restaurante-app (RN 0.84.0) or need compatibility layer?
File: [restaurante-web/src/<path>]
```

### Fallback (sem Callstack skills):
```
Status: restaurante-app e restaurante-web ambos em RN 0.84.0 (sincronizadas ✅)
Sem restrição de API entre app e web.

I added [describe API or change] to restaurante-web.
Testar em restaurante-app para garantir comportamento idêntico.
File: [restaurante-web/src/<path>]
```

---

### Rápido: Rodar lint de divergência
```bash
# Detecta APIs 0.84.0+ no web que não existem 0.84.0 app
bash scripts/check-rn-api-divergence.sh
# (agora verifica 0.84.0 vs 0.84.0)
```


---

## 3. Canary Rollout & Feature Flags (Phase 12)

### Rápido: Implementar feature flag
```
#file:.github/skills/restaurante-supabase/SKILL.md

Add a feature flag wrapper for [describe feature]. Should it use existing Phase 12 flags 
or new toggle? Which wave? (Auth/Ordering/Settlement/Admin)
```

### Fallback (sem Callstack skills):
```
Referência: .github/skills/restaurante-supabase/SKILL.md, seção "Canary Rollout (Phase 12)"

Phase 12 flags disponíveis:
- EXPO_PUBLIC_FEATURE_LOGIN_UI_NEXT
- EXPO_PUBLIC_FEATURE_NOVO_PEDIDO_UI_NEXT
- EXPO_PUBLIC_FEATURE_DELIVERY_UI_NEXT
- EXPO_PUBLIC_FEATURE_PAGAMENTO_UI_NEXT
- EXPO_PUBLIC_FEATURE_COMANDA_GERENCIAMENTO_UI_NEXT
- EXPO_PUBLIC_FEATURE_ADMIN_UI_NEXT

Waves recomendadas: Auth → Ordering → Settlement → Admin

[Descrever feature]: [describe feature]
Usar flag existing ou nova? Wave? (1-4)
```

---

### Rápido: Promover wave canary
```
#file:.github/skills/restaurante-supabase/SKILL.md

Ready to promote [Wave X] from canary. 
Current coverage: [describe users/companies reached]
Rollback plan if regression: [describe]
```

### Fallback (sem Callstack skills):
```
Baseado em padrões documentados (Phase 12 roadmap):
- Wave 1 (Auth): menor risco, rollback simples
- Wave 2 (Ordering): mais impacto, validar E2E completo
- Wave 3 (Settlement): alto risco, validar billing + pagamento
- Wave 4 (Admin): máximo impacto

Ready to promote [Wave X] from canary.
- Current coverage: [users/companies reached]
- E2E validado? Sim/Não
- Sentry baseline OK? Sim/Não
- Rollback plan: [descrever passo-a-passo]
```


---

## 4. Billing & License Gate

### Rápido: Verificar LicenseGate coverage
```bash
# Valida se LicenseGate envolve telas críticas (pré-requisito billing)
bash scripts/check-license-gate-coverage.sh
```

### Fallback (sem scripts):
```
Telas críticas que DEVEM ter LicenseGate wrapper antes de ativar billing:
- NovoPedidoScreen
- ComandaGerenciamentoScreen
- RotasDeliveryScreen
- CozinhaScreen
- MontagemScreen

Verificar manualmente em:
- restaurante-app/src/screens/<SCREEN>.tsx
- restaurante-web/src/screens/<SCREEN>.tsx

Procurar por: <LicenseGate> wrapper ou useLicenseGate() hook
```

---

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

### Fallback (sem skills):
```
Pré-requisitos antes de EXPO_PUBLIC_FEATURE_BILLING=true em produção:

Checklist Mínimo:
- [ ] LicenseGate wraps 5 telas críticas (validar script acima)
- [ ] E2E test: unsubscribed user bloqueado e redireciona para upgrade
- [ ] Sentry baseline: zero erros de billing
- [ ] Rollback plan: set FEATURE_BILLING=false em <5 min
- [ ] Gradual rollout plan: 5% → 25% → 50% → 100%

Obs: Sempre testar em staging-billing branch Supabase antes.
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

### Fallback (sem skills):
```
Checklist para schema change (restaurante-supabase patterns):

1. Diagnosticar:
   - Fluxos críticos afetados: Balcao, Mesa, Delivery, Montagem, Billing?
   - Empresa multi-tenant (company_id)?
   - RLS policies precisam atualizar?

2. Referências anteriores:
   - database-backup/migrations/20260311161100_schema_dump.sql (baseline)
   - database-backup/migrations/20260314164000_* (atomic functions)
   - database-backup/migrations/20260323183000_* (RLS hardening)

3. Propor mudança mínima segura:
   - Preservar contracts e APIs públicas
   - Compatibilidade app + web
   - Validar RLS antes de apply remoto

[Descrever mudança]
```

---

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

### Fallback (sem skills):
```
Regras de ouro para RLS no restaurante-supabase:

1. **Toda query respeita company_id** — sem exceções
2. **Não bypassar RLS** — sempre usar Supabase client com auth token (não service_role)
3. **Roles canonicas**: admin, gerente, garcom, cozinheiro, montagem, entregador, caixa
4. **Self-update**: user só pode atualizar seu próprio perfil (bloquear company_id, role, email, active)
5. **Admin actions**: gerente pode gerenciar profiles da mesma empresa + funcionários

Table: [table_name]
- Company_id isolation: sim/não
- Roles envolvidas: [lista]
- Contratos a preservar: [descrever]
```

---

### Rápido: Validar company_id em query
```
#file:.github/skills/restaurante-supabase/SKILL.md

Revisão rápida de query Supabase:
[paste query code]
Está respeitando company_id + RLS? Possíveis brechas?
```

### Fallback (sem skills):
```
Checklist para Supabase queries:

❌ ANTI-PADRÕES (risco de segurança):
- Query sem .eq('company_id', <value>)
- Uso de service_role key em cliente (app/web)
- Dois .neq() no mesmo campo (pode gerar 400)
- SELECT USING (true) — acesso permissivo

✅ PADRÕES SEGUROS:
- Cliente sempre com anon key + RLS (user authenticated)
- .eq('company_id', userId_company_id) explícito
- Usar stored procedures para operações atômicas

[Paste query code]
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

### Fallback (sem skills):
```
Deploy restaurante-ops — checklist:

1. Comando correto (importante — caminho absoluto):
   cd restaurante-ops
   railway up --service restaurante-ops --path-as-root ./restaurante-ops

2. Validação pós-deploy (5 min):
   curl https://ops.restaurante-web.app.br/health
   # Esperar: { "status": "ok" }
   
   # Rate limit test
   for i in {1..10}; do curl https://ops.restaurante-web.app.br/auth/login; done
   # Esperar 429 (Too Many Requests) com RateLimit-* headers

3. Monitorar Sentry:
   - Error rate não deve aumentar
   - Nenhum erro de segurança (401, 403)
   - Rate limit ativo (429s esperados)

4. Rollback se necessário:
   railway up --service restaurante-ops --path-as-root ./restaurante-ops
```

---

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

### Fallback (sem skills):
```
Arquivos espelhados críticos (app ↔ web):
- src/config/SupabaseConfig.ts
- src/config/featureFlags.ts
- src/design-system/tokens.ts
- src/theme/colors.ts
- src/ui/index.ts
- src/layouts/ScreenScaffold.tsx
- src/auth/roles.js (ainda em .js)
- scripts/phase12-profile.js

Regra: refactor em um lado geralmente precisa espelhar no outro
para manter parity. Exceção: UI específica do cliente (Maestro vs Playwright).

Refatorei: [describe]
Arquivos espelhados afetados: [listar]
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

### Fallback (sem skills):
```
Android build fails — checklist comum:

1. Metro syntax errors (Metro fica ofuscado por shell text colado):
   - Procurar `.tsx` files com texto tipo `bash$ xxx` colado
   - Limpar arquivo, salvar, `npm start -- --reset-cache`

2. Dependência incompatível:
   - yarn list <package-name> | grep -E "[@/]restaurante"
   - Validar version pinning: ^ vs ~ vs exact

3. Cache stale:
   npm start -- --reset-cache
   rm -rf node_modules && npm install

4. Graddle cache (Android):
   cd android && ./gradlew clean && cd ..
   npm run android

[Paste error]
```

---

### Rápido: Database RLS bloqueando query
```
#file:.github/skills/restaurante-supabase/SKILL.md

Query retorna 0 rows em producao, mas não em local.
Possível causa: RLS policy não reconhece company_id do usuario.
Validar: auth.users + profiles no Supabase remoto (banco é fonte de verdade)
```

### Fallback (sem skills):
```
Query 0 rows em produção, mas local OK — RLS suspect:

1. Validar usuário em produção:
   supabase --project-ref <prod-id> query
   SELECT * FROM auth.users WHERE email = '<user-email>';
   SELECT * FROM public.profiles WHERE user_id = '<user-id>';
   → Verificar se profiles.company_id está preenchido

2. Verificar RLS policy:
   SELECT * FROM pg_policies 
   WHERE tablename = '<table_name>' AND schemaname = 'public';
   → Validar que policy permite acesso com company_id do user

3. Teste direto:
   SELECT * FROM <table_name> WHERE company_id = '<user_company_id>';
   → Se 0 rows, issue é na policy; se N rows, issue é na app logic

Usuário: [email ou ID]
Query: [SQL]
Resultado esperado: [N rows]
```

---

### Rápido: Maestro login não funciona
```
#file:.github/skills/restaurante-supabase/SKILL.md

Maestro balcao.yaml para em login (não navega para NovoPedido).
Bloqueador conhecido (Mar 28, 2026): perfil sem company_id.
Ação: validar usuario em auth.users + profiles; testar login manual no emulador.
```

### Fallback (sem skills):
```
Maestro login bloqueado — verificação rápida:

1. Credenciais corretas?
   - Usuário existe em auth.users? (supabase dashboard)
   - Password é a correta?
   - Testar login manual no emulador (app)
   - Se falha manual, issue é credencial

2. Profile sem company_id?
   - supabase query: SELECT * FROM public.profiles WHERE user_id = '<user-id>'
   - Se company_id IS NULL → profile incompleto, app bloqueia
   - Solução: admin atualiza profile com company_id

3. Maestro config:
   - .maestro/.env.maestro existe e tem PLAYWRIGHT_TEST_EMAIL/PASSWORD?
   - Email/senha batem com user em DB?
   - Emulador está running? (adb devices)

Debug: tester login manual no emulador primeiro, depois rodar flow Maestro
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
