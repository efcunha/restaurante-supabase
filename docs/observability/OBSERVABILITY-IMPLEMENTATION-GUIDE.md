# Guia de Implementação — Observabilidade Centralizada (restaurante-ops)

## Visão Geral

O **restaurante-ops** é a plataforma completa de observabilidade do ecossistema restaurante. Ele coleta, armazena, consulta e exibe logs de todos os projetos — sem dependência externa de APM.

```
┌──────────────────────────────────────────────────────────────┐
│                     restaurante-ops                          │
│                                                              │
│  ┌────────────┐  ┌─────────────┐  ┌───────────────────────┐  │
│  │  Coleta    │  │  Armazena   │  │  Consulta + Dashboard │  │
│  │  de Logs   │─▶│  (Storage)  │─▶│  + Alertas           │  │
│  └────────────┘  └─────────────┘  └───────────────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │              Web UI (Dashboard)                        │  │
│  │   (Log Viewer, Métricas, Alertas, Rastreamento)        │  │
│  └────────────────────────────────────────────────────────┘  │
└───────┬──────────────┬───────────────┬───────────────────────┘
        │              │               │
        │ Envia logs   │ Envia logs    │ Envia logs
        ▼              ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────────┐
│  restaurante │ │ restaurante  │ │  Supabase        │
│  -web        │ │  -app        │ │  (Queries,       │
│  (Frontend)  │ │  (Mobile)    │ │   Auth, RLS)     │
└──────────────┘ └──────────────┘ └──────────────────┘
        │                               │
        │ Webhooks                      │ Webhooks
        ▼                               ▼
┌──────────────────┐          ┌──────────────────┐
│  Activepieces    │          │  Evolution API   │
│  (Workflows)     │          │  (WhatsApp)      │
└──────────────────┘          └──────────────────┘
```

### Fluxo de Dados

1. **restaurante-web** e **restaurante-app** enviam logs via `POST /api/logs`
2. **Supabase** é monitorado via wrapper no cliente (queries lentas, erros)
3. **Activepieces** e **Evolution API** enviam webhooks para endpoints no ops
4. **restaurante-ops** coleta, armazena em storage (SQLite/PostgreSQL/arquivos)
5. **Dashboard web** no ops permite consulta, filtro e visualização
6. **Alertas** são configuráveis via UI

---

## 1. Formato Padrão de Logs

Todos os logs devem seguir este formato JSON:

```json
{
  "timestamp": "2026-04-03T10:30:00.000Z",
  "level": "info|warn|error",
  "service": "ops|web|app|supabase|activepieces|evolution",
  "event": "nome_do_evento",
  "message": "descrição clara",
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "id_do_usuário",
  "order_id": "id_do_pedido",
  "duration_ms": 145,
  "metadata": {}
}
```

### Campos Obrigatórios

| Campo       | Tipo     | Descrição                   |
|-------------|----------|-----------------------------|
| `timestamp` | ISO 8601 | Data/hora do evento         |
| `level`     | string   | `info`, `warn`, `error`     |
| `service`   | string   | Serviço de origem           |
| `event`     | string   | Nome do evento de negócio   |
| `message`   | string   | Descrição legível do evento |

### Campos Opcionais (contextuais)

| Campo         | Tipo   | Descrição                                           |
|---------------|--------|-----------------------------------------------------|
| `request_id`  | UUID   | ID único da requisição (rastreamento cross-service) |
| `user_id`     | string | ID do usuário                                       |
| `order_id`    | string | ID do pedido                                        |
| `duration_ms` | number | Duração da operação                                 |
| `metadata`    | object | Dados adicionais do evento                          |
| `error`       | string | Mensagem de erro (se aplicável)                     |
| `stack`       | string | Stack trace (apenas em `error`)                     |

---

## 2. Eventos de Negócio

| Evento                | Origem       | Descrição                            |
|-----------------------|--------------|--------------------------------------|
| `order_created`       | web / app    | Criação de pedido                    |
| `order_updated`       | web / ops    | Atualização de status do pedido      |
| `order_cancelled`     | web / ops    | Cancelamento de pedido               |
| `payment_success`     | ops / web    | Confirmação de pagamento             |
| `payment_failed`      | ops / web    | Falha no pagamento                   |
| `webhook_received`    | ops          | Recepção de webhook (qualquer fonte) |
| `webhook_failed`      | ops          | Falha ao processar webhook           |
| `automation_executed` | activepieces | Execução de workflow                 |
| `automation_failed`   | activepieces | Falha em workflow                    |
| `whatsapp_sent`       | evolution    | Mensagem enviada via WhatsApp        |
| `whatsapp_failed`     | evolution    | Falha no envio via WhatsApp          |
| `whatsapp_webhook`    | evolution    | Evento recebido da Evolution API     |
| `slow_query`          | supabase     | Query > 500ms                        |
| `db_error`            | supabase     | Erro de query/conexão                |
| `app_error`           | web / app    | Erro JS capturado via ErrorUtils (React Native) |
| `api_error`           | web / app    | Erro em chamada API                  |
| `app_startup`         | app          | Inicialização do app                 |
| `page_view`           | web          | Navegação de página (React Navigation) |
| `http_request`        | ops          | Toda requisição HTTP (para métricas) |

> **Nota:** `frontend_error` é uma convenção de browser (`window.onerror`). Como `restaurante-web` e `restaurante-app` são **Expo/React Native**, o evento correto é `app_error` (capturado via `ErrorUtils.setGlobalHandler`).

---

## 3. Componentes a Implementar no restaurante-ops

### 3.1 Storage de Logs (`src/lib/log-storage.ts`)

**Responsabilidade:** Persistir e consultar logs com alto throughput sem competir recursos com o banco transacional de pedidos/pagamentos.

**Opções de storage (comparativo):**

| Opção | Prós | Contras |
|---|---|---|
| **SQLite** | Zero configuração, arquivo único | Não escala para ingestão concorrente alta |
| **JSONL (arquivo)** | Simples, barato, append rápido | Busca/filtro caros, sem índices robustos |
| **PostgreSQL (instância isolada de observabilidade)** | SQL completo, índices, equipe já domina | Exige projeto/instância dedicada |

