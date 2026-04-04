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
| `frontend_error`      | web          | Erro JavaScript no frontend          |
| `api_error`           | web / app    | Erro em chamada API                  |
| `app_startup`         | app          | Inicialização do app                 |
| `page_view`           | web          | Navegação de página                  |
| `http_request`        | ops          | Toda requisição HTTP (para métricas) |

---

## 3. Componentes a Implementar no restaurante-ops

### 3.1 Storage de Logs (`src/lib/log-storage.ts`)

**Responsabilidade:** Persistir e consultar logs localmente.

**Opções de storage (escolher a mais adequada):**

| Opção | Prós | Contras |
|---|---|---|
| **SQLite** | Zero configuração, arquivo único, queries SQL | Escrita sequencial, pode ser gargalo |
| **JSONL (arquivo)** | Simples, stream-friendly, sem overhead | Sem índices, queries lentas |
| **PostgreSQL** (mesmo Supabase) | Queries poderosas, índices, já disponível | Depende de conexão externa |

**Recomendação:** Usar o mesmo **Supabase** (PostgreSQL) já disponível no projeto, com tabela `ops_logs`.

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

-- Índices para consulta rápida
CREATE INDEX idx_ops_logs_timestamp ON ops_logs (timestamp DESC);
CREATE INDEX idx_ops_logs_service ON ops_logs (service);
CREATE INDEX idx_ops_logs_event ON ops_logs (event);
CREATE INDEX idx_ops_logs_level ON ops_logs (level);
CREATE INDEX idx_ops_logs_request_id ON ops_logs (request_id);
CREATE INDEX idx_ops_logs_order_id ON ops_logs (order_id);

-- RLS: apenas authenticated users podem ler
ALTER TABLE ops_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ops_users_read_logs" ON ops_logs
  FOR SELECT USING (true);

CREATE POLICY "ops_users_insert_logs" ON ops_logs
  FOR INSERT WITH CHECK (true);
```

**Funcionalidades do storage:**

- `insertLog(log: LogEntry): Promise<void>`
- `queryLogs(filter: LogFilter): Promise<LogEntry[]>`
  - Filtros por: `service`, `level`, `event`, `dateRange`, `request_id`, `order_id`, `user_id`
  - Paginação: `limit`, `offset`
  - Ordenação: `timestamp DESC`
- `getMetrics(): Promise<LogMetrics>` — contagens por serviço, nível, evento
- `traceRequest(requestId: string): Promise<LogEntry[]>` — rastrear fluxo completo

### 3.2 Logger Central (`src/lib/logger.ts` — refatorado)

**Responsabilidade:** Interface única de logging para todo o ecossistema.

**Funcionalidades:**
- Manter redaction existente (senhas, tokens, etc.)
- Adaptar para novo formato de log
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
- Gerar `request_id` único (UUID v4) por requisição
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
- Logar `whatsapp_webhook` para eventos recebidos

### 3.7 Endpoint de Logs Externos (`src/lib/external-logs.ts`)

**Responsabilidade:** Receber logs do **restaurante-web** e **restaurante-app**.

**Funcionalidades:**
- Criar endpoint `POST /api/logs` em restaurante-ops
- Autenticar via API key (header `X-Log-Api-Key`)
- Receber batch de logs do web e app
- Validar formato, aplicar redaction, inserir no storage
- Rate limiting por origem (web vs app)
- Responder com 202 Accepted

### 3.8 API de Consulta de Logs (`src/lib/logs-api.ts`)

**Responsabilidade:** Endpoints para consulta e métricas.

**Rotas protegidas (requireAuth):**

| Método | Path | Descrição |
|---|---|---|
| `GET` | `/api/logs` | Listar logs com filtros |
| `GET` | `/api/logs/trace/:requestId` | Rastrear requisição completa |
| `GET` | `/api/logs/order/:orderId` | Rastrear pedido completo |
| `GET` | `/api/logs/metrics` | Métricas agregadas |
| `GET` | `/api/logs/alerts` | Alertas configurados |
| `POST` | `/api/logs/alerts` | Criar alerta |

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

| Página | Conteúdo |
|---|---|
| `/observability` (ou `/logs`) | Log Viewer — tabela de logs com filtros |
| `/observability/trace/:requestId` | Timeline de uma requisição |
| `/observability/order/:orderId` | Timeline de um pedido |
| `/observability/metrics` | Métricas agregadas (gráficos) |
| `/observability/alerts` | Gestão de alertas |

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
  alert_id    BIGINT NOT NULL REFERENCES ops_alerts(id),
  fired_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  context     JSONB,
  notified    BOOLEAN NOT NULL DEFAULT false
);
```

---

## 4. Implementação no restaurante-web (Frontend)

**O web envia logs para o restaurante-ops.**

### 4.1 Módulo `src/lib/observability.ts`

