# PROMPT DE IMPLEMENTAÇÃO — Observabilidade Centralizada (restaurante-ops)

> **Instrução:** Copie este prompt inteiro e envie para o Qwen Code iniciar a implementação.

---

Você é um engenheiro sênior especialista em observabilidade e Node.js.

Sua tarefa é implementar um sistema completo de **observabilidade centralizada** no projeto **restaurante-ops**. O restaurante-ops será a **única plataforma de monitoramento** — ele coleta, armazena, consulta e exibe logs de todos os projetos do ecossistema, **sem depender de serviços externos de APM**.

---

## 🎯 CONTEXTO DO PROJETO

### Arquitetura

O **restaurante-ops** é a plataforma completa de observabilidade:

```
restaurante-web ──┐
                  │
restaurante-app ──┤
                  │
Supabase ─────────┤
Activepieces ─────┤──▶  restaurante-ops
Evolution API ────┤     (Coleta, Armazena,
                  │      Consulta, Dashboard, Alertas)
                  │
```

### Stack do restaurante-ops

| Camada          | Tecnologia                                                  |
|-----------------|-------------------------------------------------------------|
| **Runtime**     | Node.js 20+ (ES Modules, `type: "module"`)                  |
| **Linguagem**   | TypeScript 5.9 (strict mode, target ES2022)                 |
| **HTTP Server** | `node:http` vanilla (zero frameworks — sem Express/Fastify) |
| **Database**    | Supabase (PostgreSQL) via `@supabase/supabase-js` 2.56      |
| **Cache**       | Redis (`redis` 4.7) com fallback in-memory                  |
| **Build**       | `tsx` (watch), `tsc` (build)                                |
| **Deploy**      | Railway                                                     |

### Storage de Logs

Os logs **não devem** ser armazenados no mesmo banco transacional de produção (`restaurante-web`/`restaurante-app`).

Use um **projeto Supabase dedicado para observabilidade** (ou PostgreSQL dedicado equivalente), isolado por infraestrutura, com estas tabelas:

**`ops_logs`** — armazena todos os logs coletados:

```sql
CREATE TABLE ops_logs (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  level       TEXT NOT NULL CHECK (level IN ('info', 'warn', 'error')),
  service     TEXT NOT NULL,
  event       TEXT NOT NULL,
  message     TEXT NOT NULL,
  request_id  UUID,
  user_id     TEXT,
  order_id    TEXT,
  duration_ms INTEGER,
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ops_logs_timestamp ON ops_logs (timestamp DESC);
CREATE INDEX idx_ops_logs_service ON ops_logs (service);
CREATE INDEX idx_ops_logs_event ON ops_logs (event);
CREATE INDEX idx_ops_logs_level ON ops_logs (level);
CREATE INDEX idx_ops_logs_request_id ON ops_logs (request_id);
 CREATE INDEX idx_ops_logs_order_id ON ops_logs (order_id);
 -- Índice composto para queries de "erros nas últimas Xh" (level + range de timestamp)
 CREATE INDEX idx_ops_logs_level_timestamp ON ops_logs (level, timestamp DESC);
```

Opcional (recomendado para rastreabilidade multi-tenant em alto volume):

```sql
ALTER TABLE ops_logs ADD COLUMN company_id UUID;
CREATE INDEX idx_ops_logs_company_id_timestamp ON ops_logs (company_id, timestamp DESC);
```

### Diretriz de performance (obrigatória)

- Ingestão assíncrona: `POST /api/logs` responde rápido (`202 Accepted`) e persiste em background.
- Escrita em lote: flush periódico (1-2s) ou por tamanho de lote (200-1000).
- Backpressure: se fila crescer acima do limite, aplicar degradação controlada (drop de `info`/`debug` primeiro; nunca `error` crítico).
- Retenção em camadas:
  - hot: 7-15 dias indexados;
  - warm: 30-90 dias com índices mínimos;
  - cold: export para object storage para auditoria/LGPD.
- Nunca executar consultas analíticas pesadas no banco de pedidos/pagamentos.

**`ops_alerts`** e **`ops_alert_firings`** — gerenciamento de alertas:

```sql
CREATE TABLE ops_alerts (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  condition   JSONB NOT NULL,
  channel     TEXT NOT NULL,
  channel_config JSONB,
  enabled     BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE ops_alert_firings (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  alert_id    BIGINT NOT NULL REFERENCES ops_alerts(id) ON DELETE CASCADE,
  fired_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  context     JSONB,
  notified    BOOLEAN NOT NULL DEFAULT false
);
```

### Estrutura atual do restaurante-ops

```
restaurante-ops/
├── src/
│   ├── index.ts                          # Entry point (2662 linhas, vanilla HTTP, node:http)
│   ├── config/
│   │   └── env.ts                        # Variáveis de ambiente validadas (OpsEnv interface)
│   ├── auth/
│   │   ├── supabase.ts                   # Cliente Supabase service-role
│   │   ├── session.ts                    # Cookies httpOnly
│   │   └── middleware.ts                 # requireAuth()
│   ├── lib/
│   │   ├── logger.ts                     # Logger JSON existente (com redaction — campo: "ts")
│   │   ├── redis.ts                      # Cliente Redis
│   │   └── rate-limiter.ts               # Rate limiter distribuído
│   ├── modules/
│   │   ├── billing/                      # Submódulo billing
│   │   ├── customers/                    # Submódulo clientes
│   │   ├── metrics/                      # Submódulo métricas
│   │   ├── billing-operations.ts         # Reconciliação billing
│   │   ├── billing-plan-config-operations.ts  # Config de plano
│   │   ├── data.ts                       # Acesso a dados (KPIs, empresas, invoices)
│   │   ├── ops-security.ts               # Gestão MFA
│   │   ├── service-status.ts             # Health check de serviços externos
│   │   └── supabase-metrics.ts           # Métricas do banco
│   └── views/
│       └── dashboard.ts                  # Template HTML do dashboard existente
├── docs/
│   └── (vazio)
├── package.json                          # type: "module", tsx, @supabase/supabase-js 2.56, redis 4.7
├── tsconfig.json
└── railway.json

# IMPORTANTE: restaurante-web e restaurante-app são projetos Expo/React Native,
# NÃO são Next.js. Usam prefixo EXPO_PUBLIC_ (não NEXT_PUBLIC_).
# Ambos já possuem src/services/LoggerService.ts (Sentry) para crash reporting.
```
├── src/
│   ├── index.ts                          # Entry point (2662 linhas, vanilla HTTP)
│   ├── config/
│   │   └── env.ts                        # Variáveis de ambiente validadas
│   ├── auth/
│   │   ├── supabase.ts                   # Cliente Supabase service-role
│   │   ├── session.ts                    # Cookies httpOnly
│   │   └── middleware.ts                 # requireAuth()
│   ├── lib/
│   │   ├── logger.ts                     # Logger JSON existente (com redaction)
│   │   ├── redis.ts                      # Cliente Redis
│   │   └── rate-limiter.ts               # Rate limiter distribuído
│   ├── modules/
│   │   ├── data.ts                       # Acesso a dados (KPIs, empresas, invoices)
│   │   ├── billing-operations.ts         # Reconciliação billing
│   │   ├── billing-plan-config-operations.ts  # Config de plano
│   │   ├── ops-security.ts               # Gestão MFA
│   │   ├── service-status.ts             # Health check de serviços externos
│   │   └── supabase-metrics.ts           # Métricas do banco
│   └── views/
│       └── dashboard.ts                  # Template HTML do dashboard existente
├── docs/
│   └── OBSERVABILITY-IMPLEMENTATION-GUIDE.md  # Guia completo de referência
├── package.json
├── tsconfig.json
└── railway.json
```

### Logger existente (`src/lib/logger.ts`)

Já existe um logger JSON com redaction de dados sensíveis. **Formato atual (campo `ts`, não `timestamp`):**

```json
{
  "ts": "ISO8601",
  "level": "info|warn|error",
  "event": "nome_evento",
  ...
}
```

**Redaction automática** para: `token`, `secret`, `password`, `cookie`, `authorization`, `api_key`, `apikey`, `service_role`, `mp_payment`, `card`, `cvv`, `pix_qr`. Emails são mascarados.

**Este logger deve ser refatorado** para o novo formato padronizado (`timestamp` ao invés de `ts`, campo `service` obrigatório, campo `message` obrigatório) e integrado com o storage de logs.

> **Redaction a adicionar:** `cpf`, `phone` (mencionados na section de segurança mas ausentes no código atual).

---

## 🎯 OBJETIVO

Implementar no **restaurante-ops** um sistema completo de observabilidade que:

* Colete logs de web, app, Supabase, Activepieces e Evolution API
* Armazene no PostgreSQL de observabilidade (Supabase dedicado, isolado do banco transacional)
* Permita consulta via API com filtros avançados
* Exiba um **dashboard web** para visualização de logs e métricas
* Rastreie pedidos completos de início ao fim (via `request_id`)
* Configure e dispare **alertas** baseados em condições
* Seja a **única fonte de verdade** para observabilidade do ecossistema

---

## ⚙️ REQUISITOS TÉCNICOS

### 1. FORMATO PADRÃO DE LOGS

Refatorar o logger existente para o seguinte formato:

```json
{
  "timestamp": "2026-04-03T10:30:00.000Z",
  "level": "info|warn|error",
  "service": "ops|web|app|supabase|activepieces|evolution",
  "event": "nome_do_evento",
  "message": "descrição clara",
  "request_id": "uuid",
  "user_id": "id do usuário",
  "order_id": "id do pedido",
  "duration_ms": 123,
  "metadata": {}
}
```

### 2. EVENTOS DE NEGÓCIO OBRIGATÓRIOS

Criar suporte a logging para os seguintes eventos:

| Evento                | Origem       | Descrição                             |
|-----------------------|--------------|---------------------------------------|
| `order_created`       | web / app    | Criação de pedido                     |
| `order_updated`       | web / ops    | Atualização de status                 |
| `order_cancelled`     | web / ops    | Cancelamento                          |
| `payment_success`     | ops / web    | Pagamento confirmado                  |
| `payment_failed`      | ops / web    | Falha no pagamento                    |
| `webhook_received`    | ops          | Webhook recebido                      |
| `webhook_failed`      | ops          | Falha ao processar webhook            |
| `automation_executed` | activepieces | Workflow executado                    |
| `automation_failed`   | activepieces | Falha em workflow                     |
| `whatsapp_sent`       | evolution    | Mensagem enviada                      |
| `whatsapp_failed`     | evolution    | Falha no envio                        |
| `whatsapp_webhook`    | evolution    | Evento recebido                       |
| `slow_query`          | supabase     | Query > 500ms                         |
| `db_error`            | supabase     | Erro de query                         |
| `app_error`           | web / app    | Erro JS via ErrorUtils                | 
|                       |              | (React Native — não `window.onerror`) |
| `api_error`           | web / app    | Erro em chamada API                   |
| `app_startup`         | app          | Inicialização do app                  |
| `page_view`           | web          | Navegação (React Navigation)          |
| `http_request`        | ops          | Toda requisição HTTP                  |

### 3. STORAGE DE LOGS

Criar `src/lib/log-storage.ts` com:

- `insertLog(log: LogEntry): Promise<void>`
- `insertLogs(logs: LogEntry[]): Promise<void>` — batch insert
- `queryLogs(filter: LogFilter): Promise<{ total: number, logs: LogEntry[] }>`
  - Filtros por: `service`, `level`, `event`, `dateRange`, `request_id`, `order_id`, `user_id`
  - Paginação: `limit`, `offset`
  - Ordenação: `timestamp DESC`
- `getMetrics(): Promise<LogMetrics>`
- `traceRequest(requestId: string): Promise<LogEntry[]>`
- `traceOrder(orderId: string): Promise<LogEntry[]>`
- `cleanupOldLogs(olderThanDays: number): Promise<number>`

### 4. MIDDLEWARE DE REQUEST TRACKING

Criar `src/lib/request-tracker.ts` com:

 - Gerar `request_id` único (UUID v4) por requisição — usar `crypto.randomUUID()` built-in do Node.js (sem dependência externa)
- Medir tempo de resposta (início → fim)
- Logar todas as requisições HTTP com evento `http_request`
- Logar automaticamente respostas com status >= 400
- Injetar `request_id` em header de resposta `X-Request-ID`
- Propagar `request_id` em chamadas internas

### 5. LOGGER CENTRAL (REFATORAR)

Refatorar `src/lib/logger.ts` com:

- Manter redaction existente (senhas, tokens, etc.)
 - Adaptar para novo formato de log — renomear campo `ts`→`timestamp` e `durationMs`→`duration_ms` em `LogContext`
- Inserir log no storage (assíncrono, não bloqueante)
- Batch inserts para performance
- Exportar funções: `logInfo()`, `logWarn()`, `logError()`
- Funções especializadas:
  - `logOrderEvent(event, orderId, userId, metadata)`
  - `logPaymentEvent(event, orderId, userId, metadata)`
  - `logWebhookEvent(event, source, metadata)`
  - `logAutomationEvent(event, workflowId, metadata)`
  - `logWhatsAppEvent(event, phoneNumber, metadata)`
  - `logDbEvent(event, queryInfo, metadata)`

### 6. WRAPPER SUPABASE

Criar `src/lib/supabase-logger.ts` com:

- Wrapper para medir tempo de cada query
- Logar queries lentas (> 500ms) com `warn` + `slow_query`
- Logar erros de query com `error` + `db_error`
- Incluir `request_id` no contexto de cada query

### 7. WEBHOOK ACTIVEPIECES

Criar `src/lib/activepieces-logger.ts` com:

 - Endpoint `POST /webhooks/activepieces` no ops
 - **Autenticar** via `X-Webhook-Secret` (env `ACTIVEPIECES_WEBHOOK_SECRET`) — rejeitar com 401 se ausente ou inválido
 - Logar `automation_executed` ou `automation_failed`
- Incluir: `workflow_id`, `execution_id`, `workflow_name`, `duration_ms`, `result`

### 8. WEBHOOK EVOLUTION API

Criar `src/lib/evolution-logger.ts` com:

 - Endpoint `POST /webhooks/evolution` no ops
 - **Autenticar** via `X-Webhook-Secret` (env `EVOLUTION_WEBHOOK_SECRET`) — rejeitar com 401 se ausente ou inválido
 - Wrapper para chamadas de envio de mensagem
- Logar `whatsapp_sent`, `whatsapp_failed`, `whatsapp_webhook`
- Incluir: `phone_number` (mascarado), `message_id`, `instance`, `message_type`

### 9. ENDPOINT DE LOGS EXTERNOS

Criar `src/lib/external-logs.ts` com:

- Endpoint `POST /api/logs` no ops
- Autenticar via API key (header `X-Log-Api-Key`)
- Receber batch de logs do web e app
- Validar formato, aplicar redaction, inserir no storage
 - Rate limiting por API key (`X-Log-Api-Key`) — **não usar IP** como chave (apps Expo podem estar atrás de NAT/CDN)
- Responder com 202 Accepted

### 10. API DE CONSULTA DE LOGS

Criar `src/lib/logs-api.ts` com rotas protegidas (requireAuth):

| Método | Path                         | Descrição                    |
|--------|------------------------------|------------------------------|
| `GET`  | `/api/logs`                  | Listar logs com filtros      |
| `GET`  | `/api/logs/trace/:requestId` | Rastrear requisição completa |
| `GET`  | `/api/logs/order/:orderId`   | Rastrear pedido completo     |
| `GET`  | `/api/logs/metrics`          | Métricas agregadas           |
| `GET`  | `/api/logs/alerts`           | Listar alertas configurados  |
| `POST` | `/api/logs/alerts`           | Criar alerta                 |

### 11. ENGINE DE ALERTAS

Criar `src/lib/alerts-engine.ts` com:

- Verificar alertas configurados em intervalos regulares
- Query no storage para verificar condições
- Notificar via email ou webhook (Slack)
- Logar disparo de alerta no storage

### 12. DASHBOARD WEB

Criar `src/views/observability.ts` com template HTML para:

- **Log Viewer** — tabela de logs com filtros, paginação, busca
- **Métricas** — cards de resumo, gráficos de volume/erro/latência
- **Trace** — timeline de request_id ou order_id
- **Alertas** — gestão de alertas configurados

### 13. VARIÁVEIS DE AMBIENTE

Atualizar `src/config/env.ts` (interface `OpsEnv`) e `.env.example` com:

```bash
# Logging
LOG_LEVEL=info
SLOW_QUERY_THRESHOLD_MS=500
LOG_RETENTION_DAYS=30

