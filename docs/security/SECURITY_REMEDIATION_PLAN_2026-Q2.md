# 🔐 Plano de Remediação de Segurança - Q2 2026

**Documento:** `SECURITY_REMEDIATION_PLAN_2026-Q2.md`  
**Data de Criação:** 1 de abril de 2026  
**Responsável:** Security Engineering Team  
**Status:** 🟡 Em Execução  
**Revisão:** Semanal (toda segunda-feira)

---

## 📊 VISÃO GERAL DO PLANO

| Fase | Período | Foco | Entregáveis |
|------|---------|------|-------------|
| **Semana 1** | 01-07 Abr 2026 | CRÍTICOS e ALTOS | Secrets rotacionados, Android hardening, Logging seguro, `OPS-2` e `OPS-5` priorizados |
| **Semana 2** | 08-14 Abr 2026 | Pinning e Rate Limit | SSL pinning avaliado no app, `OPS-3` validado |
| **Semana 3** | 15-21 Abr 2026 | MFA & Autenticação | MFA TOTP para admins, Session hardening, `OPS-1` executado |
| **Semana 4** | 22-30 Abr 2026 | Validação & Testes | Pentest, E2E security tests, `OPS-4` smoke controlado, documentação |

---

## 🎯 ESCOPO REAL NO MONOREPO

Este plano foi revisado em 01/04/2026 contra o estado atual do monorepo e deve ser interpretado por projeto:

- `restaurante-app`: aplica-se integralmente aos itens de biometria, Android hardening, logging cliente, MFA em Supabase Auth e session hardening.
- `restaurante-web`: aplica-se aos itens de cursor secret, logging/Sentry e MFA baseado em Supabase Auth. Nao se aplicam itens nativos de Android/iOS.
- `restaurante-ops`: este documento cobre apenas itens indiretos. Hardening real de `ops` deve priorizar env vars server-only, cookies/sessao, rate limiting, billing/reconcile, security headers e sanitizacao de logs.

Observacoes de baseline:

- Nao existe ambiente de staging dedicado neste projeto hoje; referencias a `staging` neste documento devem ser lidas como validacao controlada antes de promover em producao.
- Alguns itens abaixo estavam marcados como concluidos, mas o repositório ainda nao sustenta esse status. Eles foram mantidos como backlog pendente ate evidência tecnica objetiva.

---

## ✅ RESUMO DE EXECUCAO SEMANAL

Use esta secao como checklist curto de acompanhamento. O detalhamento tecnico completo permanece nas secoes abaixo.

### Semana 1

- `restaurante-app` e `restaurante-web`: rotacionar Firebase key, sanear `.env.example` e remover hardcodes de `CURSOR_SECRET`.
- `restaurante-app`: priorizar biometria sem senha persistida e iniciar Android backup hardening.
- `restaurante-ops`: revisar logs sensiveis e confirmar segredos server-only + headers.

### Semana 2

- `restaurante-app`: gate de pinning fechado como **CONDITIONAL (NO-GO neste ciclo)**.
- `restaurante-ops`: validar `429` e `503` em modo fail-closed para auth e billing.
- `restaurante-web`: acompanhar apenas impactos compartilhados de auth/env/logging, sem trilha nativa.

### Semana 3

- `restaurante-app` e `restaurante-web`: reimplementar MFA TOTP com Supabase Auth.
- `restaurante-app` e `restaurante-web`: fechar session fixation com `signOut()` preventivo e rotacao consistente de sessao.
- `restaurante-ops`: endurecer sessao e cookies do backoffice.

### Semana 4

- `restaurante-ops`: executar smoke controlado de billing/reconcile e registrar evidencias.
- Monorepo: consolidar evidencias, atualizar documentacao e decidir pendencias residuais de maior risco.

### Critério de fechamento do Q2

- Nenhum segredo hardcoded nos clientes ou exemplos publicos.
- Nenhuma senha persistida para replay biometrico no app.
- MFA funcional para roles privilegiadas em app e web.
- `restaurante-ops` validado com rate limit estrito e trilha critica de billing revisada.

---

## 🗂️ MATRIZ DE APLICABILIDADE POR PROJETO

| Item | restaurante-app | restaurante-web | restaurante-ops | Observacao |
|------|-----------------|-----------------|-----------------|------------|
| `SEC-W1-001` Firebase API Key | ✅ Sim | ✅ Sim | ❌ Nao | Cliente Expo/Firebase apenas |
| `SEC-W1-002` Cursor secret hardcoded | ✅ Sim | ✅ Sim | ❌ Nao | Implementacao espelhada nos dois clientes |
| `SEC-W1-003` Biometric credentials hardening | ✅ Sim | ❌ Nao | ❌ Nao | Risco exclusivo do app |
| `SEC-W1-004` Android Auto Backup hardening | ✅ Sim | ❌ Nao | ❌ Nao | Item Android nativo |
| `SEC-W1-005` Logging seguro | ✅ Sim | ✅ Sim | ✅ Sim | Cada projeto deve respeitar seu logger atual |
| `SEC-W2-001` Certificate pinning | ✅ Sim | ❌ Nao | ❌ Nao | Gate 02/04/2026: CONDITIONAL (NO-GO neste ciclo) por risco operacional sem staging e sem esteira MITM automatizada |
| `SEC-W3-001` MFA TOTP para admins | ✅ Sim | ✅ Sim | ⚠️ Parcial | `ops` exige trilha propria se MFA for obrigatorio no backoffice |
| `SEC-W3-002` Session fixation prevention | ✅ Sim | ✅ Sim | ❌ Nao | Trata login dos clientes; `ops` usa sessao/cookie separado |

