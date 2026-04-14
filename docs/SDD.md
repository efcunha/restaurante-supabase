# Software Design Document (SDD)

**Projeto:** restaurante-supabase  
**Versão:** 1.2  
**Data:** 2026-04-13  
**Escopo:** Todo o sistema (app + web + ops + banco)  
**Status:** Ativo — documento vivo, atualizar a cada mudança de arquitetura relevante

---

## Índice

1. [Visão Geral do Sistema](#1-visão-geral-do-sistema)
2. [Contexto e Objetivos](#2-contexto-e-objetivos)
3. [Arquitetura de Alto Nível](#3-arquitetura-de-alto-nível)
4. [Módulos do Sistema](#4-módulos-do-sistema)
   - 4.1 [restaurante-app](#41-restaurante-app)
   - 4.2 [restaurante-web](#42-restaurante-web)
   - 4.3 [restaurante-ops](#43-restaurante-ops)
   - 4.4 [Supabase (Backend)](#44-supabase-backend)
5. [Modelo de Dados](#5-modelo-de-dados)
6. [Fluxos Operacionais Críticos](#6-fluxos-operacionais-críticos)
7. [Arquitetura de Segurança](#7-arquitetura-de-segurança)
8. [Integrações Externas](#8-integrações-externas)
9. [Feature Flags e Rollout Canário](#9-feature-flags-e-rollout-canário)
10. [Infraestrutura e Deploy](#10-infraestrutura-e-deploy)
11. [Estratégia de Testes](#11-estratégia-de-testes)
12. [Decisões de Design (ADRs resumidas)](#12-decisões-de-design-adrs-resumidas)
13. [Glossário](#13-glossário)

---

## 1. Visão Geral do Sistema

O **restaurante-supabase** é uma plataforma POS/PDV (Point of Sale/Ponto de Venda) full-stack para restaurantes brasileiros. O sistema cobre todo o ciclo operacional de um restaurante moderno:

- Gestão de pedidos por canal: Balcão, Mesa, Delivery
- Fluxos de cozinha: Montagem e KDS
- Controle de caixa e pagamentos
- Gerenciamento de cardápio, estoque e fornecedores
- Reservas de mesas com notificação via WhatsApp
- Gestão de funcionários com RBAC
- Billing SaaS por assinatura (restaurante-ops)

O sistema é **multi-tenant**: cada restaurante (empresa) opera em isolamento total de dados via `company_id` + Row Level Security (RLS) no Supabase.

---

## 2. Contexto e Objetivos

### Público-alvo
- **Operadores de restaurante** (admin, gerente): gestão geral
- **Equipe de operação** (garçom, caixa, cozinheiro, montagem, entregador): execução de fluxos
- **Equipe SaaS** (ops): administração da plataforma, billing, métricas

### Objetivos arquiteturais
| Objetivo             | Como é atendido                                                  |
|----------------------|------------------------------------------------------------------|
| Multi-tenancy seguro | `company_id` obrigatório em todas as queries + RLS no banco      |
| Paridade app/web     | Módulos espelhados em `restaurante-app/` e `restaurante-web/`    |
| Rollout seguro       | Feature flags canário (Phase 12)                                 |
| Billing confiável    | `restaurante-ops` com reconciliação atômica e idempotência       |
| Observabilidade      | Sentry, log storage interno, métricas SaaS                       |
| Conformidade LGPD    | Minimização de dados, retenção definida, acesso restrito por RLS |

---

## 3. Arquitetura de Alto Nível

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENTES                                │
│                                                                 │
│  ┌──────────────────────┐    ┌───────────────────────┐          │
│  │   restaurante-app    │    │   restaurante-web     │          │
│  │  React Native 0.84   │    │  Expo Web 0.84        │          │
│  │  Expo SDK 54         │    │  Browser (SPA)        │          │
│  │  iOS + Android       │    │  + E2E Playwright     │          │
│  └──────────┬───────────┘    └──────────┬────────────┘          │
└─────────────┼───────────────────────────┼───────────────────────┘
              │  HTTPS / Supabase SDK     │  HTTPS / Supabase SDK
              ▼                           ▼
┌────────────────────────────────────────────────────────────────────┐
│                      BACKEND: SUPABASE                             │
│                                                                    │
│  ┌──────────────┐  ┌───────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ PostgreSQL   │  │ Auth      │  │ Realtime │  │ Edge Functions│  │
│  │ (RLS, RPC)   │  │ (JWT)     │  │          │  │ (Delivery)    │  │
│  └──────────────┘  └───────────┘  └──────────┘  └───────────────┘  │
└────────────────────────────────────────────────────────────────────┘
              │
              │  Webhooks / REST
              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   SERVIÇOS EXTERNOS                                 │
│                                                                     │
│  ┌──────────────┐  ┌─────────────┐  ┌───────────────┐  ┌──────────┐ │
│  │ Activepieces │  │ Hyperswitch │  │ balanca-bridge│  │ Evolution│ │
│  │ (automações) │  │ (TEF / POS) │  │ (USB / serial)│  │ API      │ │
│  └──────────────┘  └─────────────┘  └───────────────┘  └──────────┘ │
└─────────────────────────────────────────────────────────────────────┘
              │
              │  Admin / Billing / Ops
              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   restaurante-ops                                   │
│                   Node.js (ESM, TypeScript)                         │
│                   Deploy: Railway                                   │
│   - Auth (sessão httpOnly cookie)                                   │
│   - Dashboard SaaS (métricas, revenue, KPIs)                        │
│   - Billing CRUD (assinaturas, invoices, planos)                    │
│   - Reconciliação atômica de pagamentos                             │
│   - Rate limiting (Redis, fail-closed)                              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. Módulos do Sistema

### 4.1 restaurante-app

**Tipo:** Aplicativo mobile (React Native + Expo)  
**Plataformas:** iOS, Android  
**Versões:** React Native 0.84.0 / Expo SDK 54 / TypeScript strict

#### Estrutura de pastas
```
restaurante-app/src/
├── assets/           # Ícones e imagens estáticas
├── auth/             # Lógica de autenticação (roles.js, guards)
├── components/       # Componentes de UI compartilhados
├── config/
│   ├── SupabaseConfig.ts    # Inicialização do cliente Supabase
│   └── featureFlags.ts      # Feature flags canário (Phase 12)
├── context/          # Contextos React (AuthContext, etc.)
├── design-system/    # Tokens de design (tokens.ts)
├── features/         # Blocos de feature (components + types locais)
├── hooks/            # Custom hooks (useComandaManagement, etc.)
├── i18n/             # Internacionalização
├── layouts/          # ScreenScaffold e layouts base
├── navigation/       # Configuração de navegação (React Navigation)
├── screens/          # Telas por domínio funcional
├── services/         # Acesso a dados e lógica de negócio
├── theme/            # Paleta de cores (colors.ts)
├── types/            # Tipos e interfaces globais
├── ui/               # Componentes de design system exportados (index.ts)
└── utils/            # Funções utilitárias
```

#### Telas principais
| Tela                                            | Domínio       | Roles permitidas       |
|-------------------------------------------------|---------------|------------------------|
| `LoginScreen`                                   | Auth          | Todos                  |
| `NovoPedidoScreen`                              | Pedidos       | garçom, admin, gerente |
| `MapaMesasScreen`                               | Mesa          | garçom, admin, gerente |
| `ComandaGerenciamentoScreen`                    | Comanda       | garçom, admin, gerente |
| `CozinhaScreen`                                 | Cozinha/KDS   | cozinheiro, admin      |
| `MontagemScreen`                                | Montagem      | montagem, admin        |
| `RotasDeliveryScreen`                           | Delivery      | entregador, admin      |
| `PagamentoScreen`                               | Pagamento     | caixa, garçom, admin   |
| `CaixaAberturaScreen` / `CaixaFechamentoScreen` | Caixa         | caixa, admin           |
| `GerenciarCardapioScreen`                       | Cardápio      | admin, gerente         |
| `AdminScreen`                                   | Administração | admin                  |
| `BillingScreen`                                 | Licença       | admin                  |
| `EstoqueScreen`                                 | Estoque       | admin, gerente         |

#### Padrões de desenvolvimento
- **Serviços em `src/services/`**: todo acesso ao Supabase fica em services, nunca direto em componentes/telas.
- **Hooks customizados**: encapsular lógica de estado em `useXxx` (ex.: `useComandaManagement`, `useOrderService`).
- **Design system**: importar componentes e tokens exclusivamente via `src/ui/index.ts` e `src/design-system/tokens.ts`.
- **ScreenScaffold**: toda tela nova deve usar `src/layouts/ScreenScaffold.tsx` como base.
- **Biometria e armazenamento seguro**: tokens JWT em `expo-secure-store` (nunca em `AsyncStorage`).

#### Estado atual de PDV no app (2026-04-08)
- O app mobile **não expõe TEF integrado** na UX atual.
- `PaymentMode` no app permanece restrito a `'normal' | 'external_pos'`.
- O fluxo de pagamento presencial no app, nesta fase, privilegia registro manual auditável de maquininha externa.

---

### 4.2 restaurante-web

**Tipo:** Aplicação web (Expo Web / React)  
**Versões:** React Native 0.84.0 / Expo SDK 54 / TypeScript strict  
**URL de produção:** `https://restaurante-web.app.br` (Railway)

A estrutura de `restaurante-web/src/` é **espelhada** à de `restaurante-app/src/`. Todas as telas e serviços que operam em ambos os clientes devem ser mantidos em paridade — qualquer correção ou melhoria em um módulo espelhado deve ser replicada para o outro.

**Exceções de espelhamento:**
- APIs nativas de dispositivo (câmera, impressora ESC/POS, biometria) existem apenas no app.
- Testes E2E são exclusivos de cada cliente: **Playwright** para web, **Maestro** para o app nativo.

**Testes E2E (Playwright):** `restaurante-web/e2e/`
```
balcao.spec.ts
delivery.spec.ts
mesa.spec.ts
mesa-consolidacao.spec.ts
mesa-concorrencia-garcons.spec.ts
pizza.spec.ts
admin-gerenciar-cardapio.spec.ts
pdv-maquininha-aprovado.spec.ts
pdv-scale-regression.spec.ts
pdv-device-payment-polling.spec.ts
```

#### Estado atual de PDV no web (2026-04-13)
- O web mantém `PaymentMode = 'normal' | 'tef' | 'external_pos'`.
- O domínio técnico de PDV foi isolado em `restaurante-web/src/features/pdv/`.
- O fluxo web já possui iniciação + polling para maquininha e leitura via bridge para balança, ambos atrás de feature flags.
- O fluxo de self-service por balança foi implementado de forma aditiva (sem quebra do legado), controlado por `EXPO_PUBLIC_FEATURE_PDV_SELF_SERVICE_SCALE`.
- O backend já suporta binding de dispositivos por terminal (`pos_device_bindings`) para TEF, balança e impressora.
- Existe uma área de simuladores locais em `restaurante-web/src/features/dev-simulators/` para QA local, treinamento e validação visual, sem valor de prova para integração real.
- A homologação atual é guiada por `docs/maquininha/06-matriz-homologacao-tef-balanca.md`.
- Para o fluxo self-service por balança, os artefatos de referência estão em `docs/TEF-Balança/` (blueprint, validação PR1 e smoke PR3).

---

### 4.3 restaurante-ops

**Tipo:** Serviço HTTP Node.js (ESM, TypeScript strict)  
**Deploy:** Railway (`restaurante-ops` service)  
**URL de produção:** `https://ops.restaurante-web.app.br`  
**Autenticação:** Sessão com httpOnly cookie (não JWT no cliente)

Este é o **módulo mais crítico** do repositório. Concentra billing, reconciliação financeira e autenticação SaaS. Toda proposta de mudança neste módulo requer atenção redobrada a segurança, idempotência e auditabilidade.

#### Estrutura de pastas
```
restaurante-ops/src/
├── auth/
│   ├── middleware.ts      # Guard requireAuth
│   ├── session.ts         # Cookie httpOnly helpers
│   └── supabase.ts        # Login/logout ops
├── config/
│   └── env.ts             # buildEnv() — valida vars obrigatórias na startup
├── lib/
│   ├── httpServer.ts      # Servidor HTTP base
│   ├── logger.ts          # Logger estruturado (sem PII)
│   ├── rate-limiter.ts    # Redis-first, fail-closed
│   ├── redis.ts           # Conexão Redis
│   └── log-storage.ts     # Storage de observabilidade
├── modules/
│   ├── billing-operations.ts          # Operações de billing (core)
│   ├── billing-plan-config-operations.ts
│   ├── data.ts            # Queries de métricas/KPIs
│   ├── ops-security.ts    # MFA, settings de segurança
│   ├── service-status.ts  # Health checks
│   └── supabase-metrics.ts
├── views/
│   └── dashboard.ts       # HTML renderizado server-side
└── index.ts               # Entry point, roteamento HTTP
```

#### Endpoints principais (API-CONTRACTS.md)
| Método | Path                                       | Função                               |
|--------|--------------------------------------------|--------------------------------------|
| `POST` | `/auth/login`                              | Login com senha (rate-limited)       |
| `POST` | `/auth/logout`                             | Logout + clear cookie                |
| `GET`  | `/ops/billing/company/:id`                 | Snapshot de billing da empresa       |
| `GET`  | `/ops/billing/company/:id/audit`           | Trilha de auditoria de billing       |
| `GET`  | `/ops/billing/summary`                     | Visão agregada (pendências, risco)   |
| `POST` | `/ops/billing/company/:id/regularize/card` | Regularização por cartão             |
| `POST` | `/ops/billing/company/:id/regularize/pix`  | Regularização por Pix                |
| `POST` | `/ops/billing/reconcile`                   | Reconciliação de evento de pagamento |
| `GET`  | `/ops/logs/query`                          | Consulta de logs operacionais        |
| `GET`  | `/health`                                  | Health check público                 |

#### Invariantes de billing
- `reconcile_billing_event_atomic` é o **único caminho de escrita** para invoice/subscription/webhook/audit.
- Toda operação de reconciliação é idempotente por `idempotency_key`.
- Invoice `paid/cancelled` não pode ser reaplicada em `paymentStatus='paid'`.
- Assinatura `cancelled` não é reativada automaticamente por evento `paid`.

#### Rate limiting
- Redis-first com `fail-closed` (`RATE_LIMIT_FALLBACK_ENABLED=false`).
- HTTP 429 com headers `Retry-After` na resposta.
- HTTP 503 quando Redis está indisponível (strict mode).

---

### 4.4 Supabase (Backend)

**Projeto Supabase:** PostgreSQL 15+ gerenciado  
**Funcionalidades usadas:** PostgreSQL, Auth (JWT), Realtime, Edge Functions, RLS  
**Cliente:** `@supabase/supabase-js` v2  
**Configuração:** `src/config/SupabaseConfig.ts` (app + web)

#### Principais tabelas
| Tabela               | Descrição                                      |
|----------------------|------------------------------------------------|
| `profiles`           | Perfis de usuários com role e company_id       |
| `companies`          | Dados de empresas/restaurantes                 |
| `orders`             | Pedidos (particionados por mês)                |
| `comandas`           | Agrupadores de pedido (mesa, balcão, delivery) |
| `products`           | Cardápio de produtos                           |
| `product_adicionais` | Adicionais e complementos de produtos          |
| `pagamentos`         | Registro de pagamentos realizados              |
| `caixa_sessions`     | Sessões de abertura/fechamento de caixa        |
| `subscriptions`      | Assinaturas SaaS por empresa                   |
| `invoices`           | Faturas de cobrança                            |
| `payment_methods`    | Métodos de pagamento cadastrados               |
| `payment_gateway_configs` | Configuração do gateway presencial por empresa |
| `payment_transactions` | Transações presenciais (TEF/maquininha) com idempotência |
| `pos_device_bindings` | Binding de hardware por terminal (TEF, balança, impressora) |
| `webhook_events`     | Log de eventos de webhook (idempotência)       |
| `billing_audit_log`  | Trilha de auditoria de billing                 |
| `clientes_delivery`  | Dados de clientes de delivery                  |
| `mesa_reservas`      | Reservas de mesas                              |
| `inventory_items`    | Itens de estoque                               |
| `funcionarios`       | Cadastro de funcionários                       |

#### Funções/RPCs críticas
| Função | Propósito |
|---|---|
| `adicionar_consumo_atomico(company_id, date_key, comanda_number, valor)` | Atualiza saldo da comanda de forma atômica |
| `get_next_delivery_comanda_number(company_id, env)`                      | Gera número sequencial de comanda de delivery |
| `reconcile_billing_event_atomic(...)`                                    | Reconcilia evento de billing com idempotência e auditoria |
| `can_manage_company_profiles(target_company_id)`                         | Verifica permissão de gestão de perfis |
| `can_self_update_profile(...)`                                           | Valida se usuário pode atualizar o próprio perfil |
| `cleanup_old_partitions(retention_months, archive_mode)`                 | Arquiva partições antigas de orders |

#### Índices críticos
- `idx_unique_open_mesa`: garante uma única comanda aberta por mesa/dia por empresa.

#### Edge Functions
- **Delivery**: processamento de notificações e webhooks de entrega com CORS endurecido (allowlist explícita por origem, sem wildcard).

#### RLS — Política geral
- Toda tabela de dados de tenant tem RLS habilitado.
- Filtro por `company_id` obrigatório em todas as policies.
- `public.profiles`: acesso restrito (self + admin/gerente da mesma empresa). Sem `SELECT USING (true)`.
- Roles canônicas: `admin`, `gerente`, `garcom`, `cozinheiro`, `montagem`, `entregador`, `caixa`.

---

## 5. Modelo de Dados

### Entidades principais e relacionamentos

```
companies (1)
    │
    ├── profiles (N)         ← usuários com role
    ├── products (N)          ← cardápio
    │       └── product_adicionais (N)   ← complementos
    ├── inventory_items (N)   ← estoque
    ├── funcionarios (N)
    ├── mesa_reservas (N)
    ├── caixa_sessions (N)
    ├── comandas (N)
    │       └── orders (N)   ← particionado por mês
    │               └── order_items (N)
    ├── pagamentos (N)
    ├── clientes_delivery (N)
    └── subscriptions (1)
            └── invoices (N)
                    └── payment_methods (N)
                    └── webhook_events (N)
                    └── billing_audit_log (N)
```

### Chave de isolamento multi-tenant

Todas as queries de dados operacionais devem incluir:
```typescript
.eq('company_id', companyId)
```
O RLS no banco é uma segunda camada — o filtro explícito no cliente é defesa em profundidade.

### Chave lógica de comanda
Cancelamento e reconciliação de comanda propagam pela chave lógica:
```
company_id + date_key + comanda_number
```

### Particionamento de orders
A tabela `orders` é particionada por mês (`orders_YYYY_MM`). Partições antigas são arquivadas via `cleanup_old_partitions(retention_months)`.

---

## 6. Fluxos Operacionais Críticos

### 6.1 Fluxo Balcão

```
Garçom abre NovoPedidoScreen
    → seleciona produtos + adicionais
    → cria order (OrderService.createOrder)
    → adicionar_consumo_atomico atualiza comanda
    → kitchen realtime recebe via Supabase Realtime
    → CozinhaScreen exibe item
    → item marcado pronto → PagamentoScreen
    → pagamento registrado em pagamentos
    → comanda fechada (open_balance = 0)
```

### 6.2 Fluxo Mesa

```
Garçom acessa MapaMesasScreen
    → seleciona mesa livre
    → abre comanda (idx_unique_open_mesa garante unicidade)
    → NovoPedidoScreen (modo mesa)
    → mesma cadeia: order → Realtime → Cozinha → Pagamento
    → CaixaFechamentoScreen reconcilia sessão
```

**Invariante:** `idx_unique_open_mesa` impede duas comandas abertas para a mesma mesa no mesmo dia.

### 6.3 Fluxo Delivery

```
Pedido de delivery criado (canal externo ou garçom)
    → status: pending → preparing → ready
    → entregador designado em RotasDeliveryScreen
    → status: dispatched → delivered
    → webhook Activepieces (step: code_delivery_payment)
        → insere em pagamentos
        → fecha comanda
```

**Regra crítica:** Conclusão de delivery (`delivered`) deve reconciliar:
1. Inserção em `pagamentos`
2. Fechamento da comanda (`comanda_status = 'entregue'`)

Não apenas atualizar `order.status`.

### 6.4 Fluxo Montagem

```
Orders criadas → MontagemScreen via Realtime
    → item separado/montado → markItemMontado
    → MontagemSyncService sincroniza status offline
    → PedidosProntosScreen exibe itens prontos para entrega
```

### 6.5 Fluxo de Caixa

```
CaixaAberturaScreen → registra sessão (caixa_sessions)
    → operações financeiras do dia
    → CaixaFechamentoScreen → registra fechamento com totais
    → CashFlowScreen / FinancialDashboardScreen → relatórios
```

### 6.6 Fluxo de Pagamento

```
PagamentoScreen recebe comanda
    → calcula open_balance
    → seleciona modo de pagamento
        → normal
        → external_pos
        → tef (apenas no web)
    → normal/external_pos: registra em pagamentos
    → tef: inicia /payments/initiate → polling/status → resultado final
    → se open_balance = 0 e sem pendência TEF → fecha comanda
    → emite comprovante quando aplicável (PrinterService → ESC/POS)
```

**Estado atual de produto:**
- Web mantém TEF integrado e maquininha externa.
- App mobile mantém apenas pagamento normal e maquininha externa.
- Validação de TEF e balança está em fase de homologação controlada, com matriz dedicada em `docs/maquininha/06-matriz-homologacao-tef-balanca.md`.

---

## 7. Arquitetura de Segurança

### 7.1 Autenticação

- **Supabase Auth (JWT)**: login com email+senha.
- **App mobile**: tokens armazenados em `expo-secure-store` (criptografado pelo SO).
- **restaurante-ops**: sessão server-side com httpOnly cookie (nunca expõe JWT ao browser).
- `onAuthStateChange`: refresh automático de tokens na expiração.

### 7.2 Autorização (RBAC)

| Role         | Acesso principal                |
|--------------|---------------------------------|
| `admin`      | Tudo                            |
| `gerente`    | Operação + config               |
| `garcom`     | Pedidos, comandas, pagamentos   |
| `cozinheiro` | KDS, fila de preparo            |
| `montagem`   | Tela de montagem                |
| `entregador` | Rotas, status de delivery       |
| `caixa`      | Abertura/fechamento, pagamentos |

Verificações de role no frontend são **apenas UX**. A autorização real fica no RLS.

### 7.3 Row Level Security (RLS)

- Todas as tabelas de dados de tenant têm RLS ativo.
- `profiles`: restrito a self + admin/gerente da mesma empresa.
- `handle_new_user`: normaliza aliases legados para roles canônicas na criação de perfil.
- Migrations de segurança devem validar `pg_policies` no banco remoto após aplicação.

### 7.4 CORS

- Edge Functions: allowlist de origens por request, sem fallback wildcard.
- `restaurante-ops`: configuração explícita por rota.

### 7.5 Rate Limiting (restaurante-ops)

- Backend: Redis-first limiter.
- Modo: `fail-closed` (`RATE_LIMIT_FALLBACK_ENABLED=false`).
- HTTP 429 com headers `Retry-After` no estouro.
- HTTP 503 quando Redis indisponível.
- Validado em produção para `/auth/login`.

### 7.6 Gestão de Segredos

- Segredos nunca em código-fonte.
- Variáveis `EXPO_PUBLIC_*`: apenas para o cliente (anon key, URL pública do Supabase).
- `service_role_key` e secrets de servidor: apenas em variáveis sem prefixo `EXPO_PUBLIC_`, em Railway ou `database-backup/.env.local` (gitignored).
- Template público: `database-backup/.env.example`.

### 7.7 LGPD

- Minimização: coleta apenas dados necessários para a operação.
- PII não logado em texto claro (Sentry ou console).
- Acesso a PII restrito por RLS + role.
- Referência completa: `docs/LGPD/LGPD-COMPLIANCE-GUIDE.md`.

### 7.8 Vulnerabilidades bloqueantes (impedem merge)

| ID     | Vulnerabilidade                                     |
|--------|-----------------------------------------------------|
| SEC-01 | Segredo hardcoded em código-fonte                   |
| SEC-02 | Bypass de RLS (query sem `company_id`)              |
| SEC-03 | Token JWT em AsyncStorage sem criptografia          |
| SEC-04 | CORS wildcard em endpoint autenticado               |
| SEC-05 | Input não validado em operação financeira           |
| SEC-06 | PII em log/Sentry sem mascaramento                  |
| SEC-07 | Credencial em variável `EXPO_PUBLIC_*` server-only  |
| SEC-08 | Flag de QA (`billing_forceBlock`) ativa em produção |

---

## 8. Integrações Externas

### 8.1 Activepieces (Automação / Pagamento Delivery)

- **Propósito:** Automação do fluxo de pagamento de delivery e notificações.
- **Projeto:** `aqW21pXGsiXLhvorLCeIo`
- **Flow de pedidos:** `jtW3UuIn24Wg415GQ0sHW`
- **Step crítico:** `code_delivery_payment`
- **Trigger:** webhook com `order_type=delivery` e `status_novo=delivered`.
- **Ação:** insere registro em `pagamentos` no Supabase e fecha comanda.
- **Credenciais:** nunca hardcoded no `sourceCode.code`; configuradas nos inputs do step.

**Diagnóstico rápido (webhook 200 mas sem insert):**
1. Confirmar payload (`order_type=delivery`, `status_novo=delivered`).
2. Inspecionar output do step (`missing_supabase_credentials`).
3. Revisar inputs (`company_id`, `total_amount`, `comanda_number`, `payment_method`).
4. Verificar se o flow está `ENABLED` e publicado.

### 8.2 MercadoPago

- **Propósito:** Processador de pagamentos do domínio de billing/regularização SaaS (cartão e Pix).
- **Integração:** via `restaurante-ops` (server-side).
- **Webhook:** validado por assinatura HMAC; secret em variável de ambiente.
- **Status:** billing não live em produção (2026-04-05).

### 8.3 Hyperswitch / TEF presencial

- **Propósito:** Camada de orquestração da integração de maquininha presencial no PDV web.
- **Escopo atual:** `restaurante-web` + `restaurante-ops`, conforme `docs/maquininha/README.md`.
- **Status:** integração em validação controlada; frontend web já possui domínio técnico de PDV e matriz de homologação dedicada.
- **Endpoints principais no fluxo atual:** `/payments/initiate` e `/payments/:id/status` expostos por `restaurante-ops`.

### 8.4 balanca-bridge

- **Propósito:** Processo local para leitura de balança USB/serial e exposição de API HTTP simples ao `restaurante-web`.
- **Contrato atual no frontend:** `GET /peso/estavel` consumido por `scaleBridgeService.ts`.
- **Status:** integração em fase inicial de validação controlada; sem staging dedicado.

### 8.5 Evolution API (WhatsApp)

- **Propósito:** Notificações de reservas e status de delivery via WhatsApp.
- **Serviço:** `src/services/EvolutionApiService.ts` (app + web).
- **Credenciais:** variável de ambiente, nunca hardcoded.
- **Fallback:** se API indisponível, operação continua sem notificação (degradação graciosa).

### 8.6 iFood (Marketplaces)

- **Propósito:** canal externo para ingestão e sincronização de pedidos delivery.
- **Status atual:** não implementado; permanece em roadmap.
- **Diretriz arquitetural:** integração via `restaurante-ops` (webhook inbound + orquestração segura) e persistência no Supabase com RLS por `company_id`.
- **Documentação técnica detalhada:** `docs/ifood/README.md`.
- **Escopo do estudo:** arquitetura, contratos API, mapeamento de dados, segurança/LGPD, runbook operacional, rollout e backlog.

---

## 9. Feature Flags e Rollout Canário

### Arquivo de configuração
`restaurante-app/src/config/featureFlags.ts` (espelhado em `restaurante-web/`)

### Flags de UI — Phase 12 (Canary Rollout)

| Flag                                                | Wave           | Telas afetadas                     |
|-----------------------------------------------------|----------------|------------------------------------|
| `EXPO_PUBLIC_FEATURE_LOGIN_UI_NEXT`                 | 1 — Auth       | LoginScreen, RegisterCompanyScreen |
| `EXPO_PUBLIC_FEATURE_REGISTER_COMPANY_UI_NEXT`      | 1 — Auth       | RegisterCompanyScreen              |
| `EXPO_PUBLIC_FEATURE_NOVO_PEDIDO_UI_NEXT`           | 2 — Ordering   | NovoPedidoScreen                   |
| `EXPO_PUBLIC_FEATURE_DELIVERY_UI_NEXT`              | 2 — Ordering   | RotasDeliveryScreen                |
| `EXPO_PUBLIC_FEATURE_PAGAMENTO_UI_NEXT`             | 3 — Settlement | PagamentoScreen                    |
| `EXPO_PUBLIC_FEATURE_COMANDA_GERENCIAMENTO_UI_NEXT` | 3 — Settlement | ComandaGerenciamentoScreen         |
| `EXPO_PUBLIC_FEATURE_ADMIN_UI_NEXT`                 | 4 — Admin      | AdminScreen (maior risco)          |

### Flags de Billing

| Flag                                      | Valor padrão | Propósito                                   |
|-------------------------------------------|--------------|---------------------------------------------|
| `EXPO_PUBLIC_FEATURE_BILLING`             | `false`      | Master toggle de billing + LicenseGate      |
| `EXPO_PUBLIC_FEATURE_BILLING_FORCE_BLOCK` | `false`      | QA only — simula bloqueio sem alterar banco |

> **Status:** `billing_enabled=false` em produção. Pré-requisito para ativar: `LicenseGate` deve envolver `NovoPedidoScreen`, `ComandaGerenciamentoScreen` e `RotasDeliveryScreen`.

### Flags de PDV

| Flag                                      | Valor padrão | Propósito |
|-------------------------------------------|--------------|-----------|
| `EXPO_PUBLIC_FEATURE_PDV_ENABLED`         | `false`      | Master toggle do módulo PDV no web |
| `EXPO_PUBLIC_FEATURE_PDV_DEVICE_PAYMENT`  | `false`      | Habilita fluxo de maquininha / TEF no web |
| `EXPO_PUBLIC_FEATURE_PDV_EXTERNAL_POS`    | `false`      | Habilita maquininha externa auditável |
| `EXPO_PUBLIC_FEATURE_PDV_SCALE`           | `false`      | Habilita leitura por bridge de balança |
| `EXPO_PUBLIC_FEATURE_PDV_SELF_SERVICE_SCALE` | `false`   | Habilita semântica isolada de self-service por peso |

> **Status atual:** em produção, o web já recebeu envs de PDV para validação controlada e canário de self-service por peso; o app mobile permanece sem TEF integrado na UX.

### Rollback total
```bash
npm run phase12:legacy -- --env <env_real_em_uso>
```

### Princípio
Feature flags controlam **visibilidade de UI apenas**. Nunca controlam acesso a dados — esse controle é sempre via RLS.

---

## 10. Infraestrutura e Deploy

### 10.1 Ambientes

| Ambiente | Status     | Notas                                                  |
|----------|------------|--------------------------------------------------------|
| Produção | Ativo      | Único ambiente; staging não existe                     |
| Staging  | Não existe | Validações sensíveis usam smoke controlado em produção |

> **Política:** Para mudanças sensíveis (auth, RLS, billing, CORS, rate limiting), usar rollout guardado com smoke test e evidências no mesmo ciclo de trabalho.

### 10.2 Railway

- **restaurante-web**: deploy automático via `railway up` / push para `main`.
- **restaurante-ops**: deploy manual via:
  ```bash
  railway up --service restaurante-ops --path-as-root ./restaurante-ops
  ```
- **Configuração:** `restaurante-web/railway.json` e `restaurante-ops/railway.json`.

### 10.3 Expo Application Services (EAS)

- **Configuração:** `restaurante-app/eas.json`.
- **Plataformas:** Android (APK/AAB) e iOS (IPA).
- **Profiles:** `preview` (testes internos), `production` (loja).
- **Scripts de deploy:**
  ```bash
  npm run deploy:eas             # Ambas as plataformas
  npm run deploy:eas:android     # Apenas Android
  npm run deploy:eas:ios         # Apenas iOS
  ```

### 10.4 Supabase CLI

- Instalado via Scoop: `C:\Users\ECUNHA\scoop\shims\supabase.exe`
- **NÃO** instalar via `npm install -g supabase`.
- Migrations em: `database-backup/migrations/`
- Verificação de drift: `database-backup/check-migration-sync.sh`

Migrations recentes relevantes (2026-04-13):
- `20260413120000_add_unit_and_weight_fields_to_products.sql`
- `20260413120000_fix_cardapio_pesavel_categories.sql`
- `20260413194500_add_self_service_scale_flow_columns.sql`
- `20260413233000_create_pos_device_bindings.sql`

### 10.5 Variáveis de ambiente críticas

| Variável                        | Módulo    | Visibilidade                      |
|---------------------------------|-----------|-----------------------------------|
| `EXPO_PUBLIC_SUPABASE_URL`      | app / web | Pública (bundle)                  |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | app / web | Pública (bundle)                  |
| `SUPABASE_SERVICE_ROLE_KEY`     | ops       | Server-only                       |
| `SUPABASE_URL`                  | ops       | Server-only                       |
| `REDIS_URL`                     | ops       | Server-only                       |
| `OPS_ALLOWED_COMPANY_ID`        | ops       | Server-only                       |
| `RATE_LIMIT_FALLBACK_ENABLED`   | ops       | Server-only (`false` em produção) |
| `MERCADOPAGO_ACCESS_TOKEN`      | ops       | Server-only                       |
| `EVOLUTION_API_KEY`             | integrações server-side | Server-only              |

---

## 11. Estratégia de Testes

### 11.1 Testes E2E — Playwright (restaurante-web)

| Spec                                | Fluxo coberto                      |
|-------------------------------------|------------------------------------|
| `balcao.spec.ts`                    | Pedido Balcão completo             |
| `mesa.spec.ts`                      | Pedido Mesa completo               |
| `mesa-consolidacao.spec.ts`         | Consolidação de pedidos de mesa    |
| `mesa-concorrencia-garcons.spec.ts` | Concorrência de múltiplos garçons  |
| `delivery.spec.ts`                  | Pedido Delivery completo           |
| `pizza.spec.ts`                     | Fluxo pizza (adicionais, montagem) |
| `admin-gerenciar-cardapio.spec.ts`  | Gestão de cardápio                 |
| `pdv-maquininha-aprovado.spec.ts`   | Fluxo PDV web com initiate + polling mockado |
| `pdv-scale-regression.spec.ts`      | Regressão de leitura de balança no PDV web |
| `pdv-device-payment-polling.spec.ts`| Máquina de estados do polling de maquininha |

Execução dos fluxos críticos:
```bash
cd restaurante-web
npx playwright test e2e/balcao.spec.ts e2e/mesa.spec.ts e2e/pizza.spec.ts e2e/delivery.spec.ts --workers=1
```

### 11.2 Testes E2E — Maestro (restaurante-app)

Flows em `restaurante-app/.maestro/`:

| Flow                   | Fluxo coberto            |
|------------------------|--------------------------|
| `balcao.yaml`          | Pedido Balcão (garçom 1) |
| `balcao_garcom02.yaml` | Pedido Balcão (garçom 2) |
| `mesa.yaml`            | Pedido Mesa              |
| `pizza.yaml`           | Fluxo pizza              |

Subflows reutilizáveis em `_subflows/` (ex.: `login.yaml`).

Execução básica:
```bash
maestro test restaurante-app/.maestro/balcao.yaml --udid emulator-5554 \
  -e PLAYWRIGHT_TEST_EMAIL=<email> -e PLAYWRIGHT_TEST_PASSWORD=<senha>
```

### 11.3 Testes unitários e de integração — Jest (restaurante-app)

```bash
npm test                          # Todos os testes
npm run test:supabase             # Testes de integração Supabase
npm run test:performance          # Testes de performance
npm run test:coverage             # Cobertura
```

### 11.4 Política de testes

- Toda feature nova deve ter ao menos um teste unitário (lógica isolada) ou E2E (fluxo crítico).
- Fluxos críticos (Balcão, Mesa, Delivery, Montagem, Billing) exigem cobertura E2E antes de merge.
- Fluxos de PDV web (TEF e balança) devem seguir a matriz de homologação em `docs/maquininha/06-matriz-homologacao-tef-balanca.md`, distinguindo `SIM_LOCAL`, `MOCK_AUTO` e `INT_REAL`.
- Smoke tests obrigatórios para mudanças em: auth, RLS, billing, CORS, rate limiting — executados na mesma sessão de trabalho.
- Nunca remover ou comentar testes existentes sem justificativa explícita.

### 11.5 Auditoria de segurança de dependências

```bash
npm audit --audit-level=high
npx expo-doctor
```

---

## 12. Decisões de Design (ADRs resumidas)

### ADR-001: Multi-tenancy via company_id + RLS
**Contexto:** Sistema precisa isolar dados de múltiplos restaurantes.  
**Decisão:** Filtro explícito por `company_id` em todas as queries no cliente + RLS no PostgreSQL como segunda linha de defesa.  
**Consequência:** Toda nova tabela de dados de tenant requer migration com RLS + policies.

### ADR-002: Módulos espelhados app/web
**Contexto:** App mobile e web servem os mesmos fluxos operacionais.  
**Decisão:** Manter estrutura de pastas e serviços espelhados. Alterações em módulo comum devem ser aplicadas nos dois clientes simultaneamente.  
**Consequência:** Refactors one-sided são proibidos em módulos espelhados.

### ADR-003: Feature flags como única rota de rollout
**Contexto:** Sem ambiente de staging, rollout em produção é o único caminho.  
**Decisão:** Feature flags por wave (Phase 12) com rollback via script CLI.  
**Consequência:** Flags nunca controlam acesso a dados, apenas visibilidade de UI.

### ADR-004: restaurante-ops como serviço separado
**Contexto:** Billing e operações SaaS têm surface de ataque diferente dos clientes.  
**Decisão:** Serviço Node.js independente com autenticação por cookie httpOnly, rate limiting Redis-first e deploy separado no Railway.  
**Consequência:** Maior complexidade operacional, mas isolamento de segurança para o módulo mais crítico.

### ADR-005: Supabase CLI via Scoop (não npm global)
**Contexto:** `npm install -g supabase` não é suportado pelo Supabase no ambiente atual.  
**Decisão:** Instalação via Scoop em `C:\Users\ECUNHA\scoop\shims\supabase.exe`.  
**Consequência:** Scripts de migration devem referenciar o caminho completo quando o PATH não resolve.

### ADR-006: Migrations em database-backup/migrations/ como fonte de verdade
**Contexto:** Banco remoto pode divergir de dump local.  
**Decisão:** `database-backup/migrations/` é a fonte de verdade de migrations commitadas. Drift verificado com `check-migration-sync.sh`.  
**Consequência:** SQL manual aplicado em emergência deve ser imediatamente reconciliado em arquivo de migration.

### ADR-007: Armazenamento de tokens com expo-secure-store
**Contexto:** `AsyncStorage` não é criptografado; tokens JWT são dados sensíveis.  
**Decisão:** Todos os tokens de sessão do app mobile armazenados em `expo-secure-store`.  
**Consequência:** Dependência adicional nativa; não aplicável ao web (web usa sessionStorage ou cookie httpOnly).

### ADR-008: TEF permanece no web, não no app mobile
**Contexto:** O desktop/web é a superfície principal para integração TEF nesta fase; o app mobile prioriza operação simplificada e maquininha externa auditável.  
**Decisão:** Manter `PaymentMode = 'normal' | 'tef' | 'external_pos'` no web e restringir o app a `PaymentMode = 'normal' | 'external_pos'`.  
**Consequência:** Reduz complexidade operacional no mobile e concentra a homologação de TEF no `restaurante-web`.

---

## 13. Glossário

| Termo                              | Definição                                                                               |
|------------------------------------|-----------------------------------------------------------------------------------------|
| **Comanda**                        | Agrupador lógico de pedidos (por mesa, balcão ou delivery).                             |
|                                    | Tem `company_id`, `date_key` e `comanda_number` como chave lógica.                      |
| **Balcão**                         | Canal de pedido para consumo imediato no balcão.                                        |
| **Mesa**                           | Canal de pedido para consumo em mesa do restaurante.                                    |
| **Delivery**                       | Canal de pedido para entrega a domicílio.                                               |
| **Montagem**                       | Etapa de separação e preparo físico dos itens de um pedido.                             |
| **KDS**                            | Kitchen Display System — tela da cozinha para gestão da fila de preparo.                |
| **Caixa**                          | Sessão de abertura e fechamento financeiro diário do restaurante.                       |
| **RLS**                            | Row Level Security — mecanismo do PostgreSQL para isolamento de dados por linha.        |
| **RBAC**                           | Role-Based Access Control — controle de acesso por papel de usuário.                    |
| **company_id**                     | UUID da empresa/restaurante; chave de isolamento multi-tenant em todas as tabelas.      |
| **date_key**                       | Chave de data no formato `YYYY-MM-DD`; usada para delimitar comandas por dia.           |
| **Phase 12**                       | Nome interno do rollout canário de UI com feature flags por wave.                       |
| **Wave**                           | Grupo de features de UI promovidas juntas no rollout Phase 12.                          |
| **LicenseGate**                    | Componente que bloqueia acesso a telas operacionais quando a licença SaaS está inativa. |
| **TEF**                            | Transferência Eletrônica de Fundos; no projeto, fluxo de maquininha integrada no PDV web. |
| **External POS**                   | Pagamento realizado fora do TEF integrado, com registro manual auditável no sistema.      |
| **Hyperswitch**                    | Camada de orquestração do fluxo de pagamento presencial/TEF documentado para o PDV web.   |
| **balanca-bridge**                 | Processo local que expõe leitura da balança USB/serial via API HTTP para o frontend web.  |
| **idempotency_key**                | Chave única por operação de billing para evitar duplicidade em reconciliações.          |
| **reconcile_billing_event_atomic** | Função PostgreSQL que é o único ponto de escrita de eventos de billing.                 |
| **Activepieces**                   | Plataforma de automação usada no fluxo de pagamento de delivery.                        |
| **Evolution API**                  | API de WhatsApp usada para notificações de reservas e delivery.                         |
| **EAS**                            | Expo Application Services — plataforma de build e distribuição de apps Expo.            |
| **ESC/POS**                        | Protocolo de impressora térmica usado em `PrinterService`.                              |
| **PII**                            | Personally Identifiable Information — dados pessoais identificáveis (LGPD).             |
| **fail-closed**                    | Estratégia em que a falha do componente de controle (ex.: Redis)                        |
|                                    | bloqueia a operação, em vez de permitir por padrão.                                     |

---

*Documento atualizado em 2026-04-13. Atualizar este SDD sempre que houver mudança relevante de arquitetura, introdução de novo módulo, novo fluxo crítico ou decisão de design significativa.*