**Recomendação (produção):** usar **PostgreSQL isolado para observabilidade** (Supabase dedicado ao `restaurante-ops`), separado do banco transacional de `restaurante-web` e `restaurante-app`.

**Motivo técnico:** logs são carga predominantemente de escrita e leitura analítica. Misturar com o banco transacional aumenta contenção de I/O, autovacuum, cache miss e risco de latência em fluxos críticos (Balcão, Mesa, Delivery, Billing).

**Arquitetura recomendada para performance:**

1. **Ingestão assíncrona no ops:** endpoint recebe `POST /api/logs`, valida e coloca em buffer em memória/Redis.
2. **Flush em lote:** escrita em lotes (ex.: 200-1000 registros por batch ou a cada 1-2s) para reduzir round-trips.
3. **Banco isolado de observabilidade:** tabelas `ops_logs`, `ops_alerts`, `ops_alert_firings` em projeto/instância dedicada.
4. **Retenção em camadas:**
  - hot: 7-15 dias com índices para troubleshooting rápido;
  - warm: 30-90 dias com menos índices;
  - cold: export (JSONL/Parquet em object storage) para compliance e auditoria longa.

> **Multi-tenancy:** manter `company_id` no `metadata` (ou coluna dedicada indexada quando necessário para auditoria por tenant), sem violar isolamento entre empresas.

#### Tabela `ops_logs`

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

-- Opcional para auditoria por tenant com alto volume:
-- adicionar coluna dedicada melhora filtros sem custo de parsing JSONB
-- ALTER TABLE ops_logs ADD COLUMN company_id UUID;

-- Índices para consulta rápida
CREATE INDEX idx_ops_logs_timestamp ON ops_logs (timestamp DESC);
CREATE INDEX idx_ops_logs_service ON ops_logs (service);
CREATE INDEX idx_ops_logs_event ON ops_logs (event);
CREATE INDEX idx_ops_logs_level ON ops_logs (level);
CREATE INDEX idx_ops_logs_request_id ON ops_logs (request_id);
CREATE INDEX idx_ops_logs_order_id ON ops_logs (order_id);
-- CREATE INDEX idx_ops_logs_company_id_timestamp ON ops_logs (company_id, timestamp DESC);
-- Índice composto para a query frequente "erros nas últimas Xh" (level + range de timestamp)
CREATE INDEX idx_ops_logs_level_timestamp ON ops_logs (level, timestamp DESC);

-- RLS: restrição de acesso por role
ALTER TABLE ops_logs ENABLE ROW LEVEL SECURITY;

-- INSERT: apenas service_role (endpoints do restaurante-ops) — nunca anon ou usuário comum
CREATE POLICY "ops_service_role_insert_logs" ON ops_logs
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- SELECT: apenas usuários autenticados (visualização no dashboard ops)
CREATE POLICY "ops_authenticated_read_logs" ON ops_logs
  FOR SELECT
  USING (auth.role() IN ('service_role', 'authenticated'));