Legenda:

- `✅ Sim`: item pertence diretamente ao projeto.
- `⚠️ Parcial`: o tema e relevante, mas precisa de plano proprio e nao pode reutilizar o passo a passo do cliente sem adaptacao.
- `❌ Nao`: fora de escopo tecnico do projeto.

---

## 🛡️ TRILHA ESPECIFICA PARA RESTAURANTE-OPS

Os itens abaixo nao substituem o plano geral, mas representam o backlog de seguranca que faz mais sentido para `restaurante-ops` no estado atual do monorepo.

### OPS-1: Sessao e Cookies do Backoffice

**Arquivos-alvo:** `restaurante-ops/src/auth/session.ts`, `restaurante-ops/src/auth/middleware.ts`, `restaurante-ops/src/index.ts`

- [x] Confirmar flags de cookie seguras em producao: `HttpOnly`, `Secure`, `SameSite` e expiracao coerente.
- [x] Validar limpeza completa de sessao em logout e em token invalido/expirado.
- [x] Registrar evidência de comportamento em login invalido, sessao expirada e logout.

**Status de execucao (01/04/2026, 15:49 UTC):**

- Login valido cria `ops_session` com `HttpOnly`, `SameSite` e expiracao (`Max-Age` + `Expires`).
- Logout (`/auth/logout`) retorna `Set-Cookie: ops_session=; Max-Age=0; Expires=Thu, 01 Jan 1970...` e redireciona para `/login`.
- Acesso a `/dashboard` apos logout retorna `302` para `/login`.
- Cookie invalido (`ops_session=invalid`) tambem retorna `302` para `/login`.

**Critérios de aceite:**

- [x] Cookie de sessao nao fica acessivel a JavaScript cliente.
- [x] Sessao invalida sempre redireciona para login sem vazar contexto anterior.
- [x] Evidência manual registrada no documento ou runbook interno.

### OPS-2: Logs Estruturados Sem Dados Sensiveis

**Arquivos-alvo:** `restaurante-ops/src/lib/logger.ts`, `restaurante-ops/src/index.ts`, modulos de billing em `restaurante-ops/src/modules/`

- [x] Revisar campos enviados para `logInfo`, `logWarn` e `logError`.
- [x] Redigir ou truncar email, token, cookie, `SUPABASE_SERVICE_ROLE_KEY`, IDs de pagamento e payloads brutos de billing quando desnecessarios.
- [x] Garantir que mensagens de erro de reconcile/billing nao persistam artefatos sensiveis em texto livre.

**Critérios de aceite:**

- [x] Nao ha log intencional de credenciais, cookies ou tokens.
- [x] Campos de billing sensiveis aparecem apenas quando estritamente necessarios e de forma sanitizada.
- [x] Amostra de logs revisada manualmente apos fluxo de login e reconcile.

### OPS-3: Rate Limiting Estrito em Ambientes Sensiveis

**Arquivos-alvo:** `restaurante-ops/src/config/env.ts`, `restaurante-ops/src/lib/rate-limiter.ts`, `restaurante-ops/src/index.ts`, `restaurante-ops/RATE_LIMITING.md`

- [ ] Confirmar `RATE_LIMIT_FALLBACK_ENABLED=false` nos ambientes sensiveis.
- [x] Validar `429` para excesso de tentativas em `/auth/login`.
- [x] Validar `503` quando Redis estiver indisponivel e o modo estrito estiver ativo.
- [x] Atualizar a documentacao operacional para refletir o comportamento realmente adotado.

**Status de execucao (01/04/2026, 15:37 UTC):**

- `429` e `503` confirmados em `/auth/login` em drill local.
- `429` confirmado em `/ops/billing/reconcile` via smoke com credentials reais (01/04, 15:37 UTC).
- `503` confirmado em `/ops/billing/reconcile` em modo estrito (`RATE_LIMIT_FALLBACK_ENABLED=false`) com Redis indisponivel e sessao autenticada valida (01/04, 15:46 UTC).
- Limite auth: 8 tentativas em 15 minutos (atingido na tentativa 9).
- Limite billing: 30 tentativas em 1 minuto por usuario (atingido na tentativa 31).
- Headers validados com sucesso em ambos endpoints.
- Logs estruturados mostram sanitizacao correta via eventos `auth.login_rate_limited` e `billing.operation_rate_limited`.

**Critérios de aceite:**

