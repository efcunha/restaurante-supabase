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

Conforme matriz oficial de homologação (`docs/maquininha/06-matriz-homologacao-tef-balanca.md`), ainda há pendências `INT_REAL`:

1. `BAL-09` - Capturar peso estável real: **Pendente**.
2. `BAL-10` - Capturar leitura instável real: **Pendente**.
3. `BAL-11` - Indisponibilidade real do bridge: **Pendente**.
4. `BAL-12` - Regressão cruzada com TEF habilitado: **Pendente**.
5. `INT-02` - Fluxo integrado peso + quitação controlada: **Pendente**.
6. `INT-03` - Comanda não fechar com TEF em `processing`: **Pendente**.

## Critério objetivo para mudança de status para GO total

Para declarar "100% operacional" no escopo amplo, executar e evidenciar os itens pendentes acima com:

1. evidência visual sanitizada;
2. logs de bridge/endpoint sem segredos;
3. atualização da matriz com status final por cenário;
4. decisão formal Go/No-Go atualizada no mesmo ciclo.

## Recomendação atual

1. Promover `pos_device_bindings` com rollout controlado (escopo atual: **GO**).
2. Não declarar fechamento total de produção até concluir os cenários `INT_REAL` pendentes da balança e integração cruzada.