```

**Funcionalidades do storage:**

- `insertLog(log: LogEntry): Promise<void>`
- `queryLogs(filter: LogFilter): Promise<LogEntry[]>`
  - Filtros por: `service`, `level`, `event`, `dateRange`, `request_id`, `order_id`, `user_id`
  - Paginação: `limit`, `offset`
  - Ordenação: `timestamp DESC`
- `getMetrics(): Promise<LogMetrics>` — contagens por serviço, nível, evento
- `traceRequest(requestId: string): Promise<LogEntry[]>` — rastrear fluxo completo

**Requisitos mínimos de tuning (produção):**

- Inserção via batch obrigatório (`insertLogs`) com backpressure.
- Janitor de retenção diário (`cleanupOldLogs`) com janela configurável por ambiente.
- Query limits defensivos (`limit <= 200`) e time range obrigatório para buscas amplas.
- Observabilidade do próprio pipeline: métricas de fila, taxa de ingestão, taxa de erro de flush e lag de persistência.

### 3.2 Logger Central (`src/lib/logger.ts` — refatorado)

**Responsabilidade:** Interface única de logging para todo o ecossistema.

**Funcionalidades:**
- Manter redaction existente (senhas, tokens, etc.)
 - Adaptar para novo formato de log — renomear campo `ts`→`timestamp` e `durationMs`→`duration_ms` em `LogContext`
- Inserir log no storage (assíncrono, não bloqueante)
- Exportar funções: `logInfo(event, context)`, `logWarn(event, context)`, `logError(event, context)`
- Funções especializadas:
  - `logOrderEvent(event, orderId, userId, metadata)`
  - `logPaymentEvent(event, orderId, userId, metadata)`
  - `logWebhookEvent(event, source, metadata)`
  - `logAutomationEvent(event, workflowId, metadata)`
  - `logWhatsAppEvent(event, phoneNumber, metadata)`
  - `logDbEvent(event, queryInfo, metadata)`

### 3.3 Middleware de Request Tracking (`src/lib/request-tracker.ts`)

**Responsabilidade:** Instrumentar todas as requisições HTTP.

**Funcionalidades:**
 - Gerar `request_id` único (UUID v4) por requisição — usar `crypto.randomUUID()` built-in do Node.js (sem dependência externa, disponível a partir do Node 14.17)
- Medir tempo de resposta (início → fim)
- Logar todas as requisições HTTP com evento `http_request`
- Logar automaticamente respostas com status >= 400
- Injetar `request_id` em header de resposta `X-Request-ID`
- Propagar `request_id` em chamadas internas

### 3.4 Wrapper Supabase (`src/lib/supabase-logger.ts`)

**Responsabilidade:** Medir performance e logar erros do Supabase.

**Funcionalidades:**
- Wrapper em torno do cliente Supabase para medir tempo de cada query
- Logar queries lentas (> 500ms) com nível `warn` + evento `slow_query`
- Logar erros de query com nível `error` + evento `db_error`
- Incluir `request_id` no contexto de cada query
- Incluir metadata: `table`, `operation`, `duration_ms`

### 3.5 Webhook Interceptor — Activepieces (`src/lib/activepieces-logger.ts`)

**Responsabilidade:** Receber e logar eventos do Activepieces.

**Funcionalidades:**
 - Criar endpoint `POST /webhooks/activepieces` no restaurante-ops
 - **Autenticar** via `X-Webhook-Secret` header (env `ACTIVEPIECES_WEBHOOK_SECRET`) — rejeitar com 401 se ausente ou inválido
 - Logar execução de workflows com evento `automation_executed`
- Capturar erros com evento `automation_failed`
- Incluir no metadata: `workflow_id`, `execution_id`, `workflow_name`, `duration_ms`, `result`

### 3.6 Wrapper Evolution API (`src/lib/evolution-logger.ts`)

**Responsabilidade:** Logar interações com Evolution API (WhatsApp).

**Funcionalidades:**
- Wrapper para chamadas de envio de mensagem
- Logar `whatsapp_sent` com `phone_number` (mascarado), `message_id`
- Logar `whatsapp_failed` com erro e número de destino
 - Criar endpoint `POST /webhooks/evolution` para receber eventos
 - **Autenticar** via `X-Webhook-Secret` header (env `EVOLUTION_WEBHOOK_SECRET`) — rejeitar com 401 se ausente ou inválido
 - Logar `whatsapp_webhook` para eventos recebidos

### 3.7 Endpoint de Logs Externos (`src/lib/external-logs.ts`)

**Responsabilidade:** Receber logs do **restaurante-web** e **restaurante-app**.

**Funcionalidades:**
- Criar endpoint `POST /api/logs` em restaurante-ops
- Autenticar via API key (header `X-Log-Api-Key`)
- Receber batch de logs do web e app
- Validar formato, aplicar redaction, inserir no storage
 - Rate limiting por API key (`X-Log-Api-Key`) — **não usar IP** como chave (apps Expo podem estar atrás de NAT/CDN)
- Responder com 202 Accepted

### 3.8 API de Consulta de Logs (`src/lib/logs-api.ts`)

**Responsabilidade:** Endpoints para consulta e métricas.

**Rotas protegidas (requireAuth):**

 > **Contrato `requireAuth`:** Quando `requireAuth(req, res)` retorna `null`, a resposta 302 já foi enviada internamente. O handler deve executar `if (!user) return;` imediatamente após a chamada — nunca enviar outra resposta nesse caso.
 
| Método | Path                         | Descrição                    |
|--------|------------------------------|------------------------------|
| `GET`  | `/api/logs`                  | Listar logs com filtros      |
| `GET`  | `/api/logs/trace/:requestId` | Rastrear requisição completa |
| `GET`  | `/api/logs/order/:orderId`   | Rastrear pedido completo     |
| `GET`  | `/api/logs/metrics`          | Métricas agregadas           |
| `GET`  | `/api/logs/alerts`           | Alertas configurados         |
| `POST` | `/api/logs/alerts`           | Criar alerta                 |

#### Exemplo: `GET /api/logs`

Query params:
- `service` — filtrar por serviço
- `level` — filtrar por nível
- `event` — filtrar por evento
- `from` — data inicial (ISO 8601)
- `to` — data final (ISO 8601)
- `order_id` — filtrar por pedido
- `request_id` — filtrar por request
- `limit` — número de resultados (default: 50, max: 200)
- `offset` — paginação

Resposta:
```json
{
  "total": 1234,
  "logs": [
    {
      "timestamp": "2026-04-03T10:30:00.000Z",
      "level": "info",
      "service": "web",
      "event": "order_created",
      "message": "Pedido ORD-12345 criado",
      "request_id": "550e8400-e29b-41d4-a716-446655440000",
      "order_id": "ORD-12345",
      "duration_ms": 145,
      "metadata": { "total": 89.90 }
    }
  ]
}
```

#### Exemplo: `GET /api/logs/trace/:requestId`

Resposta:
```json
{
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "timeline": [
    { "timestamp": "10:30:00.000", "service": "web", "event": "order_created", "duration_ms": 145 },
    { "timestamp": "10:30:00.150", "service": "ops", "event": "payment_success", "duration_ms": 230 },
    { "timestamp": "10:30:00.400", "service": "activepieces", "event": "automation_executed", "duration_ms": 3400 },
    { "timestamp": "10:30:03.800", "service": "evolution", "event": "whatsapp_sent" }
  ],
  "total_duration_ms": 3800
}
```

#### Exemplo: `GET /api/logs/metrics`

Resposta:
```json
{
  "period": "24h",
  "total_logs": 45678,
  "by_level": { "info": 40000, "warn": 4500, "error": 1178 },
  "by_service": { "ops": 20000, "web": 15000, "app": 5000, "supabase": 3000, "activepieces": 1500, "evolution": 1178 },
  "error_rate": 0.0258,
  "avg_duration_ms": 187,
  "p95_duration_ms": 890,
  "top_errors": [
    { "event": "payment_failed", "count": 45, "last_seen": "2026-04-03T10:30:00.000Z" },
    { "event": "db_error", "count": 23, "last_seen": "2026-04-03T10:25:00.000Z" }
  ]
}
```

### 3.9 Dashboard Web (UI de Observabilidade)

**Responsabilidade:** Interface visual para consulta de logs e métricas.

**Páginas:**

| Página                            | Conteúdo                                |
|-----------------------------------|-----------------------------------------|
| `/observability` (ou `/logs`)     | Log Viewer — tabela de logs com filtros |
| `/observability/trace/:requestId` | Timeline de uma requisição              |
| `/observability/order/:orderId`   | Timeline de um pedido                   |
| `/observability/metrics`          | Métricas agregadas (gráficos)           |
| `/observability/alerts`           | Gestão de alertas                       |

#### Log Viewer

- Tabela paginada com filtros (service, level, event, date range)
- Busca por texto livre em `message`
- Highlight em linhas de erro (level = error)
- Clique em log → expandir detalhes (metadata completo)
- Clique em `request_id` → abrir trace
- Clique em `order_id` → abrir order trace
- Exportar logs (CSV, JSON)

#### Métricas

- Cards de resumo: total logs, error rate, avg duration, p95 duration
- Gráfico de volume de logs por hora (últimas 24h)
- Gráfico de erro rate por serviço
- Gráfico de latência (avg, p95, p99)
- Top eventos de erro

#### Alertas

- Criar alertas baseados em condições:
  - `event = payment_failed` → notificar
  - `level = error` por mais de X eventos em Y minutos
  - `duration_ms > threshold`
- Canais de notificação: email, webhook (Slack, etc.)
- Tabela de alertas configurados com status (ativo, disparado)

### 3.10 Engine de Alertas (`src/lib/alerts-engine.ts`)

**Responsabilidade:** Verificar condições de alerta e notificar.

**Funcionalidades:**
- Verificar alertas configurados em intervalos regulares (ex: a cada 1 min)
- Query no storage para verificar condições
- Notificar via:
  - Email (Supabase auth users)
  - Webhook (Slack, etc.)
 - Logar disparo de alerta no próprio storage
 - **Lifecycle do intervalo:** armazenar o ID do `setInterval` e chamar `clearInterval(id)` nos handlers `process.on('SIGTERM', ...)` e `process.on('SIGINT', ...)` para evitar interval ativo após shutdown do servidor

**Tabela `ops_alerts`:**

```sql
CREATE TABLE ops_alerts (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  condition   JSONB NOT NULL,  -- { "event": "payment_failed" } ou { "level": "error", "min_count": 10, "window_minutes": 5 }
  channel     TEXT NOT NULL,   -- "email", "webhook"
  channel_config JSONB,        -- { "url": "https://hooks.slack.com/..." } ou { "user_ids": ["..."] }
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

---

## 4. Implementação no restaurante-web (Frontend)

**O restaurante-web é um projeto Expo/React Native** (não Next.js). Envia logs para o restaurante-ops.

> **Contexto existente:** `restaurante-web` já possui `src/utils/logger.ts` (Firebase Analytics) e `src/services/LoggerService.ts` (Sentry). O módulo de observabilidade **complementa** esses serviços — Sentry continua com crash reporting, ops recebe eventos de negócio e logs estruturados operacionais.

### 4.1 Módulo `src/services/ObservabilityService.ts`

> **Caminho correto:** `src/services/` (seguindo padrão existente de `LoggerService.ts`, não `src/lib/`)

```typescript
import Constants from 'expo-constants';

const OPS_ENDPOINT = Constants.expoConfig?.extra?.opsLogsEndpoint
  ?? process.env.EXPO_PUBLIC_OPS_LOGS_ENDPOINT ?? '';
const LOG_API_KEY = Constants.expoConfig?.extra?.logApiKey
  ?? process.env.EXPO_PUBLIC_LOG_API_KEY ?? '';

// Envia logs para restaurante-ops (não bloqueia, falha silenciosa)
export async function sendLogToOps(log: LogEntry): Promise<void> {
  if (!OPS_ENDPOINT || !LOG_API_KEY) return;
  try {
    await fetch(`${OPS_ENDPOINT}/api/logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Log-Api-Key': LOG_API_KEY,
      },
      body: JSON.stringify({ source: 'web', logs: [log] }),
    });
  } catch {
    // fallback silencioso — não degradar UX por falha de logging
  }
}
```

### 4.2 Captura de Erros Globais (React Native)

> **Importante:** `window.onerror` é uma API do navegador e **não existe em React Native/Expo**. Usar `ErrorUtils.setGlobalHandler` e `ErrorBoundary`.

```typescript
import { ErrorUtils } from 'react-native';

