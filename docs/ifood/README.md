# Integracao iFood - Estudo Tecnico

**Status:** Planejado (nao implementado)
**Data base:** 2026-04-09
**Escopo:** restaurante-web + restaurante-ops + Supabase

## Objetivo

Consolidar o estudo tecnico da integracao com iFood com foco em:

- estado atual do sistema
- arquitetura alvo (to-be)
- requisitos de seguranca e LGPD
- contratos tecnicos
- backlog detalhado para implementacao

## Estado atual (as-is)

Hoje o repositorio **nao possui integracao iFood implementada**. O que existe:

- roadmap comercial no FAQ do site
- fluxo de delivery manual no restaurante-web
- automacoes via Activepieces para eventos de status/pagamento delivery
- notificacoes via Evolution API

Referencias do estado atual:

- [SDD - Integracoes Externas](../SDD.md#8-integrações-externas)
- [API Contracts do restaurante-ops](../../restaurante-ops/docs/API-CONTRACTS.md)
- [FAQ com mencao a iFood](../../restaurante-site/src/components/FAQ.tsx)

## Artefatos desta pasta

1. [ARQUITETURA.md](./ARQUITETURA.md)
2. [CONTRATOS-API.md](./CONTRATOS-API.md)
3. [MAPEAMENTO-DADOS.md](./MAPEAMENTO-DADOS.md)
4. [SEGURANCA-LGPD.md](./SEGURANCA-LGPD.md)
5. [OPERACAO-RUNBOOK.md](./OPERACAO-RUNBOOK.md)
6. [PLANO-ROLLOUT.md](./PLANO-ROLLOUT.md)
7. [BACKLOG-IMPLEMENTACAO.md](./BACKLOG-IMPLEMENTACAO.md)
8. [CADASTRO-E-CREDENCIAIS-API.md](./CADASTRO-E-CREDENCIAIS-API.md)
9. [referencias/order-status-mapping.md](./referencias/order-status-mapping.md)
10. [referencias/webhook-payload-exemplo.md](./referencias/webhook-payload-exemplo.md)
11. [PROMPT-IMPLEMENTACAO-IFOOD.md](./PROMPT-IMPLEMENTACAO-IFOOD.md)

## Resultado esperado da fase de implementacao

- receber pedidos do iFood por webhook assinado
- criar/atualizar pedidos internos com isolamento por `company_id`
- manter idempotencia de eventos
- sincronizar status operacional sem regressao em Balcao/Mesa/Delivery/Montagem
- preservar trilha de auditoria para billing e operacao

## Fora do escopo deste pacote

- codificacao da integracao
- migrations aplicadas em producao
- deploy em producao
- homologacao com credenciais reais iFood

## Decisoes tecnicas desta documentacao

- abordagem conservadora: integrar pelo `restaurante-ops` como ponto de entrada HTTP
- restaurante-web e Supabase como fonte principal de catalogo; iFood como canal externo
- persistencia no Supabase com foco em multi-tenant e RLS
- rollout por feature flag com canario e rollback explicito
- observabilidade obrigatoria desde a fase 1 (logs estruturados + alertas)
