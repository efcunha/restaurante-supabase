# Plano de Rollout - Integracao iFood

## 1. Estrategia geral

Rollout progressivo com feature flag e observabilidade ativa desde a fase inicial.

## 2. Feature flags sugeridas

- `EXPO_PUBLIC_FEATURE_IFOOD_UI_NEXT` (web/app: visibilidade de UI)
- `IFOOD_INBOUND_ENABLED` (ops: aceita webhook inbound)
- `IFOOD_OUTBOUND_ENABLED` (ops: publica status para iFood)

## 3. Fases

## Fase 0 - Preparacao

- fechar contratos tecnicos
- provisionar credenciais sandbox
- validar ambiente e logs

## Fase 1 - Inbound controlado (P0)

- habilitar webhook para 1 empresa piloto
- criar pedidos internos por eventos iFood
- validar idempotencia e segregacao por tenant

## Fase 2 - Operacao assistida (P1)

- ampliar para pequeno grupo de empresas
- monitorar divergencias de status
- validar runbook em incidentes reais de baixa severidade

## Fase 3 - Outbound parcial (P1)

- publicar status essenciais para iFood
- medir latencia e taxa de erro
- validar consistencia de negocio

## Fase 4 - Escala (P2)

- ampliar cobertura com criterio de saude
- estabelecer SLO operacional
- formalizar handoff para operacao recorrente

## 4. Criterios de avancar fase

- erro 5xx abaixo do limite acordado
- sem incidente de tenant mixing
- sem incidentes de PII em log
- taxa de sucesso de processamento acima do alvo

## 5. Rollback

- desabilitar flags de inbound/outbound
- manter endpoint em modo de aceite sem processamento
- comunicar operacao e registrar janela de rollback

## 6. Criterios de go-live

- checklist de seguranca concluido
- runbook testado
- backlog P0 concluido
- aprovacao de produto + operacao + seguranca