// Handler global de erros JS (não capturados)
const previousHandler = ErrorUtils.getGlobalHandler();
ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
  sendLogToOps({
    level: isFatal ? 'error' : 'warn',
    service: 'web',
    event: 'app_error',
    message: error.message,
    metadata: { fatal: isFatal, stack: error.stack?.slice(0, 500) },
  });
  previousHandler(error, isFatal); // passa para Sentry e handler anterior
});

// Promises rejeitadas não tratadas (React Native 0.71+)
if (typeof global !== 'undefined' && 'HermesInternal' in global) {
  // Hermes suporta unhandledRejection track
}
```

### 4.3 Interceptor de HTTP (Supabase Client)

Criar wrapper em volta do cliente Supabase que:
- Mede tempo de query
- Loga erros com status >= 400 (evento `api_error`)
- Inclui `request_id` do header de resposta quando disponível
- Envia log para restaurante-ops de forma assíncrona

### 4.4 Eventos de Negócio no Frontend

```typescript
// Exemplo: criação de pedido
export function logOrderCreated(orderId: string, total: number): void {
  sendLogToOps({
    level: 'info',
    service: 'web',
    event: 'order_created',
    message: `Pedido ${orderId} criado`,
    order_id: orderId,
    metadata: { total, source: 'web' },
  });
}
```

---

## 5. Implementação no restaurante-app (Mobile)

**O restaurante-app é um projeto Expo/React Native.** Envia logs para o restaurante-ops.

> **Contexto existente:** `restaurante-app` já possui `src/services/LoggerService.ts` (Sentry). O módulo de observabilidade **complementa** — não substitui — o Sentry. Sentry continua capturando crashes e stack traces; ops recebe eventos de negócio estruturados.

### 5.1 Módulo `src/services/ObservabilityService.ts`

> **Caminho correto:** `src/services/` (seguindo padrão existente de `LoggerService.ts`, não `src/lib/`)

Equivalente ao restaurante-web, adaptado para o app mobile. Usar `EXPO_PUBLIC_` prefix para variáveis públicas.

```typescript
import Constants from 'expo-constants';

const OPS_ENDPOINT = Constants.expoConfig?.extra?.opsLogsEndpoint
  ?? process.env.EXPO_PUBLIC_OPS_LOGS_ENDPOINT ?? '';
const LOG_API_KEY = Constants.expoConfig?.extra?.logApiKey
  ?? process.env.EXPO_PUBLIC_LOG_API_KEY ?? '';
```

### 5.2 Captura de Erros Globais (React Native)

```typescript
import { ErrorUtils } from 'react-native';