# Storage observability (isolado)
OBS_SUPABASE_URL=https://<observability-project>.supabase.co
OBS_SUPABASE_SERVICE_ROLE_KEY=<service_role_observability>

# Ingestão/flush
LOG_INGEST_BUFFER_MAX=10000
LOG_INGEST_BATCH_SIZE=500
LOG_INGEST_FLUSH_INTERVAL_MS=1500

# Rollout controlado
OBS_DUAL_WRITE=false
OBS_READ_FROM_ISOLATED=false

# API Key para recebimento de logs externos (web/app)
# Valor é exposto no bundle Expo — apenas escrita de logs, sem risco crítico
# Rate limiting no endpoint mitiga abuso
OPS_LOG_API_KEY=sk-ops-log-key-aqui

# Alertas
ALERT_CHECK_INTERVAL_MS=60000
ALERT_WEBHOOK_TIMEOUT_MS=5000
```

**Variáveis do lado dos apps Expo** (`restaurante-web` e `restaurante-app`):

```bash
# EXPO_PUBLIC_ — obrigatório para Expo (NÃO usar NEXT_PUBLIC_)
EXPO_PUBLIC_OPS_LOGS_ENDPOINT=https://ops.restaurante-web.app.br
EXPO_PUBLIC_LOG_API_KEY=sk-ops-log-key-aqui
```

### 14. BOAS PRÁTICAS

* **Nunca logar dados sensíveis** (senha, token, cartão) — manter redaction
* Usar níveis corretos (`info`, `warn`, `error`)
* Garantir baixo impacto de performance (envio assíncrono)
* Logs devem ser legíveis e consistentes
* Zero dependências desnecessárias
* Falha graceful: se storage falhar, fallback para stdout

---

## 📦 ENTREGÁVEIS

### restaurante-ops (todos em `restaurante-ops/`)
1. **Provisionamento** de projeto Supabase dedicado para observabilidade
2. **SQL migration** em `database-backup/migrations/` — Tabelas `ops_logs`, `ops_alerts`, `ops_alert_firings` com RLS correta
3. **`src/lib/log-storage.ts`** — Storage de logs no Supabase de observabilidade
4. **`src/lib/logger.ts`** (refatorado) — Renomear `ts`→`timestamp`, `durationMs`→`duration_ms`, adicionar `service`/`message` obrigatórios, integrar com storage
5. **`src/lib/request-tracker.ts`** — Middleware de request tracking
6. **`src/lib/supabase-logger.ts`** — Wrapper para queries Supabase
7. **`src/lib/evolution-logger.ts`** — Logging + webhook Evolution API
8. **`src/lib/activepieces-logger.ts`** — Logging + webhook Activepieces
9. **`src/lib/external-logs.ts`** — Endpoint `POST /api/logs` para web/app
10. **`src/lib/logs-api.ts`** — API de consulta de logs + métricas
11. **`src/lib/alerts-engine.ts`** — Engine de alertas
12. **`src/lib/alert-scheduler.ts`** — Agendamento de verificação de alertas
13. **`src/views/observability.ts`** — Dashboard web de observabilidade
14. **`src/config/env.ts`** (atualizado) — Adicionar `OPS_LOG_API_KEY`, `LOG_LEVEL`, `OBS_*` na interface `OpsEnv`
15. **`.env.example`** (atualizado) — Documentação das novas variáveis
16. **`src/index.ts`** (atualizado) — Integrar middlewares, rotas de webhook e dashboard
17. **Feature flags de migração** — `OBS_DUAL_WRITE` e `OBS_READ_FROM_ISOLATED`

### restaurante-web e restaurante-app (Expo/React Native)
16. **`restaurante-web/src/services/ObservabilityService.ts`** — Captura `app_error` + envio para ops
17. **`restaurante-app/src/services/ObservabilityService.ts`** — Equivalente para o app mobile
    - Ambos usam `ErrorUtils.setGlobalHandler` (não `window.onerror`)
    - Ambos usam `EXPO_PUBLIC_` para env vars (não `NEXT_PUBLIC_`)
    - Ambos complementam o `LoggerService.ts` existente (Sentry para crashes, ops para eventos)

---

## 🚀 RESULTADO ESPERADO

Ao final da implementação, o restaurante-ops deve permitir:

* **Rastrear um pedido completo** (do início ao fim, via `request_id`)
* **Identificar rapidamente falhas** em integrações
* **Visualizar logs e métricas** via dashboard web
* **Configurar alertas** com notificações
* **Receber logs** do web, app e integrações externas
* **Baixo impacto de performance** (< 10ms de overhead síncrono por requisição)
* p95 ingest-to-persist <= 3s no ambiente de produção
* Ser a **única fonte de verdade** para observabilidade — sem serviços externos

---

## ⚠️ IMPORTANTE

* A implementação deve ser **modular**, **escalável** e **fácil de manter**
* Compatível com ambiente **Railway**
* Foco em **produção e alto volume** de requisições
* Manter **zero dependências desnecessárias** (stack minimalista do projeto)
* **ES Modules** puros — sem `require()`
* **TypeScript strict** — sem `any` injustificado
* **Preservar padrões existentes** do projeto (logger JSON, redaction, env validation)
* O dashboard web deve ser **Server-Side Rendered** (mesmo padrão do projeto)
* **`restaurante-web` e `restaurante-app` são Expo/React Native, não Next.js:**
  - Não usar `window.onerror` (API do browser) — usar `ErrorUtils.setGlobalHandler`
  - Não usar prefixo `NEXT_PUBLIC_` — usar `EXPO_PUBLIC_`
  - Móduos nos apps vão em `src/services/ObservabilityService.ts` (seguir padrão de `LoggerService.ts`)
  - **Sentry já existe** em ambos os projetos via `src/services/LoggerService.ts` — o ObservabilityService **complementa** (Sentry para crashes, ops para eventos de negócio)
* **RLS de `ops_logs`:** INSERT restrito a `service_role` apenas; SELECT para `authenticated`

---

## 📋 ORDEM DE IMPLEMENTAÇÃO SUGERIDA

1. Provisionar projeto Supabase dedicado para observabilidade
2. Criar SQL migration das tabelas de logs e alertas no banco isolado
3. Criar `src/lib/log-storage.ts` — Storage
4. Criar types/interfaces para logs padronizados
5. Refatorar `src/lib/logger.ts` para novo formato
6. Criar middleware de request tracking
7. Integrar logger + storage + request tracking no `src/index.ts`
8. Criar wrapper Supabase
9. Criar endpoint de logs externos (`POST /api/logs`)
10. Criar webhook Activepieces
11. Criar webhook Evolution API
12. Criar API de consulta de logs (`GET /api/logs`, `/metrics`, `/trace`)
13. Criar engine de alertas + scheduler
14. Criar dashboard web de observabilidade
15. Atualizar env config e `.env.example`
16. Habilitar dual-write (`OBS_DUAL_WRITE=true`) por janela controlada
17. Validar consistência (contagem/erros/traces) entre legado e isolado
18. Ativar leitura do banco isolado (`OBS_READ_FROM_ISOLATED=true`)
19. Desativar escrita legada após estabilidade
20. Testar end-to-end (simular coleta, consulta e alertas)
21. Documentar uso e exemplos

### Critérios de corte para migração

- Habilitar leitura no isolado somente se divergência de contagem em 24h < 0.5%.
- Não pode haver perda de logs `error` durante dual-write.
- Reverter para leitura antiga imediatamente se p95 de query do dashboard piorar > 30% por 30 min.

### Artefatos de execução obrigatórios

- Runbook de cutover: `docs/OBSERVABILITY-ISOLATED-CUTOVER-RUNBOOK.md`
- SQL de referência (particionado): `docs/scripts/observability_partitioned_schema.sql`

---

**Inicie a implementação agora.** Comece lendo os arquivos existentes (`src/lib/logger.ts`, `src/config/env.ts`, `src/index.ts`, `src/views/dashboard.ts`) para entender os padrões atuais antes de criar novos arquivos.

> **Atenção ao ler `src/lib/logger.ts`:** O campo de timestamp atual é `ts` (não `timestamp`). A refatoração deve renomear para `timestamp` e adicionar os campos `service` e `message` como obrigatórios no formato de saída. Qualquer código que precise do campo `ts` deve ser migrado em conjunto.