- [x] `/auth/login` respeita limite configurado.
- [x] Endpoints de billing bloqueiam com `429` no excesso.
- [x] Validar `503` em `billing` quando Redis indisponivel em modo estrito.
- [x] Documentacao do `restaurante-ops` alinhada ao comportamento observado.

### OPS-4: Billing e Reconcile Como Superficie Critica

**Arquivos-alvo:** `restaurante-ops/src/modules/billing-operations.ts`, `restaurante-ops/src/index.ts`, migrations e docs de billing

- [x] Confirmar `public.reconcile_billing_event_atomic` como unico caminho de escrita para reconcile.
- [x] Revisar entradas aceitas pelos endpoints de regularizacao e reconcile.
- [x] Verificar sanitizacao de erros e idempotencia por `idempotency_key`.
- [x] Registrar smoke controlado dos fluxos mais sensiveis antes de qualquer go-live de billing.

**Status de execucao (01/04/2026, 15:53 UTC):**

- Reconcile permanece centralizado em `reconcileBillingEvent()` via `supabase.rpc('reconcile_billing_event_atomic', ...)`.
- Guardrails de entrada validados em runtime:
  - `/ops/billing/reconcile` com `idempotencyKey` invalido retorna `400` (`idempotencyKey deve ter entre 8 e 120 caracteres.`).
  - `/ops/billing/company/{companyId}/regularize/card` com `invoiceId` invalido retorna `400` (`invoiceId invalido. Informe UUID valido.`).
- Regularizacao sem invoice elegivel retorna `404` com codigo funcional (`INVOICE_ACTION_TARGET_NOT_FOUND`).
- Erros HTTP de billing permanecem sem exposicao de payload sensivel (mensagens controladas + logger com mascaramento).
- Repeticao com mesmo `idempotencyKey` manteve resposta deterministica (`404` no cenario sem invoice pendente/falha).
- Consulta direta via service role em `invoices` nao encontrou registros com `status in ('pending', 'failed')` no momento do smoke; por isso o replay de sucesso com `alreadyProcessed` permanece bloqueado sem mutacao adicional de dados.
- Helper operacional disponivel: `npm run billing:candidates` em `restaurante-ops` lista invoices elegiveis assim que existirem.

**Critérios de aceite:**

- [x] Nao ha caminho paralelo de escrita para reconcile fora da funcao atomica prevista.
- [x] Fluxos de reconcile e regularizacao possuem evidência minima de validacao.
- [x] Logs e respostas HTTP nao expõem dados de pagamento desnecessarios.

### OPS-5: Env Vars Server-Only e Security Headers

**Arquivos-alvo:** `restaurante-ops/src/config/env.ts`, `restaurante-ops/src/index.ts`, `restaurante-ops/README.md`

- [x] Confirmar que segredos server-only nao aparecem em cliente, exemplos publicos ou logs.
- [x] Revisar headers ja aplicados e decidir se CSP adicional e necessaria para a superfície atual.
- [x] Garantir que a documentacao publique apenas placeholders para variaveis sensiveis.

**Critérios de aceite:**

- [x] `SUPABASE_SERVICE_ROLE_KEY` permanece restrita ao servidor.
- [x] Headers minimos de seguranca permanecem ativos em producao.
- [x] Exemplos de configuracao nao incluem valores reais.

Critério pratico para `ops`:

- Se o item exigir Android, iOS, Expo client ou `react-native-*`, ele nao pertence a `restaurante-ops`.
- Se o item envolver cookie, sessao http, billing admin, service role, Redis ou security headers, ele provavelmente pertence a `restaurante-ops`.

### Priorizacao Recomendada para `restaurante-ops`

- **Semana 1:** `OPS-2` + `OPS-5`
  Motivo: reduzem risco imediato de exposicao de segredos, PII e configuracao insegura.
- **Semana 2:** `OPS-3`
  Motivo: consolida o comportamento fail-closed ja esperado para auth e billing.
- **Semana 3:** `OPS-1`
  Motivo: fecha endurecimento da superficie de sessao do backoffice.
- **Semana 4:** `OPS-4`
  Motivo: valida a trilha mais sensivel de billing/reconcile com smoke controlado e evidência.

---

## 📅 SEMANA 1 (01-07 Abr): CRÍTICOS e ALTOS

### 🔴 CRÍTICO-1: Rotacionar Firebase API Key

**ID:** `SEC-W1-001`  
**Severidade:** CRÍTICO  
**Esforço:** 2 horas  
**Responsável:** DevOps Lead  
**Multi-tenant:** ✅ Afeta todos os tenants  
**Aplica-se diretamente a:** `restaurante-app`, `restaurante-web`

> Status real em 01/04/2026:
> - O tema faz sentido.
> - Nao ha staging dedicado no monorepo.
> - `restaurante-web/.env.example` ja usa placeholder, mas `restaurante-app/.env.example` ainda precisa ser saneado.

#### Tarefas

- [X] **1.1** Gerar nova Firebase API Key no Firebase Console
  ```bash
  # Acessar: https://console.firebase.google.com/project/restaurante-6f221/settings/general
  # Gerar nova API Key
  # Documentar chave antiga para revogação
  ```