// Mesmo padrão do restaurante-web — usar ErrorUtils, não console.error override
const previousHandler = ErrorUtils.getGlobalHandler();
ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
  sendLogToOps({
    level: isFatal ? 'error' : 'warn',
    service: 'app',
    event: 'app_error',
    message: error.message,
    metadata: { fatal: isFatal, stack: error.stack?.slice(0, 500) },
  });
  previousHandler(error, isFatal);
});
```

> **Não substituir `console.error`** — causa ruído excessivo em warnings de bibliotecas. Usar `ErrorUtils.setGlobalHandler` ou `ErrorBoundary`.

### 5.3 Interceptor de HTTP

- Interceptor no cliente Supabase (mesmo padrão do web)
- Mede tempo de resposta
- Loga erros com status >= 400
- Envia log para restaurante-ops de forma assíncrona (não bloqueia)

---

## 6. Configuração

### 6.1 Variáveis de Ambiente (restaurante-ops `.env`)

```bash
# ==========================================
# Logging
# ==========================================
LOG_LEVEL=info
LOG_SLOW_QUERIES=true
SLOW_QUERY_THRESHOLD_MS=500

# API Key para recebimento de logs externos
OPS_LOG_API_KEY=sk-ops-log-key-aqui

# Alertas
ALERT_CHECK_INTERVAL_MS=60000
ALERT_WEBHOOK_TIMEOUT_MS=5000

# Retenção de logs (dias) - job de limpeza
LOG_RETENTION_DAYS=30

# ==========================================
# Storage isolado de observabilidade
# ==========================================
# Projeto Supabase dedicado para logs/alertas
OBS_SUPABASE_URL=https://<observability-project>.supabase.co
OBS_SUPABASE_SERVICE_ROLE_KEY=<service_role_observability>

# Fila e flush
LOG_INGEST_BUFFER_MAX=10000
LOG_INGEST_BATCH_SIZE=500
LOG_INGEST_FLUSH_INTERVAL_MS=1500

# Backpressure (proteger latencia do ops)
LOG_BACKPRESSURE_DROP_INFO=true
LOG_BACKPRESSURE_DROP_WARN=false

# SLO operacional
LOG_INGEST_TARGET_P95_MS=3000
```

### 6.2 Variáveis de Ambiente (restaurante-web `.env`)

> **Nota:** `restaurante-web` é um projeto **Expo**, não Next.js. Variáveis públicas usam prefixo `EXPO_PUBLIC_`.

```bash
# Endpoint do restaurante-ops (público — exposto ao bundle)
EXPO_PUBLIC_OPS_LOGS_ENDPOINT=https://ops.restaurante-web.app.br
EXPO_PUBLIC_LOG_API_KEY=sk-ops-log-key-aqui
```

### 6.3 Variáveis de Ambiente (restaurante-app `.env`)

> **Nota:** `restaurante-app` é um projeto **Expo**. Mesmo prefixo `EXPO_PUBLIC_`.

```bash
# Endpoint do restaurante-ops (público — exposto ao bundle)
EXPO_PUBLIC_OPS_LOGS_ENDPOINT=https://ops.restaurante-web.app.br
EXPO_PUBLIC_LOG_API_KEY=sk-ops-log-key-aqui
```

> **Segurança:** `OPS_LOG_API_KEY` exposta no cliente é intencional e de baixo risco (escrita de logs apenas). Não concede leitura nem acesso ao dashboard. Rate limiting no endpoint `/api/logs` mitiga abuso.

> **Boas práticas para produção:** preferir emissão de token de ingestão de curta duração (mintado no ops após autenticação) em vez de chave estática no cliente.

---

## 7. Segurança e Privacidade

### 7.1 Dados Sensíveis — NUNCA Logar

| Tipo | Exemplo | Ação |
|---|---|---|
| Senhas | `password`, `senha` | Redigir automaticamente |
| Tokens | JWT, API keys, Bearer | Redigir automaticamente |
| Cartões | Número de cartão, CVV | Redigir automaticamente |
| PII | CPF, telefone completo | Mascarar (ex: `***9999`) |
| Cookies | Session cookies | Redigir automaticamente |

### 7.2 Implementação de Redaction

O logger deve ter redação automática para chaves que contenham:
`token`, `secret`, `password`, `cookie`, `authorization`, `api_key`, `apikey`, `service_role`, `card`, `cvv`, `pix_qr`, `cpf`, `phone`

Emails devem ser mascarados: `j***@example.com`

### 7.3 Acesso aos Logs

- Apenas usuários autenticados com role `admin` ou `gerente` podem consultar logs via dashboard
- **INSERT direto no Supabase é proibido** — todo log externo entra via endpoint `POST /api/logs` no ops (com API key e rate limiting)
- O endpoint ops usa `service_role` key (somente servidor) para inserir em `ops_logs`
- RLS no Supabase garante isolamento: SELECT restrito a `service_role` ou `auth.role() = 'authenticated'` com validação adicional por role de ops

> **Correção de segurança nas políticas RLS:** As políticas `WITH CHECK (true)` e `USING (true)` da seção 3.1 são **excessivamente permissivas**. A política correta de INSERT deve ser restrita a `service_role` apenas (nenhum cliente anônimo ou usuário autenticado comum deve inserir diretamente). Ver SQL corrigido:

```sql
-- INSERT: apenas service_role (endpoints do restaurante-ops)
CREATE POLICY "ops_service_role_insert_logs" ON ops_logs
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- SELECT: apenas usuários autenticados (visualização via dashboard ops)
CREATE POLICY "ops_authenticated_read_logs" ON ops_logs
  FOR SELECT
  USING (auth.role() IN ('service_role', 'authenticated'));
