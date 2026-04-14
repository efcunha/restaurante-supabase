# Parecer de Produção - pos_device_bindings + integração operacional

Data de referencia: **2026-04-14**

## Decisão executiva

- **Escopo `pos_device_bindings` (migration + RLS): GO** para rollout controlado.
- **Escopo amplo "100% operacional" da matriz vigente: GO**, com ressalva de evidência híbrida (balança via bridge mock e TEF real em produção).

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

Conforme matriz oficial de homologação (`docs/maquininha/06-matriz-homologacao-tef-balanca.md`), não há bloqueadores pendentes no escopo da rodada atual:

1. `BAL-09` a `BAL-12`: **Cobertos** em modo mock (`tmp/evidencias/bal-09-12-t1-20260414T020412Z.json`).
2. `INT-02` e `INT-03`: **Cobertos** com TEF real + validações integradas (`tmp/evidencias/homologacao-usb-serial-tef-balanca-20260414T021419Z.json`, `int02_ok=true`, `int03_ok=true`).

Ressalva técnica registrada:

- A leitura de balança nesta rodada foi via bridge local em `MOCK(stable)` (`simulacao=true` no artifact `bridge-status-20260414T021419Z.json`).
- Para declaração de "100% hardware físico" (serial real + TEF real), ainda é recomendada uma rodada adicional com porta serial física conectada.

## Critério objetivo para mudança de status para GO total

Para declarar "100% operacional" no escopo amplo, executar e evidenciar os itens pendentes acima com:

1. evidência visual sanitizada;
2. logs de bridge/endpoint sem segredos;
3. atualização da matriz com status final por cenário;
4. decisão formal Go/No-Go atualizada no mesmo ciclo.

## Recomendação atual

1. Promover `pos_device_bindings` com rollout controlado (escopo atual: **GO**).
2. Considerar a matriz atual fechada em **100%** (6/6 cenários alvo cobertos na rodada).
3. Planejar rodada complementar de certificação com balança serial física para eliminar a ressalva de simulação no eixo de peso.