- [ ] **1.2** Atualizar variáveis de ambiente nos ambientes realmente existentes
  ```bash
  # .env (local development)
  EXPO_PUBLIC_FIREBASE_API_KEY=nova_chave_gerada
  
  # Railway (produção)
  railway variables set EXPO_PUBLIC_FIREBASE_API_KEY=nova_chave_gerada
  
  # Validacao controlada antes de promover em producao
  # Nao assumir ambiente staging dedicado enquanto ele nao existir formalmente
  ```

- [ ] **1.3** Atualizar `.env.example` com placeholder em app e web
  ```bash
  # .env.example
  EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key_here
  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=restaurante-6f221.firebaseapp.com
  # ... manter demais configs
  ```

- [X] **1.4** Revogar chave antiga no Firebase Console
  ```bash
  # Firebase Console > Project Settings > Service Accounts
  # Revogar chave antiga: AIzaSyAKbTm0iFFNwAcSmTtLrlyIHKc1ds1LrDE
  # Aguardar 24h para propagação
  ```

- [ ] **1.5** Validar funcionamento em ambiente controlado
  ```bash
  # Testar auth, Firestore, Analytics
  # Executar smoke controlado no ambiente disponivel
  ```

#### Critérios de Aceite

- [ ] Nova chave funcionando no ambiente validado
- [X] Chave antiga revogada
- [ ] `.env.example` atualizado sem secrets reais em app e web
- [X] Testes E2E passando

#### Rollback

Se houver falha:
```bash
# Reverter para chave antiga (se ainda não revogada)
railway variables set EXPO_PUBLIC_FIREBASE_API_KEY=chave_antiga
# Redeploy
railway up
```

---

### 🔴 CRÍTICO-2: Remover Cursor Secret Hardcoded

**ID:** `SEC-W1-002`  
**Severidade:** CRÍTICO  
**Esforço:** 3 horas  
**Responsável:** Frontend Platform  
**Multi-tenant:** ✅ Afeta todos os tenants  
**Aplica-se diretamente a:** `restaurante-app`, `restaurante-web`

> Status real em 01/04/2026:
> - O risco existe nos dois clientes.
> - O plano precisa ser executado de forma espelhada em `app` e `web`.
> - Ainda ha fallback inseguro para `default-cursor-secret` e `cursor-secret-key`.

#### Tarefas