```

---

## 8. Performance e Escalabilidade

### 8.1 Inserção Assíncrona

- Inserção de logs é **assíncrona** (não bloqueia requisição)
 - Usar fila em memória com drainer assíncrono: flush ao atingir **50 itens** OU a cada **2 segundos** (o que ocorrer primeiro)
 - `setImmediate()` para defer de flush imediato sem bloquear a resposta HTTP corrente
 - Batch de 50 logs por INSERT para reduzir queries

Parâmetros recomendados para produção (ponto de partida):

- `LOG_INGEST_BATCH_SIZE=500`
- `LOG_INGEST_FLUSH_INTERVAL_MS=1500`
- `LOG_INGEST_BUFFER_MAX=10000`
- Backpressure: ao atingir 80% do buffer, reduzir prioridade de `info`; ao atingir 95%, aceitar apenas `error` e `warn` críticos.

### 8.2 Retenção e Limpeza

 - Job agendado para deletar logs antigos conforme `LOG_RETENTION_DAYS`
 - **Deletar em batches** para evitar transações longas: `DELETE FROM ops_logs WHERE id IN (SELECT id FROM ops_logs WHERE timestamp < $cutoff LIMIT 1000)` — repetir até retornar 0 linhas
 - Rodar diariamente às 3h (ou configurar via cron no Railway)
- Alternativa: partitionamento por mês na tabela `ops_logs`

### 8.3 Impacto Mínimo

- Overhead target: < 10ms por requisição
- Inserção de log não deve bloquear response
- Se storage falhar, fallback para stdout

SLOs mínimos de ingestão:

- p95 ingest-to-persist <= 3s
- Taxa de perda aceitável: 0% para `error`, < 1% para `info` sob degradação controlada
- Disponibilidade do endpoint `/api/logs`: >= 99.9%

### 8.4 Topologia Recomendada (Isolamento)

- Banco transacional (`restaurante-web`/`restaurante-app`): somente dados de negócio.
- Banco observabilidade (`restaurante-ops`): somente `ops_logs`, `ops_alerts`, `ops_alert_firings`.
- Queries de dashboard e alertas executam apenas no banco observability.
- Export diário para camada cold (object storage) para auditoria e LGPD.

### 8.5 Particionamento e Índices

- Particionar `ops_logs` por faixa de data (mensal ou semanal, conforme volume).
- Manter índices apenas nas partições hot; reduzir índices em warm para diminuir custo de escrita.
- Rotina de manutenção: reindex e vacuum por janela fora de pico.

SQL de referência (particionamento mensal):

```sql
CREATE TABLE ops_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY,
  timestamp TIMESTAMPTZ NOT NULL,
  level TEXT NOT NULL,
  service TEXT NOT NULL,
  event TEXT NOT NULL,
  message TEXT NOT NULL,
  request_id UUID,
  user_id TEXT,
  order_id TEXT,
  duration_ms INTEGER,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, timestamp)
) PARTITION BY RANGE (timestamp);
```

### 8.6 Migração Sem Downtime (Banco Compartilhado -> Isolado)

1. Provisionar banco observability e aplicar migrations das tabelas `ops_*`.
2. Habilitar dual-write no `restaurante-ops` por feature flag (`OBS_DUAL_WRITE=true`).
3. Validar consistência por amostragem (`count`, `error_rate`, `traceRequest`) entre origem e destino.
4. Mudar leitura do dashboard para banco observability (`OBS_READ_FROM_ISOLATED=true`).
5. Desligar escrita no banco antigo (`OBS_DUAL_WRITE=false`) e manter fallback por 7 dias.
6. Remover tabelas antigas apenas após janela de estabilidade e evidência operacional.

---

## 9. Estrutura de Arquivos Proposta

```
restaurante-ops/src/
├── lib/
 │   ├── logger.ts                 # Logger central (refatorar: ts→timestamp, durationMs→duration_ms, integrar storage)
│   ├── log-storage.ts            # Storage de logs (novo — Supabase ops_logs)
│   ├── request-tracker.ts        # Middleware de request tracking (novo)
│   ├── supabase-logger.ts        # Wrapper de logging para Supabase (novo)
│   ├── evolution-logger.ts       # Logging + webhook Evolution API (novo)
│   ├── activepieces-logger.ts    # Logging + webhook Activepieces (novo)
│   ├── external-logs.ts          # Endpoint POST /api/logs para web+app (novo)
│   ├── logs-api.ts               # API de consulta de logs + métricas (novo)
│   ├── alerts-engine.ts          # Engine de alertas (novo)
│   ├── alert-scheduler.ts        # Agendamento de verificação (novo)
│   ├── redis.ts                  # Cliente Redis (existente)
│   └── rate-limiter.ts           # Rate limiter distribuído (existente)
├── config/
│   └── env.ts                    # Env vars (existente — adicionar LOG_LEVEL, OPS_LOG_API_KEY)
├── auth/
│   ├── supabase.ts               # Cliente Supabase service-role (existente)
│   ├── session.ts                # Cookies httpOnly (existente)
│   └── middleware.ts             # requireAuth() (existente)
├── modules/
│   ├── billing-operations.ts     # Billing (existente)
│   ├── billing-plan-config-operations.ts  # Config plano (existente)
│   ├── data.ts                   # KPIs, empresas, invoices (existente)
│   ├── ops-security.ts           # Gestão MFA (existente)
│   ├── service-status.ts         # Health check (existente)
│   └── supabase-metrics.ts       # Métricas banco (existente)
├── views/
│   ├── dashboard.ts              # Dashboard existente (manter)
│   └── observability.ts          # Dashboard de observabilidade (novo)
└── index.ts                      # Entry point — integrar novos módulos
│
# restaurante-web (Expo/React Native — NÃO Next.js)
restaurante-web/src/
└── services/
    └── ObservabilityService.ts   # (novo — seguir padrão LoggerService.ts existente)
        # Complementa: src/utils/logger.ts (Firebase Analytics) e
        #              src/services/LoggerService.ts (Sentry)
│
# restaurante-app (Expo/React Native)
restaurante-app/src/
└── services/
    └── ObservabilityService.ts   # (novo — seguir padrão LoggerService.ts existente)
        # Complementa: src/services/LoggerService.ts (Sentry)
│
docs/
└── observability/
  ├── OBSERVABILITY-IMPLEMENTATION-GUIDE.md  # Este documento
  ├── OBSERVABILITY-IMPLEMENTATION-PROMPT.md # Prompt de implementação assistida
  ├── OBSERVABILITY-ISOLATED-CUTOVER-RUNBOOK.md # Runbook de migração sem downtime
  └── observability_partitioned_schema.sql # SQL de referência (partições + RLS)
