# 04 - Plano de execucao, testes e rollout

## 1. Roadmap por fases

### Fase 0 - Preparacao tecnica

- Validar dependencias de arquitetura (ops, gateway, banco).
- Confirmar politicas de seguranca e segredos.
- Definir feature flags de controle.

### Fase 1 - Fundacao backend

- Criar endpoints e contratos no restaurante-ops.
- Implementar mapeamento de status canonicos.
- Implementar idempotencia de webhook.

### Fase 2 - Integracao frontend

- Integrar fluxo da UI de pagamento no restaurante-web.
- Exibir estados de processamento e falha.
- Registrar telemetria operacional.

### Fase 3 - Validacao controlada

- Executar testes E2E em fluxo critico.
- Executar smoke test de seguranca e observabilidade.
- Revisar criterios de go/no-go para producao.

### Fase 4 - Rollout progressivo

- Wave 1: sandbox interno.
- Wave 2: grupo reduzido de restaurantes.
- Wave 3: disponibilidade geral monitorada.

## 2. Feature flags recomendadas

- FEATURE_PAYMENT_GATEWAY
- FEATURE_CARD_MACHINE
- FEATURE_PAYMENT_GATEWAY_SANDBOX

Regras:

- Flags com default seguro (desligado em producao).
- Mudanca de flag deve ser auditavel.
- Rollback deve ser imediato por toggle.

## 3. Plano de testes tecnicos

## 3.1 Unitarios (backend)

Cobrir:

- Mapeamento de estados externos para internos.
- Regras de transicao de estado.
- Validacao de payload de iniciacao.
- Deduplicacao de webhook por event_id.

## 3.2 Integracao (backend + gateway mock)

Cobrir:

- Criacao de pagamento com config valida.
- Falha por gateway nao configurado.
- Falha por indisponibilidade de provider.
- Reprocessamento idempotente de webhook.

## 3.3 E2E (fluxo critico)

Cenarios minimos:

1. Pagamento aprovado com fechamento correto de fluxo.
2. Pagamento recusado com mensagem operacional.
3. Timeout com reconsulta de status.
4. Retry manual apos falha sem duplicidade de sucesso.

## 3.4 Smoke tests de seguranca

- Validar ausencia de segredo no cliente.
- Validar bloqueio de acesso cross-company.
- Validar headers e CORS em endpoint sensivel.
- Validar que logs nao exibem PII/segredos.

## 4. Criterios de pronto (DoD tecnico)

- Contratos estabilizados e documentados.
- Telemetria e alertas ativos.
- Testes criticos aprovados.
- Rollback testado por feature flag.
- Evidencias de validacao registradas no ciclo.

## 5. Go/No-Go para producao

Go quando:

- Taxa de sucesso dentro da meta.
- Erro 5xx dentro do limite.
- Sem regressao em fluxos criticos de pagamento.

No-Go quando:

- Divergencia de reconciliacao sem mitigacao.
- Falhas de seguranca em checklist obrigatorio.
- Instabilidade recorrente de webhook sem fallback.

## 6. Plano de rollback

1. Desativar FEATURE_CARD_MACHINE.
2. Manter metodos legados de pagamento ativos.
3. Preservar trilha de auditoria das tentativas.
4. Abrir incidente com causa raiz e plano corretivo.

## 7. Evidencias minimas por release

- Lista de testes executados e resultado.
- Evidencia de logs/metricas do periodo de validacao.
- Registro de flags e janela de ativacao.
- Relatorio de incidente (se houver) com acao corretiva.
