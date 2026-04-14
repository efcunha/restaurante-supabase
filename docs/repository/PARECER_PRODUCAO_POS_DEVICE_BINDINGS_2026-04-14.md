# Parecer de Produção - pos_device_bindings + integração operacional

Data de referencia: **2026-04-14**

## Decisão executiva

- **Escopo `pos_device_bindings` (migration + RLS): GO** para rollout controlado.
- **Escopo amplo "100% operacional em produção" (TEF + balança + integração real completa): NO-GO ainda**.

## Evidência técnica do escopo pos_device_bindings

Fonte:

- `database-backup/logs/evidencias/pos-device-bindings-validation-summary-20260414T012410Z.md`

Resultado:

1. `verify_exit_code=0`
2. `smoke_exit_code=0`
3. `smoke_mode=cross-tenant-transactional`
4. `overall_result=GO`

Interpretação:

- Estrutura, RLS, policies, índices e trigger estão válidos.
- Isolamento cross-tenant foi validado em modo transacional sem persistência.

## Bloqueadores para "100% operacional" (escopo amplo)

Conforme matriz oficial de homologação (`docs/maquininha/06-matriz-homologacao-tef-balanca.md`):

**Cobertos em modo mock (2026-04-14T02:04Z) — evidência: `tmp/evidencias/bal-09-12-t1-20260414T020412Z.json`:**

1. `BAL-09` - Capturar peso estável: **Coberto** (`/peso` HTTP 200, `estavel=true`, 1.5 kg).
2. `BAL-10` - Leitura instável: **Coberto** (`/peso/estavel` HTTP 408 confirmado).
3. `BAL-11` - Bridge offline: **Coberto** (connection refused HTTP 000 confirmado).
4. `BAL-12` - Regressão cruzada com TEF: **Coberto** (peso 15.25 kg, tara OK, status OK).

**Ainda pendentes (requerem hardware TEF físico):**

5. `INT-02` - Fluxo integrado peso + quitação controlada: **Pendente**.
6. `INT-03` - Comanda não fechar com TEF em `processing`: **Pendente**.

**Nota de execução:** cenários BAL-09..BAL-12 foram executados com `BALANCA_MOCK=true` via `scripts/run-t1-bal09-12.sh`. O bridge (`balanca-bridge/`) está provisionado e operacional; a serial física (`COM3`) não está presente neste host. Quando hardware serial for conectado, desabilitar mock no `.env` e re-executar para evidência com hardware real.

## Critério objetivo para mudança de status para GO total

Para declarar "100% operacional" no escopo amplo, executar e evidenciar os itens pendentes acima com:

1. evidência visual sanitizada;
2. logs de bridge/endpoint sem segredos;
3. atualização da matriz com status final por cenário;
4. decisão formal Go/No-Go atualizada no mesmo ciclo.

## Recomendação atual

1. Promover `pos_device_bindings` com rollout controlado (escopo atual: **GO**).
2. Cenários de balança (`BAL-09..BAL-12`): **GO** para cobertura funcional do bridge — validação de protocolo e comportamento de erro confirmada via mock.
3. Não declarar fechamento total de produção até concluir `INT-02` e `INT-03` (requerem maquininha TEF física).