```

## 10. Capacidade Inicial (Sizing)

Premissas iniciais para dimensionamento:

- Volume base: 30-80 logs/segundo em horário comercial.
- Pico: 150-250 logs/segundo em incidentes ou campanhas.
- Tamanho médio do log: 0.8-1.5 KB após serialização.

Estimativa diária:

- 100 logs/segundo médios ~= 8.64M logs/dia.
- Em 1 KB médio ~= 8.6 GB/dia bruto (sem compressão).
- Com retenção hot de 15 dias: ~129 GB bruto.

Decisões práticas:

- Manter hot curto e exportar warm/cold diariamente.
- Evitar índices desnecessários em `metadata` no hot path.
- Materializar métricas agregadas (hora/serviço/nível) para dashboard rápido.

---

## 11. Instruções de Uso

### 11.1 Backend (restaurante-ops — interno)

```typescript
import { logInfo, logError, logWarn } from './lib/logger.js';

// Log de criação de pedido
logInfo('order_created', {
  request_id: req.requestId,
  user_id: user.id,
  order_id: order.id,
  duration_ms: 145,
  metadata: { total: 89.90, items_count: 3, payment_method: 'pix' }
});

// Log de erro de pagamento
logError('payment_failed', {
  request_id: req.requestId,
  order_id: order.id,
  error: 'Gateway timeout',
  metadata: { provider: 'mercadopago', retry_count: 2 }
});

// Log de query lenta
logWarn('slow_query', {
  request_id: req.requestId,
  duration_ms: 1200,
  metadata: { table: 'orders', operation: 'SELECT', threshold_ms: 500 }
});
```

### 11.2 Consulta de Logs (via API)

```bash
# Listar logs de erro nas últimas 24h
curl -b ops_session=... \
  'https://ops.restaurante-web.app.br/api/logs?level=error&from=2026-04-02T10:00:00Z&limit=50'

# Rastrear requisição completa
curl -b ops_session=... \
  'https://ops.restaurante-web.app.br/api/logs/trace/550e8400-e29b-41d4-a716-446655440000'

# Rastrear pedido completo
curl -b ops_session=... \
  'https://ops.restaurante-web.app.br/api/logs/order/ORD-12345'

# Métricas agregadas
curl -b ops_session=... \
  'https://ops.restaurante-web.app.br/api/logs/metrics'
```

### 11.3 Frontend/App (restaurante-web e restaurante-app — Expo/React Native)

```typescript
// Importar do serviço correto (src/services/ObservabilityService.ts)
import { sendLogToOps, logOrderCreated, logApiError } from '../services/ObservabilityService';

// Evento de negócio
logOrderCreated(order.id, order.total);

// Erro de API
logApiError('/api/orders', {
  status: 500,
  duration_ms: 2300,
  request_id: responseHeaders['x-request-id'],
});
```

### 11.4 Mobile (restaurante-app)

```typescript
import { sendLogToOps, logAppEvent } from '../services/ObservabilityService';

// Evento de negócio
logAppEvent('order_placed', {
  order_id: order.id,
  user_id: user.id,
  total: 89.90,
});
```

### 11.5 Activepieces (via Webhook)

O Activepieces deve enviar webhook para `POST https://ops.restaurante-web.app.br/webhooks/activepieces`:

```json
{
  "workflow_id": "WF-001",
  "execution_id": "EXE-123",
  "workflow_name": "Pedido → WhatsApp",
  "status": "success",
  "duration_ms": 3400,
  "result": { "messages_sent": 1 }
}
```

### 11.6 Evolution API (via Webhook)

A Evolution API deve enviar webhook para `POST https://ops.restaurante-web.app.br/webhooks/evolution`:

```json
{
  "event": "messages.upsert",
  "instance": "restaurante-01",
  "data": {
    "key": { "remoteJid": "5511999999999@s.whatsapp.net" },
    "message": { "conversation": "Olá" }
  }
}
```

---

## 12. Exemplos de Logs Gerados

### order_created (origem: web)

```json
{
  "timestamp": "2026-04-03T10:30:00.000Z",
  "level": "info",
  "service": "web",
  "event": "order_created",
  "message": "Pedido ORD-12345 criado",
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "USR-789",
  "order_id": "ORD-12345",
  "metadata": {
    "total": 89.90,
    "items_count": 3,
    "payment_method": "pix",
    "source": "web"
  }
}
```

### payment_failed (origem: ops)

```json
{
  "timestamp": "2026-04-03T10:31:00.000Z",
  "level": "error",
  "service": "ops",
  "event": "payment_failed",
  "message": "Falha no pagamento do pedido ORD-12345",
  "request_id": "550e8400-e29b-41d4-a716-446655440001",
  "user_id": "USR-789",
  "order_id": "ORD-12345",
  "error": "Gateway timeout após 30s",
  "metadata": {
    "provider": "mercadopago",
    "retry_count": 2,
    "amount": 89.90
  }
}
```

### automation_executed (origem: activepieces)

```json
{
  "timestamp": "2026-04-03T10:32:00.000Z",
  "level": "info",
  "service": "activepieces",
  "event": "automation_executed",
  "message": "Workflow 'Pedido → WhatsApp' executado com sucesso",
  "request_id": "550e8400-e29b-41d4-a716-446655440002",
  "metadata": {
    "workflow_id": "WF-001",
    "execution_id": "EXE-123",
    "workflow_name": "Pedido → WhatsApp",
    "duration_ms": 3400,
    "result": { "messages_sent": 1 }
  }
}
```

### whatsapp_sent (origem: evolution)

```json
{
  "timestamp": "2026-04-03T10:33:00.000Z",
  "level": "info",
  "service": "evolution",
  "event": "whatsapp_sent",
  "message": "Mensagem enviada para +5511***9999",
  "request_id": "550e8400-e29b-41d4-a716-446655440003",
  "metadata": {
    "phone_number": "+5511***9999",
    "message_id": "MSG-456",
    "instance": "restaurante-01",
    "message_type": "text"
  }
}
```