```typescript
// Envia logs para restaurante-ops
async function sendLogToOps(log: LogEntry): Promise<void> {
  await fetch(`${OPS_LOGS_ENDPOINT}/api/logs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Log-Api-Key': process.env.NEXT_PUBLIC_LOG_API_KEY,
    },
    body: JSON.stringify({ source: 'web', logs: [log] }),
  });
}
```

### 4.2 Captura de Erros Globais

```typescript
// window.onerror
window.onerror = (message, source, lineno, colno, error) => {
  sendLogToOps({
    level: 'error',
    service: 'web',
    event: 'frontend_error',
    message: String(message),
    metadata: { source, line: lineno, column: colno, stack: error?.stack },
  });
};

// unhandledrejection
window.addEventListener('unhandledrejection', (event) => {
  sendLogToOps({
    level: 'error',
    service: 'web',
    event: 'unhandled_promise',
    message: 'Unhandled promise rejection',
    metadata: { reason: String(event.reason) },
  });
});
```

### 4.3 Interceptor de API

Criar wrapper para `fetch()` que:
- Mede tempo de resposta
- Loga erros com status >= 400 (evento `api_error`)
- Inclui `request_id` se presente nos headers de resposta
- Envia log para restaurante-ops

### 4.4 Eventos de Negócio no Frontend

```typescript
// Exemplo: criação de pedido
function logOrderCreated(orderId: string, total: number) {
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

**O app envia logs para o restaurante-ops.**

### 5.1 Módulo `src/lib/observability.ts`

Equivalente ao web, adaptado para React Native/Flutter.

### 5.2 Captura de Erros Globais

**React Native:**
```typescript
import { LogBox } from 'react-native';

const originalConsoleError = console.error;
console.error = (...args) => {
  originalConsoleError(...args);
  sendLogToOps({
    level: 'error',
    service: 'app',
    event: 'app_error',
    message: args.join(' '),
  });
};
```

### 5.3 Interceptor de HTTP

- Interceptor no cliente HTTP
- Mede tempo de resposta
- Loga erros com status >= 400
- Envia log para restaurante-ops

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
```

### 6.2 Variáveis de Ambiente (restaurante-web `.env.local`)

```bash
NEXT_PUBLIC_OPS_LOGS_ENDPOINT=https://ops.seudominio.com
NEXT_PUBLIC_LOG_API_KEY=sk-ops-log-key-aqui
```

### 6.3 Variáveis de Ambiente (restaurante-app `.env`)

```bash
OPS_LOGS_ENDPOINT=https://ops.seudominio.com
LOG_API_KEY=sk-ops-log-key-aqui
```

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

- Apenas usuários autenticados com role `admin` ou `gerente` podem consultar logs
- RLS no Supabase garante isolamento
- API key para recebimento de logs externos (web/app)

---

## 8. Performance e Escalabilidade

### 8.1 Inserção Assíncrona

- Inserção de logs é **assíncrona** (não bloqueia requisição)
- Usar `setImmediate()` ou fila em memória para batch inserts
- Batch de 50 logs por INSERT para reduzir queries

### 8.2 Retenção e Limpeza

- Job agendado para deletar logs antigos que `LOG_RETENTION_DAYS`
- Rodar diariamente às 3h (ou configurar via cron no Railway)
- Alternativa: partitionamento por mês na tabela `ops_logs`

### 8.3 Impacto Mínimo

- Overhead target: < 10ms por requisição
- Inserção de log não deve bloquear response
- Se storage falhar, fallback para stdout

---

## 9. Estrutura de Arquivos Proposta

```
restaurante-ops/src/
├── lib/
│   ├── logger.ts                 # Logger central (refatorado)
│   ├── log-storage.ts            # Storage de logs (Supabase)
│   ├── request-tracker.ts        # Middleware de request tracking
│   ├── supabase-logger.ts        # Wrapper de logging para Supabase
│   ├── evolution-logger.ts       # Logging + webhook Evolution API
│   ├── activepieces-logger.ts    # Logging + webhook Activepieces
│   ├── external-logs.ts          # Endpoint POST /api/logs (web + app)
│   ├── logs-api.ts               # API de consulta de logs + métricas
│   ├── alerts-engine.ts          # Engine de alertas
│   └── alert-scheduler.ts        # Agendamento de verificação de alertas
│
restaurante-ops/src/views/
├── observability.ts              # Template HTML do dashboard de logs
│
restaurante-web/src/
└── lib/
    └── observability.ts          # Captura erros + envio para ops
│
restaurante-app/src/
└── lib/
    └── observability.ts          # Captura erros + envio para ops
│
docs/
└── OBSERVABILITY-IMPLEMENTATION-GUIDE.md  # Este documento
```

---

## 10. Instruções de Uso

### 10.1 Backend (restaurante-ops — interno)

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

### 10.2 Consulta de Logs (via API)

```bash
# Listar logs de erro nas últimas 24h
curl -b ops_session=... \
  'https://ops.seudominio.com/api/logs?level=error&from=2026-04-02T10:00:00Z&limit=50'

# Rastrear requisição completa
curl -b ops_session=... \
  'https://ops.seudominio.com/api/logs/trace/550e8400-e29b-41d4-a716-446655440000'

# Rastrear pedido completo
curl -b ops_session=... \
  'https://ops.seudominio.com/api/logs/order/ORD-12345'

# Métricas agregadas
curl -b ops_session=... \
  'https://ops.seudominio.com/api/logs/metrics'
```

### 10.3 Frontend (restaurante-web)

```typescript
import { sendLogToOps, logOrderCreated, logApiError } from './lib/observability';

// Evento de negócio
logOrderCreated(order.id, order.total);

// Erro de API
logApiError('/api/orders', {
  status: 500,
  duration_ms: 2300,
  request_id: response.headers.get('x-request-id')
});
```

### 10.4 Mobile (restaurante-app)

```typescript
import { sendLogToOps, logAppEvent } from './lib/observability';

// Evento de negócio
logAppEvent('order_placed', {
  order_id: order.id,
  user_id: user.id,
  total: 89.90
});
```

### 10.5 Activepieces (via Webhook)

O Activepieces deve enviar webhook para `POST https://ops.seudominio.com/webhooks/activepieces`:

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

### 10.6 Evolution API (via Webhook)

A Evolution API deve enviar webhook para `POST https://ops.seudominio.com/webhooks/evolution`:

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

## 11. Exemplos de Logs Gerados

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

### frontend_error (origem: web)

```json
{
  "timestamp": "2026-04-03T10:35:00.000Z",
  "level": "error",
  "service": "web",
  "event": "frontend_error",
  "message": "TypeError: Cannot read property 'map' of undefined",
  "metadata": {
    "source": "https://app.seudominio.com/_next/static/chunks/main.js",
    "line": 42,
    "column": 15,
    "stack": "TypeError: Cannot read property 'map' of undefined\n  at OrderList (https://app.seudominio.com/_next/static/chunks/main.js:42:15)"
  }
}
```

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

## 12. Checklist de Implementação

### restaurante-ops (Centro de Observabilidade)

- [ ] Criar tabela `ops_logs` e `ops_alerts` no Supabase (SQL migration)
- [ ] Criar `src/lib/log-storage.ts` — Storage de logs no Supabase
- [ ] Refatorar `src/lib/logger.ts` — Novo formato + integração com storage
- [ ] Criar `src/lib/request-tracker.ts` — Middleware de request tracking
- [ ] Criar `src/lib/supabase-logger.ts` — Wrapper para queries Supabase
- [ ] Criar `src/lib/evolution-logger.ts` — Logging de WhatsApp + endpoint webhook
- [ ] Criar `src/lib/activepieces-logger.ts` — Logging de automações + endpoint webhook
- [ ] Criar `src/lib/external-logs.ts` — Endpoint `POST /api/logs` para web/app
- [ ] Criar `src/lib/logs-api.ts` — API de consulta de logs + métricas
- [ ] Criar `src/lib/alerts-engine.ts` — Engine de alertas
- [ ] Criar `src/lib/alert-scheduler.ts` — Agendamento de verificação
- [ ] Criar `src/views/observability.ts` — Dashboard web (Log Viewer + Métricas)
- [ ] Atualizar `src/config/env.ts` — Adicionar variáveis de logging
- [ ] Atualizar `src/index.ts` — Integrar middlewares, rotas de webhook e dashboard
- [ ] Atualizar `.env.example` — Documentar novas variáveis
- [ ] Criar job de limpeza de logs antigos (cron ou agendador)

### restaurante-web (Frontend)

- [ ] Criar `src/lib/observability.ts` — Captura de erros + envio para ops
- [ ] Adicionar `window.onerror` handler
- [ ] Adicionar interceptor para `fetch()`
- [ ] Configurar variáveis de ambiente
- [ ] Adicionar logs de eventos de negócio (order_created, page_view, api_error)

### restaurante-app (Mobile)

- [ ] Criar `src/lib/observability.ts` — Captura mobile + envio para ops
- [ ] Configurar ErrorBoundary global
- [ ] Adicionar interceptor de HTTP client
- [ ] Configurar variáveis de ambiente
- [ ] Adicionar logs de eventos de negócio (app_startup, order_placed, app_error)

---

## 13. Roadmap Futuro

| Fase | Objetivo |
|---|---|
| **Fase 1** (esta) | Coleta, armazenamento e consulta de logs centralizados |
| **Fase 2** | Dashboard web completo (gráficos, filtros avançados, export) |
| **Fase 3** | Alertas configuráveis com notificações (email, Slack webhook) |
| **Fase 4** | Métricas de negócio (funil de pedidos, conversão, ticket médio) |
| **Fase 5** | Tracing distribuído avançado (waterfall view, span nesting) |
| **Fase 6** | SLA/SLO monitoring com budget de erro |

---

## 14. Referências

- [Structured Logging Best Practices](https://www.sematext.com/blog/structured-logging/)
- [Node.js Logging Best Practices](https://nodejs.org/en/docs/guides/logging/)
- [Supabase Documentation](https://supabase.com/docs)
- [Railway Cron Jobs](https://docs.railway.app/deploy/cron-jobs)