- [ ] **2.1** Gerar secret aleatório para produção
  ```bash
  # Gerar secret criptograficamente seguro
  openssl rand -hex 32
  # Ou usar: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

- [ ] **2.2** Adicionar ao `.env.example`
  ```bash
  # .env.example
  CURSOR_SECRET=generate_with_openssl_rand_hex_32
  ```

- [ ] **2.3** Atualizar os dois pontos de uso em app e web
  ```text
  Arquivos-alvo:
  - restaurante-app/src/utils/cursorValidation.ts
  - restaurante-web/src/utils/cursorValidation.ts
  - restaurante-app/src/services/optimization/CursorPaginationService.ts
  - restaurante-web/src/services/optimization/CursorPaginationService.ts

  Ajuste esperado:
  - remover `default-cursor-secret` e `cursor-secret-key`
  - exigir `CURSOR_SECRET` em producao
  - permitir fallback efemero apenas em desenvolvimento, com aviso explicito
  ```

- [ ] **2.4** Configurar `CURSOR_SECRET` no ambiente usado pelos clientes
  ```bash
  railway variables set CURSOR_SECRET=$(openssl rand -hex 32)
  ```

- [ ] **2.5** Testar paginação com cursor
  ```bash
  # Cobrir geracao, validacao e falha segura sem secret em producao
  ```

#### Critérios de Aceite

- [ ] Nenhum hardcoded secret no código
- [ ] App e web falham de forma segura sem `CURSOR_SECRET` em produção
- [ ] Testes de paginação passando
- [ ] Secret configurado em todos os ambientes

---

### 🔴 CRÍTICO-3: Biometric Credentials Hardening

**ID:** `SEC-W1-003`  
**Severidade:** CRÍTICO  
**Esforço:** 4 horas  
**Responsável:** Mobile Lead  
**Multi-tenant:** ✅ Afeta todos os tenants  
**Aplica-se diretamente a:** `restaurante-app`

> Status real em 01/04/2026:
> - O risco e real no app porque ainda ha armazenamento local de credenciais para replay biometrico.
> - Nao se aplica a `restaurante-web` nem a `restaurante-ops`.

#### Tarefas

- [ ] **3.1** Criar `BiometricTokenService.ts` no app
  ```text
  Objetivo:
  - gerar token aleatorio por usuario/dispositivo
  - armazenar apenas hash e expiração no SecureStore
  - permitir revogacao local do token
  ```

- [ ] **3.2** Atualizar `BiometricAuthService.ts`
  ```text
  Ajustes esperados em `restaurante-app/src/services/BiometricAuthService.ts`:
  - remover `storeCredentials` e `getCredentials` baseados em email/senha
  - usar `BiometricTokenService`
  - apos sucesso biometrico, retornar indicador de autenticacao server-side obrigatoria
  ```

- [ ] **3.3** Atualizar login biométrico em `AuthContext.tsx`
  ```text
  Ajustes esperados em `restaurante-app/src/context/AuthContext.tsx`:
  - tentar `supabase.auth.refreshSession()` apos autenticacao biometrica local
  - se nao houver sessao reaproveitavel, exigir login manual
  - nao reconstruir sessao usando senha persistida localmente
  ```

- [ ] **3.4** Testar fluxo biométrico
  ```bash
  # Testar enrollment e autenticação
  npm run test -- biometric
  ```

#### Critérios de Aceite

- [ ] Senhas nunca mais armazenadas localmente
- [ ] Token biométrico usa hash SHA-256
- [ ] Login biométrico requer validação server-side
- [ ] Tokens expiram após 30 dias

---

### 🟠 ALTO-1: Android Auto Backup Hardening

**ID:** `SEC-W1-004`  
**Severidade:** ALTO  
**Esforço:** 2 horas  
**Responsável:** Mobile Lead  
**Multi-tenant:** ✅ Afeta todos os tenants (Android)  
**Aplica-se diretamente a:** `restaurante-app`

> Status real em 01/04/2026:
> - O item faz sentido e o manifest Android ainda esta com `allowBackup="true"`.
> - Nao se aplica a `restaurante-web` nem a `restaurante-ops`.

#### Tarefas

- [ ] **4.1** Criar `backup_rules.xml` e `data_extraction_rules.xml`
  ```text
  Arquivos-alvo:
  - restaurante-app/android/app/src/main/res/xml/backup_rules.xml
  - restaurante-app/android/app/src/main/res/xml/data_extraction_rules.xml

  Exclusoes minimas:
  - SecureStore
  - AsyncStorage/auth state
  - artefatos biometricos
  ```

- [ ] **4.2** Atualizar `AndroidManifest.xml`
  ```text
  Ajustar `restaurante-app/android/app/src/main/AndroidManifest.xml` para referenciar
  `fullBackupContent` e `dataExtractionRules`, mantendo a estrategia escolhida para `allowBackup`.
  ```

- [ ] **4.4** Testar backup e restore
  ```bash
  # Testar que dados sensíveis não são incluídos
  adb backup -f backup_test.abk com.comandapraia.donacida
  # Inspecionar backup com: abe unpack backup_test.abk backup_test.tar
  # Verificar que SecureStore e auth_state NÃO estão presentes
  ```

- [ ] **4.5** Documentar no README
  ```markdown
  ## Segurança Android
  
  O app usa regras de backup restritivas que excluem:
  - Tokens de autenticação (SecureStore)
  - Dados biométricos
  - Estado de sessão
  
  Para testar: `adb backup -f test.abk com.comandapraia.donacida`
  ```

#### Critérios de Aceite

- [ ] `backup_rules.xml` criado e configurado
- [ ] `data_extraction_rules.xml` criado
- [ ] `AndroidManifest.xml` atualizado
- [ ] Teste de backup confirma exclusão de dados sensíveis

---

### 🟠 ALTO-2: Logging Seguro - Remover console.log em Produção

**ID:** `SEC-W1-005`  
**Severidade:** ALTO  
**Esforço:** 4 horas  
**Responsável:** Full-stack Team  
**Multi-tenant:** ✅ Afeta todos os tenants  
**Aplica-se diretamente a:** `restaurante-app`, `restaurante-web`, `restaurante-ops`

> Status real em 01/04/2026:
> - O problema existe, mas a implementacao deve respeitar a arquitetura atual.
> - `app` e `web` ja possuem `LoggerService`; `ops` ja possui logger estruturado proprio.
> - Evitar criar uma solucao paralela que duplique os loggers existentes sem necessidade.

#### Tarefas

- [ ] **5.1** Endurecer os loggers existentes em vez de criar um logger paralelo
  ```text
  - `restaurante-app/src/services/LoggerService.ts`
  - `restaurante-web/src/services/LoggerService.ts`
  - `restaurante-ops/src/lib/logger.ts`
  ```

- [ ] **5.2** Substituir `console.log` em arquivos críticos
  ```typescript
  // restaurante-app/src/context/AuthContext.tsx
  // restaurante-web/src/context/AuthContext.tsx
  
  import LoggerService from '../services/LoggerService';
  
  // ❌ REMOVER: console.log(`[SupabaseAuth] Auth event: ${event}`, session?.user?.id);
  // ✅ SUBSTITUIR: LoggerService.info('auth_event', { event, userId: session?.user?.id });
  
  // ❌ REMOVER: console.log('[AuthContext] Setting user:', { uid: appUser.uid, funcao: appUser.funcao });
  // ✅ SUBSTITUIR: LoggerService.debug('user_loaded', { uid: appUser.uid, role: appUser.funcao });
  ```

- [ ] **5.3** Reforcar sanitizacao nos loggers do repositório
  ```text
  - Em `app` e `web`, ampliar `LoggerService.scrubData()` para cobrir PII e tokens adicionais.
  - Em `ops`, sanitizar o payload antes de chamar `logInfo`, `logWarn` e `logError`.
  ```

- [ ] **5.4** Configurar Sentry com data scrubbing
  ```typescript
  // src/config/sentryConfig.js
  
  import * as Sentry from '@sentry/react-native';
  
  export const initSentry = () => {
    Sentry.init({
      dsn: 'https://eb58edf9733b7a7665c969d5680dd482@o4510816056049664.ingest.us.sentry.io/4510816058015744',
      debug: __DEV__,
      enabled: true,
      tracesSampleRate: 1.0,
      
      // ✅ CORREÇÃO: Data scrubbing configurado
      beforeSend(event, hint) {
        // Remover dados sensíveis antes de enviar ao Sentry
        if (event.extra) {
          const sensitiveKeys = ['password', 'token', 'secret', 'apiKey', 'email'];
          for (const key of Object.keys(event.extra)) {
            if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
              event.extra[key] = '[REDACTED]';
            }
          }
        }
        
        // Remover PII de user context
        if (event.user) {
          const { email, ...safeUser } = event.user;
          event.user = safeUser;
        }
        
        return event;
      },
      
      // Configurar allowlist de domínios
      allowUrls: [
        /com\.comandapraia\.donacida/,
        /exp\+comandapraia-dona-cida/,
        /restaurante-app/
      ]
    });
  };
  ```

- [ ] **5.5** Scan por console.log restantes
  ```bash
  # Buscar console.log em código de produção
  rg "console\\.log" restaurante-app/src restaurante-web/src restaurante-ops/src
  
  # Substituir manualmente ou com codemod
  ```

#### Critérios de Aceite

- [ ] Loggers existentes endurecidos sem introduzir camada paralela desnecessaria
- [ ] Todos `console.log` em `AuthContext.tsx` substituidos
- [ ] Sentry configurado com `beforeSend` scrubbing em app e web
- [ ] Principais pontos de log de producao revisados em `app`, `web` e `ops`

---

## 📅 SEMANA 2 (08-14 Abr): Certificate Pinning

### 🟠 ALTO-3: Implementar SSL Pinning (Android + iOS)

**ID:** `SEC-W2-001`  
**Severidade:** ALTO  
**Esforço:** 8 horas  
**Responsável:** Mobile Lead  
**Multi-tenant:** ✅ Afeta todos os tenants  
**⚠️ Requer Build Nativo:** Sim (Dev Client ou EAS)  
**Aplica-se diretamente a:** `restaurante-app`

> Status real em 01/04/2026:
> - Item nativo, fora de escopo de `restaurante-web` e `restaurante-ops`.
> - Tratar como trilha opcional e de maior custo operacional, nao como requisito transversal do monorepo.

> Decisao de gate em 02/04/2026:
> - **CONDITIONAL (NO-GO neste ciclo)**.
> - Justificativa objetiva: ausencia de staging dedicado, ausencia de suite automatizada de MITM regression e risco de lockout operacional em rotacao de certificado.
> - Mitigacao alternativa ativa: TLS padrao + HSTS no `ops` + hardening de sessao + MFA para roles privilegiadas.
> - Proximo gatilho para reavaliacao: staging ativo + runbook de rotacao de certificado + teste MITM automatizado no CI/mobile.

#### Tarefas

- [ ] **6.1** Instalar dependências
  ```bash
  npm install react-native-ssl-pinning
  npx expo prebuild # Requer build nativo
  ```

- [ ] **6.2** Exportar certificados das APIs
  ```bash
  # Capturar a cadeia TLS dos hosts HTTPS realmente usados pelo app
  # Ex.: host derivado de EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_EVO_API_URL
  
  # Copiar certificados para assets
  cp supabase_cert.pem assets/certs/
  cp evolution_cert.pem assets/certs/
  ```

- [ ] **6.3** Criar `SecureFetch.ts` apenas se a decisao for implementar pinning
  ```text
  Ajustes esperados:
  - encapsular `react-native-ssl-pinning`
  - usar timeout e fallback controlado em desenvolvimento
  - mapear apenas hosts HTTPS realmente usados pelo app
  ```

- [ ] **6.4** Integrar com `SupabaseConfig.ts`
  ```text
  Se aprovado, ajustar `restaurante-app/src/config/SupabaseConfig.ts` para usar
  o fetch com pinning apenas em producao nativa.
  ```

- [ ] **6.5** Aplicar ajustes nativos minimos em Android/iOS
  ```text
  Rever apenas os pontos nativos realmente necessarios apos a prova de conceito.
  Evitar detalhar `OkHttp`/`Info.plist` no plano antes de validar viabilidade tecnica.
  ```

- [ ] **6.7** Testar pinning
  ```bash
  # Testar que requests falham sem certificado correto
  # Usar proxy (Charles/Mitmproxy) para verificar que pinning bloqueia MITM
  
  # Em desenvolvimento, testar com disablePinning=true
  secureFetch('https://api.supabase.co', { disablePinning: true })
  ```

- [ ] **6.8** Build e deploy
  ```bash
  # Build com EAS
  eas build --platform android --profile production
  eas build --platform ios --profile production
  
  # Testar em smoke controlado antes de production
  eas submit --platform android --path ./app-release.aab
  ```

#### Critérios de Aceite

- [ ] `SecureFetch.ts` implementado
- [ ] Supabase client usa secure fetch em produção
- [ ] Certificados exportados e configurados
- [ ] Teste de MITM falha (pinning funcionando)
- [ ] Build nativo gerado com sucesso

#### Rollback

Se pinning causar issues em produção:
```typescript
// Fallback emergencial
export async function secureFetch(url: string, options: SecureFetchOptions = {}) {
  // Forçar disablePinning via remote config
  const forceDisablePinning = await checkRemoteConfig('disable_ssl_pinning');
  
  if (forceDisablePinning) {
    return fetch(url, options);
  }
  
  // ... existing code
}
```

---

## 📅 SEMANA 3 (15-21 Abr): MFA & Session Hardening

### 🟠 ALTO-4: Implementar MFA TOTP para Admins

**ID:** `SEC-W3-001`  
**Severidade:** ALTO  
**Esforço:** 8 horas  
**Responsável:** Backend Lead + Mobile Lead  
**Multi-tenant:** ✅ Afeta todos os tenants (especialmente admins)  
**Aplica-se diretamente a:** `restaurante-app`, `restaurante-web`

> Status real em 01/04/2026:
> - O tema faz sentido para app e web.
> - O servico `MFAService` atual ainda esta desabilitado por ser legado da migracao Firebase -> Supabase.
> - `restaurante-ops` exigiria trilha propria se houver requisito de MFA para backoffice.

> Atualizacao de execucao em 02/04/2026:
> - `MFAService.ts` reimplementado em app/web com Supabase `auth.mfa` (enroll, challenge, verify, listFactors, unenroll).
> - `MFAVerificationModal` migrado para resolver Supabase em app/web.
> - `AuthContext` em app/web atualizado para enforcement por role privilegiada quando `EXPO_PUBLIC_FEATURE_REQUIRE_MFA=true`.
> - Bloqueio remanescente: habilitar `auth.mfa.totp.enroll_enabled=true` e `verify_enabled=true` no projeto Supabase alvo para validacao runtime completa.

#### Tarefas

- [ ] **7.1** Reimplementar `MFAService.ts` em app e web com Supabase Auth
  ```text
  Requisitos minimos:
  - enrolar fator TOTP
  - listar fatores
  - desafiar/verificar codigo
  - desabilitar fator quando permitido
  ```

- [ ] **7.2** Atualizar `AuthContext.tsx` em app e web
  ```text
  Ajustes esperados:
  - expor `isMFAEnabled`, `setupMFA` e `verifyMFA`
  - consultar estado de MFA apos carregar usuario
  - bloquear fluxos administrativos quando o requisito estiver ativo
  ```

- [ ] **7.3** Criar tela de setup de MFA
  ```text
  Requisitos minimos:
  - exibir QR code/URI TOTP
  - permitir verificacao do codigo
  - confirmar ativacao com feedback claro ao usuario
  ```

- [ ] **7.4** Forçar MFA para admins
  ```text
  Aplicar redirecionamento/guarda apenas para roles privilegiadas
  apos a verificacao do estado de MFA no carregamento do perfil.
  ```

- [ ] **7.5** Atualizar feature flag
  ```bash
  # .env.example
  EXPO_PUBLIC_FEATURE_REQUIRE_MFA=true  # Habilitar para admins
  ```

#### Critérios de Aceite

- [ ] `MFAService.ts` implementado com tipos corretos
- [ ] Tela de setup de MFA funcional
- [ ] Admins são forçados a configurar MFA
- [ ] QR Code TOTP gerado corretamente
- [ ] Verificação de código funciona

---

### 🟠 ALTO-5: Session Fixation Prevention

**ID:** `SEC-W3-002`  
**Severidade:** ALTO  
**Esforço:** 2 horas  
**Responsável:** Mobile Lead  
**Multi-tenant:** ✅ Afeta todos os tenants  
**Aplica-se diretamente a:** `restaurante-app`, `restaurante-web`

> Status real em 01/04/2026:
> - Mitigacao parcial ja existe com rotacao de `sessionKey` apos reload de sessao.
> - O backlog remanescente e o `signOut()` preventivo antes de novo `signInWithPassword()` e a eliminacao do replay biometrico por senha no app.

> Atualizacao de execucao em 02/04/2026:
> - `AuthContext` em app/web com `signOut()` preventivo antes do login por credenciais.
> - Cancelamento de desafio MFA no login agora executa `signOut()` para evitar sessao parcial pendente.
> - Pendente: validacao runtime controlada em ambiente com MFA TOTP habilitado.

#### Tarefas

- [ ] **8.1** Atualizar `login()` no `AuthContext.tsx`
  ```text
  Ajustes minimos:
  - executar `signOut()` preventivo antes de novo `signInWithPassword()`
  - manter `rotateSessionKey: true` apos login bem-sucedido
  - remover qualquer dependencia de credencial biometrica persistida localmente
  ```

- [ ] **8.2** Adicionar rotação de session key
  ```typescript
  // src/context/AuthContext.tsx
  
  const reloadUserData = async (
    sbUser: User,
    options?: { rotateSessionKey?: boolean }
  ) => {
    const rotateSessionKey = options?.rotateSessionKey ?? true;
    
    // ... existing code ...
    
    if (rotateSessionKey) {
      setSessionKey(Date.now()); // ✅ Nova sessão = nova key
    }
    
    // ... existing code ...
  };
  ```

#### Critérios de Aceite

- [ ] `signOut()` chamado antes de `signInWithPassword()`
- [ ] Session key rotacionada após login
- [ ] Testes de session fixation passam

---

## ✅ CHECKLIST DE CONCLUSÃO

### Semana 1
- [ ] `SEC-W1-001`: Firebase API Key rotacionada e placeholders saneados em app e web (pronto_para_deploy: secret gerado, falta testar)
- [x] `SEC-W1-002`: Cursor secrets removidos de app e web (pronto_para_deploy: secret gerado, falta config Railway)
- [x] `SEC-W1-003`: Biometric credentials hardening implementado no app (concluido: BiometricTokenService + storeCredentials removido)
- [x] `SEC-W1-004`: Android Auto Backup hardening implementado no app (concluido: backup_rules.xml + data_extraction_rules.xml + manifest)
- [x] `SEC-W1-005`: Logging seguro implementado sem duplicar a arquitetura atual (concluido: sentryConfig + beforeSend hook + redactValue recursiva)
- [x] `OPS-2`: Logs estruturados revisados e saneados
- [x] `OPS-5`: Segredos server-only e headers revisados

### Semana 2
- [x] `SEC-W2-001`: Certificate pinning avaliado com gate formal
- [x] Decisao registrada: CONDITIONAL (NO-GO neste ciclo)
- [ ] Build nativo gerado com sucesso (somente se gate mudar para GO)
- [ ] Teste de MITM falha (pinning funcionando, somente se gate mudar para GO)
- [x] `OPS-3`: Rate limiting estrito validado com `429` e `503`

### Semana 3
- [ ] `SEC-W3-001`: MFA TOTP iniciado para admins em app e web (codigo implementado; aguardando toggle runtime no Supabase)
- [ ] `SEC-W3-002`: Session fixation hardening iniciado e aplicado em login app/web (aguarda validacao runtime final)
- [ ] Feature flag `REQUIRE_MFA` habilitada apos validacao controlada
- [x] `OPS-1`: Sessao e cookies do backoffice endurecidos

### Semana 4
- [ ] `OPS-4`: Billing e reconcile validados com smoke controlado
- [ ] Evidências operacionais anexadas ou referenciadas no runbook interno

---

## 📊 MÉTRICAS DE SUCESSO

| Métrica | Baseline | Target | Como Medir |
|---------|----------|--------|------------|
| Secrets hardcoded | A medir por projeto | 0 | `rg "secret|token|api[_-]?key|service_role" restaurante-app restaurante-web restaurante-ops` + revisao manual |
| console.log em produção | A medir por projeto | Reducao objetiva nos pontos criticos | varredura focada em arquivos de producao |
| Android allowBackup | true no app | false ou regras explicitas de exclusao | Inspecionar manifest/APK |
| Certificate pinning | Nao implementado no app | Decisao explicita: implementar ou descartar | Teste de MITM + custo operacional |
| MFA para admins | Desabilitado na migracao atual | 100% em app/web para roles privilegiadas | validacao via Supabase Auth |
| Session fixation | Parcialmente mitigado | Protegido | revisar login flow e teste de penetracao |
| Logs sensiveis no `ops` | A medir | 0 ocorrencias intencionais de segredos/PII criticos | revisao manual de amostra + varredura de campos logados |
| Rate limit fail-closed no `ops` | Parcialmente implementado | 100% validado nos endpoints sensiveis | smoke controlado com Redis indisponivel |

---

## 🔗 DOCUMENTAÇÃO RELACIONADA

- [SECURITY_REMEDIATION_WEEKLY_STATUS_2026-Q2.md](./SECURITY_REMEDIATION_WEEKLY_STATUS_2026-Q2.md)
- [SECURITY_AUDIT_REPORT_2026-03-23.md](./SECURITY_AUDIT_REPORT_2026-03-23.md)
- [LGPD-COMPLIANCE-GUIDE.md](../LGPD/LGPD-COMPLIANCE-GUIDE.md)
- [INCIDENT-RESPONSE-PLAN.md](../LGPD/INCIDENT-RESPONSE-PLAN.md)

---

## 📞 CONTATOS DE EMERGÊNCIA

Preencher a partir do runbook operacional interno antes de usar este documento como checklist oficial de incidente. Enquanto isso, tratar esta secao como pendente de governanca e nao como fonte de verdade.

---

**Última Atualização:** 1 de abril de 2026  
**Próxima Revisão:** 7 de abril de 2026