### slow_query (origem: supabase)

```json
{
  "timestamp": "2026-04-03T10:34:00.000Z",
  "level": "warn",
  "service": "supabase",
  "event": "slow_query",
  "message": "Query lenta detectada: 1200ms em orders",
  "request_id": "550e8400-e29b-41d4-a716-446655440004",
  "duration_ms": 1200,
  "metadata": {
    "table": "orders",
    "operation": "SELECT",
    "threshold_ms": 500
  }
}
```

### app_error (origem: web ou app — React Native)

```json
{
  "timestamp": "2026-04-03T10:35:00.000Z",
  "level": "error",
  "service": "web",
  "event": "app_error",
  "message": "TypeError: Cannot read property 'map' of undefined",
  "metadata": {
    "fatal": false,
    "stack": "TypeError: Cannot read property 'map' of undefined\n  at OrderList (src/screens/OrderList.tsx:42:15)"
  }
}
```

> **Nota:** `restaurante-web` e `restaurante-app` são projetos **Expo/React Native** — o stack trace não contém URLs de Next.js (`_next/static`). O evento é `app_error` (capturado via `ErrorUtils.setGlobalHandler`), não `frontend_error` (API do browser).

### http_request (origem: ops — middleware)

```json
{
  "timestamp": "2026-04-03T10:30:00.000Z",
  "level": "info",
  "service": "ops",
  "event": "http_request",
  "message": "POST /api/orders 201 — 145ms",
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "USR-789",
  "duration_ms": 145,
  "metadata": {
    "method": "POST",
    "path": "/api/orders",
    "status": 201,
    "ip": "192.168.1.***"
  }
}
```

---

## 13. Checklist de Implementação

### restaurante-ops (Centro de Observabilidade)

- [ ] Provisionar projeto Supabase dedicado de observabilidade (isolado do banco transacional)
- [ ] Criar tabela `ops_logs` e `ops_alerts` no banco de observabilidade (SQL migration)
- [ ] Criar `src/lib/log-storage.ts` — Storage de logs no Supabase
- [ ] Refatorar `src/lib/logger.ts` — Novo formato + integração com storage
- [ ] Criar `src/lib/request-tracker.ts` — Middleware de request tracking
- [ ] Criar `src/lib/supabase-logger.ts` — Wrapper para queries Supabase
- [ ] Criar `src/lib/evolution-logger.ts` — Logging de WhatsApp + endpoint webhook
- [ ] Criar `src/lib/activepieces-logger.ts` — Logging de automações + endpoint webhook
- [~] Endpoint externo implementado no `src/index.ts` (`POST /api/logs`) com `X-Log-Api-Key`, rate limit por API key e validação de batch
- [~] API de consulta implementada no `src/index.ts` (`GET /api/logs`, `/api/logs/metrics`, `/api/logs/trace/:requestId`, `/api/logs/order/:orderId`)
- [ ] Criar `src/lib/alerts-engine.ts` — Engine de alertas
- [ ] Criar `src/lib/alert-scheduler.ts` — Agendamento de verificação
- [ ] Criar `src/views/observability.ts` — Dashboard web (Log Viewer + Métricas)
- [ ] Atualizar `src/config/env.ts` — Adicionar variáveis de logging
- [ ] Atualizar `src/index.ts` — Integrar middlewares, rotas de webhook e dashboard
- [ ] Atualizar `.env.example` — Documentar novas variáveis
- [ ] Criar job de limpeza de logs antigos (cron ou agendador)
- [ ] Executar rollout sem downtime (dual-write -> read switch -> disable old write)

### restaurante-web (Expo/React Native — não Next.js)

- [ ] Criar `src/services/ObservabilityService.ts` — seguir padrão de `LoggerService.ts`
- [ ] Configurar `ErrorUtils.setGlobalHandler` (React Native) — **não usar `window.onerror`**
- [ ] Adicionar wrapper no cliente Supabase para medir tempo de queries e logar erros
- [ ] Configurar variáveis de ambiente com prefixo `EXPO_PUBLIC_` (não `NEXT_PUBLIC_`)
- [ ] Integrar com `LoggerService.ts` existente (Sentry permanece para crash reporting)
- [ ] Adicionar logs de eventos de negócio (order_created, page_view, api_error)

### restaurante-app (Expo/React Native)

- [ ] Criar `src/services/ObservabilityService.ts` — seguir padrão de `LoggerService.ts`
- [ ] Configurar `ErrorUtils.setGlobalHandler` — **não substituir `console.error`**
- [ ] Adicionar wrapper no cliente Supabase para queries
- [ ] Configurar variáveis de ambiente com prefixo `EXPO_PUBLIC_`
- [ ] Integrar com `LoggerService.ts` existente (Sentry permanece para crash reporting)
- [ ] Adicionar logs de eventos de negócio (app_startup, order_placed, app_error)

---

## 14. Roadmap Futuro

| Fase | Objetivo |
|---|---|
| **Fase 1** (esta) | Coleta, armazenamento e consulta de logs centralizados em banco isolado |
| **Fase 2** | Dashboard web completo (gráficos, filtros avançados, export) |
| **Fase 3** | Alertas configuráveis com notificações (email, Slack webhook) |
| **Fase 4** | Métricas de negócio (funil de pedidos, conversão, ticket médio) |
| **Fase 5** | Tracing distribuído avançado (waterfall view, span nesting) |
| **Fase 6** | SLA/SLO monitoring com budget de erro |

---

## 15. Referências

- [Structured Logging Best Practices](https://www.sematext.com/blog/structured-logging/)
- [Node.js Logging Best Practices](https://nodejs.org/en/docs/guides/logging/)
- [Supabase Documentation](https://supabase.com/docs)
- [Railway Cron Jobs](https://docs.railway.app/deploy/cron-jobs)
- `database-backup/migrations/20260405184919_create_observability_isolated_partitioned_logs.sql`
- `docs/observability/OBSERVABILITY-ISOLATED-CUTOVER-RUNBOOK.md`
- `docs/observability/observability_partitioned_schema.sql`
