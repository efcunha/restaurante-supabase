# 08 - Runbook de ativacao TEF em producao (hoje)

Data: 2026-04-10
Objetivo: executar ativacao de TEF com risco controlado e rollback imediato.

## 1. Pre-gate de inicio

Executar somente se todos os itens abaixo estiverem OK:

- Decisao formal Go registrada em documentacao.
- Evidencias atuais de INT_REAL disponiveis:
  - `restaurante-web/tmp/evidencias/tef14-15-int-real.json`
  - `restaurante-web/tmp/evidencias/tef14-15-int-real.md`
- `restaurante-ops` saudavel:
  - `GET /healthz` HTTP 200
  - `GET /api/status` HTTP 200
- Janela operacional definida e responsavel nomeado.

## 2. Ativacao

1. Confirmar que o tenant alvo e o ambiente de producao estao corretos.
2. Habilitar a feature flag de maquininha (`FEATURE_CARD_MACHINE`).
3. Registrar horario de ativacao e operador responsavel.

## 3. Smoke pos-ativacao (imediato)

Executar:

```bash
cd d:/restaurante-supabase/restaurante-web
npm run test:e2e:pdv-validacao:int-real:auto:evidence:prod-web
```

Resultado esperado:

- total=3, passed=3, failed=0
- artefatos atualizados em `tmp/evidencias/`

## 4. Janela de observacao (30-60 min)

Monitorar:

- disponibilidade dos endpoints (`/healthz`, `/api/status`)
- comportamento de `/payments/initiate` e `/payments/status`
- aumento anormal de erros operacionais

Registrar:

- horario de inicio/fim da janela
- volume de tentativas relevantes
- incidentes e acoes executadas

## 5. Gatilhos de rollback imediato

Executar rollback sem espera adicional se ocorrer:

- falha de seguranca ou isolamento multi-tenant
- divergencia de evidencia critica em transacoes TEF
- degradacao operacional relevante apos ativacao

## 6. Procedimento de rollback

1. Desativar `FEATURE_CARD_MACHINE`.
2. Manter metodos legados de pagamento ativos.
3. Preservar trilha de auditoria do periodo.
4. Abrir incidente com causa raiz e plano corretivo.

Referencia base: `docs/maquininha/04-plano-execucao-testes-rollout.md` (Secao 6).
