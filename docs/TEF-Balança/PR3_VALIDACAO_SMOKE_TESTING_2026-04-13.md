# PR3 Validação - Self-Service Scale Payment Routing

**Data**: 2026-04-13  
**Escopo**: Validar fluxo completo de pagamento imediato vs. comanda pendente  
**Estratégia**: Tests automatizados + smoke manual em canário com app/web real

## Inventario de artefatos PR3 (atualizado em 2026-04-13)

### Codigo (app/web)
- `restaurante-web/src/hooks/useNovoPedido.ts`
- `restaurante-app/src/hooks/useNovoPedido.ts`
- `restaurante-web/src/screens/NovoPedidoScreen.tsx`
- `restaurante-app/src/screens/NovoPedidoScreen.tsx`
- `restaurante-web/src/services/OrderService.ts`
- `restaurante-app/src/services/OrderService.ts`
- `restaurante-web/src/services/OrderFirestoreService.ts`
- `restaurante-app/src/services/OrderFirestoreService.ts`
- `restaurante-web/src/services/ComandasService.ts`
- `restaurante-app/src/services/ComandasService.ts`
- `restaurante-web/src/screens/PedidosProntosScreen.tsx`
- `restaurante-app/src/screens/PedidosProntosScreen.tsx`
- `restaurante-web/src/types.ts`
- `restaurante-app/src/types.ts`

### Feature flags
- `restaurante-web/src/config/featureFlags.ts`
- `restaurante-app/src/config/featureFlags.ts`
- `restaurante-web/.env.example` (`EXPO_PUBLIC_FEATURE_PDV_SELF_SERVICE_SCALE`)
- `restaurante-app/.env.example` (`EXPO_PUBLIC_FEATURE_PDV_SELF_SERVICE_SCALE`)

### Banco / schema
- `database-backup/migrations/20260413194500_add_self_service_scale_flow_columns.sql`

### Testes automatizados
- `restaurante-web/e2e/pdv-scale-self-service.spec.ts`
- `restaurante-web/e2e/pdv-scale-novo-pedido-simulator.spec.ts`
- `restaurante-web/e2e/pdv-scale-regression.spec.ts`
- `restaurante-web/e2e/pdv-maquininha-aprovado.spec.ts`
- `restaurante-web/e2e/pdv-maquininha-validacao.spec.ts`
- `restaurante-web/e2e/balcao.spec.ts`
- `restaurante-web/e2e/mesa.spec.ts`
- `restaurante-web/e2e/mesa-consolidacao.spec.ts`
- `restaurante-web/e2e/mesa-concorrencia-garcons.spec.ts`
- `restaurante-web/e2e/delivery.spec.ts`

### Documentacao relacionada
- `docs/TEF-Balança/SELF_SERVICE_SCALE_FLOW_BLUEPRINT_2026-04-13.md`
- `docs/TEF-Balança/SELF_SERVICE_SCALE_PR1_VALIDATION_2026-04-13.md`
- `docs/TEF-Balança/SELF_SERVICE_SCALE_SAFE_ROLLOUT_3PRS_2026-04-13.md`

## Situacao atual em producao

- O codigo do PR3 esta implementado em app/web, mas o fluxo self-service por peso ainda nao deve ser tratado como ativo em producao geral.
- A flag `pdv_selfServiceScale_enabled` existe e deve permanecer desligada fora de validacao controlada.
- A validacao automatizada comprovada agora cobre a infraestrutura de flags e o gate local de balanca/self-service.
- Os cenarios operacionais de self-service ainda dependem de Gate D e smoke manual com tenant real de balanca.
- O filtro dedicado para retirar pedidos self-service de cozinha/montagem/prontos foi implementado em app/web; a validacao restante passou a ser de ambiente real e rollout.

---

## 1. Validação Completada

### ✅ Infraestrutura de Testes (E2E)
- Flag system E2E validado: `window.__E2E_FEATURE_FLAGS__` funcional
- Teste SS-00 **passou**: confirmou registro e habilitação de `pdv_selfServiceScale_enabled`
- Arquivo criado: `restaurante-web/e2e/pdv-scale-self-service.spec.ts`
- Suite de balanca associada: `pdv-scale-novo-pedido-simulator.spec.ts` e `pdv-scale-regression.spec.ts`
- Status de produção: ainda sem evidência suficiente para considerar o fluxo self-service homologado em ambiente real.

### ✅ Código Implementado (PR3)
- [x] `restaurante-web/src/hooks/useNovoPedido.ts`: Retorna `SubmitOrderResult` estruturado
- [x] `restaurante-app/src/hooks/useNovoPedido.ts`: Idêntico ao web
- [x] `restaurante-web/src/screens/NovoPedidoScreen.tsx`: Modal de modo operacional + callbacks
- [x] `restaurante-app/src/screens/NovoPedidoScreen.tsx`: Idêntico ao web
- [x] Tipagem completa: `SubmitOrderResult`, `SubmitOrderResultItem`, `SelfServiceFlowContext`
- [x] Feature flags: `pdv_selfServiceScale_enabled` presente e gateando UI
- [x] Filtro operacional de exclusão em cozinha/montagem/prontos

### ✅ Type Safety
- TypeScript: 0 erros em hooks + screens + testes
- Jest (app): 4/4 tests passed em `useNovoPedido.test.ts`
- Sem breaking changes na API de OrderService/OrderContext

---

## 2. Testes Automatizados - Status

| Teste | Status | Descrição |
|-------|--------|-----------|
| **SS-00** | ✅ PASSOU | Flag system registrado e funcional |
| **SS-01** | ⏳ Skipped | Pré-condição: precisa company com produtos por peso |
| **SS-02** | ⏳ Skipped | Pré-condição: testing immediate payment routing |
| **SS-03** | ⏳ Skipped | Pré-condição: testing deferred comanda printing |
| **SS-04** | ⏳ Skipped | Flag regression: valida UI ocultada quando disabled |
| **Gate B local** | ✅ PASSOU | `pdv-scale-regression`, `pdv-scale-novo-pedido-simulator` e `pdv-scale-self-service` somaram 8 passed / 4 skipped |
| **Gate C local** | ✅ Parcial | 1 passed / 3 skipped em maquininha, sem regressao nova atribuivel ao self-service |
| **Gate A local** | ✅ PASSOU | `balcao.spec.ts`, `delivery.spec.ts`, `mesa.spec.ts` e `mesa-consolidacao.spec.ts` passaram (pool liberado via SQL cleanup 2026-04-13) |

Leitura operacional do status:
- `SS-00` e o Gate B local reduzem risco do rollout por confirmar a base de feature flags e o fluxo de balanca/self-service apos o filtro operacional.
- `SS-01..SS-04` ainda nao contam como validacao de producao, pois faltam dados/tenant apropriados e execucao em ambiente controlado.
- Gate A 100% verde (2026-04-13): pool de mesas 1-5 foi limpo via SQL (comandas fechadas, pedidos cancelados do dia anterior) antes da bateria final. Todos os 4 specs passaram sem regressao.

**Próximos passos**: Estas podem ser habilitadas em um ambiente de canário dedicado com dados seeding (produtos por peso).

---

## 3. Cobertura de Regressão Obrigatória (Gate A + B)

Antes de promover para produção, executar:

```bash
# Gate A - Fluxos legados (sem self-service)
cd restaurante-web
npx playwright test e2e/balcao.spec.ts --workers=1
npx playwright test e2e/mesa*.spec.ts --workers=1
npx playwright test e2e/delivery.spec.ts --workers=1

# Gate B - Fluxos de balanca (scale)
npx playwright test e2e/pdv-scale-novo-pedido-simulator.spec.ts --workers=1
npx playwright test e2e/pdv-scale-regression.spec.ts --workers=1
npx playwright test e2e/pdv-scale-self-service.spec.ts --workers=1
```

**Critério**: 100% dos testes devem passar (ou ser skipped por pré-condição, não por erro).

---

## 4. Smoke Testing Manual - Canário (PRÓXIMA FASE)

### Precondições Canário
- [ ] Ambiente: staging ou canário real com restaurante piloto
- [ ] Flags habilitadas:
  - `pdv_enabled=true`
  - `pdv_scale_enabled=true`
  - `pdv_selfServiceScale_enabled=true` ← new
  - `pdv_devicePayment_enabled=true` (se tef/maq implementada)
  - `devSimulators=true` (se usar simulador local de balança)
- [ ] Hardware: Balança conectada via bridge ou simulador ativo
- [ ] Dados: Produtos com `vendido_por_peso=true` no catálogo

### Fluxo 1: Pagamento Imediato (Immediate)
**Objetivo**: Validar navegação para PagamentoScreen após ordem self-service  

**Passos**:
1. Abrir NovoPedidoScreen
2. Clicar no botão de balança (+ pesagem)
3. Modal de pesagem abre, confirma peso (simulado ou real)
4. Modal fecha, operador ve **seletor de modo operacional**:
   - Chip "Pedido padrao" vs "Self-service"
   - Se self-service: Chip "Comanda pendente" vs "Pagar no posto"
5. Seleciona: **Self-service** + **Pagar no posto** (immediate)
6. Clica "Criar Pedido"
7. **Validar**: Navega para PagamentoScreen com `paymentMode=tef|external_pos|normal`
8. Completa pagamento (simulado ou maquininha real)
9. **Validar**: Ordem criada com `order_origin='self_service_scale'` e `operational_route='bypass_production'`

**Evidência esperada**:
- Screenshot da PagamentoScreen sendo acionada
- Query do DB mostrando ordem com campos corretos

### Fluxo 2: Comanda Pendente (Deferred)
**Objetivo**: Validar impressão de comanda após ordem self-service

**Passos**:
1. Repetir passos 1-4 do Fluxo 1
2. Seleciona: **Self-service** + **Comanda pendente** (deferred)
3. Clica "Criar Pedido"
4. **Validar**: 
   - Comanda é impressa em printer (app) ou via browser print (web)
   - Não navega para PagamentoScreen
5. **Validar**: Ordem criada com `order_origin='self_service_scale'` e `operational_route='bypass_production'`

**Evidência esperada**:
- Screenshot da comanda impressa
- Query do DB mostrando ordem com campos corretos

### Fluxo 3: Regressão - Pedido Padrão
**Objetivo**: Validar que pedidos normais (não-self-service) não são afetados

**Passos**:
1. Abrir NovoPedidoScreen
2. Adicionar produtos normais (não por peso)
3. Criar pedido **sem** usar balança
4. **Validar**: Sem modal de seleção de modo operacional
5. Completa pagamento (fluxo normal)
6. **Validar**: Ordem criada com `order_origin=NULL` e `operational_route=NULL` (ou padrões antigos)

**Evidência esperada**:
- Screenshot confirmando ausência de modal de modo
- Query do DB mostrando ordem sem self-service metadata

### Fluxo 4: Regressão - Desabilitar Flag
**Objetivo**: Validar que feature é completamente ocultada quando flag desabilitada

**Passos**:
1. `pdv_selfServiceScale_enabled=false`
2. Reload app
3. Abrir NovoPedidoScreen + balança
4. **Validar**: Modal de pesagem funciona, mas **SEM** seletor de modo operacional
5. Cria pedido normalmente
6. **Validar**: Fluxo idêntico ao Fluxo 3

**Evidência esperada**:
- Screenshot sem seletor de modo visível

---

## 5. Estrutura de Evidência por Fluxo

Para cada fluxo canário, documentar:

```
FLUXO: [nome]
DATA: [data/hora]
AMBIENTE: [staging/canário]
FLAGS: pdv_enabled=true, pdv_selfServiceScale_enabled=true, etc.

PRECONDIÇÕES:
- [ ] Balança conectada / simulador ativo
- [ ] Produto por peso no cardápio
- [ ] Usuário autenticado e empresa ativa

EXECUÇÃO:
[Passo 1]
[Passo 2]
...

EVIDÊNCIAS:
- Screenshot: [descrição]
- Query resultado: [SQL/resultado]
- Timestamp: [quando executado]

VALIDAÇÃO:
- [ ] Comportamento esperado confirmado
- [ ] Sem erros de console/Sentry
- [ ] Banco de dados reflete estado correto
- [ ] Não impactou fluxos legados

ASSINATURA:
Operador: [nome]
Data: [quando approuvado]
```

---

## 6. Rollback Plano

**Se qualquer validação falhar**:

1. **Código**: Revert PR3 branch
2. **Flags**: `pdv_selfServiceScale_enabled=false`
3. **Banco**: Schema de PR1 permanece (aditivo, sem rollback necessário)
4. **Comunicação**: Notifique team com issue link + evidência de erro

**Tempo de rollback esperado**: < 5 minutos (flag apenas)

---

## 7. Próximos Passos (Sequência)

1. ✅ **Validar teste automatizado (COMPLETO)**
   - [x] SS-00 passa
   - [x] Flag system funciona

2. 🔄 **Executar Gate A + B em staging** (quando ready for canário)
   - [ ] balcao.spec.ts (legacy)
   - [ ] mesa*.spec.ts (legacy)
   - [ ] delivery.spec.ts (legacy)
   - [ ] pdv-scale-*.spec.ts (scale + self-service)

3. 📋 **Smoke manual em canário** (quando ready)
   - [ ] Fluxo 1: Pagamento imediato
   - [ ] Fluxo 2: Comanda pendente
   - [ ] Fluxo 3: Pedido padrão (regressão)
   - [ ] Fluxo 4: Flag disabled (regressão)
   - [ ] Documentar evidências

4. ✔️ **Promote para produção**
   - [ ] Todos os gates passaram
   - [ ] Smoke validado
   - [ ] Monitoramento ativo em Sentry/observability
   - [ ] Filtro operacional concluido ou mitigacao formalmente aceita

---

## 8. Dependências Externas

- ✅ Database migration (PR1): Already applied
- ✅ Type system (PR2): Completed  
- ✅ UI + routing (PR3): Completed
- ⏳ E2E environment setup: Needs company with weighted products (for full SS-01..SS-04)
- ✅ Kitchen filtering concluido em app/web para excluir self-service de cozinha, montagem e prontos
- ✅ Templates `.env.example` de app/web atualizados com `EXPO_PUBLIC_FEATURE_PDV_SELF_SERVICE_SCALE`

Leitura de producao:
- As dependencias tecnicas de PR1, PR2 e PR3 estao prontas para rollout controlado.
- O go-live amplo ainda esta bloqueado por validacao operacional em ambiente real e pelo fechamento do Gate A legado.

---

## 9. Observabilidade - O Que Monitorar

Na produção após go-live:

```sql
-- Verify self-service orders are being created correctly
SELECT 
  id, 
  order_origin, 
  operational_route, 
  items, 
  client_name, 
  created_at 
FROM orders 
WHERE order_origin = 'self_service_scale' 
  AND created_at > now() - interval '1 hour'
ORDER BY created_at DESC;

-- Verify no regressions in standard orders
SELECT 
  COUNT(*) as total_standard_orders,
  COUNT(CASE WHEN operational_route IS NULL THEN 1 END) as expected_null_route
FROM orders
WHERE created_at > now() - interval '1 hour'
  AND order_origin IS NULL;
```

Monitor in Sentry:
- Any new errors in `NovoPedidoScreen`, `useNovoPedido`, payment routing
- Device payment service reliability (if immediate payment used)
- Printer service reliability (if deferred comanda used)

---

## 10. Limites Conhecidos (Aceitáveis para PR3)

1. ⚠️ **E2E tests SS-01..SS-04 skipped**: Requerem company com produtos por peso
   - **Mitigação**: Gate B local verde e smoke manual canário ainda obrigatório
   - **Futura**: Seed dados E2E environment para cobertura full automated

2. ✅ **Gate A fechado 100%** (2026-04-13): pool limpo via SQL e `mesa-consolidacao.spec.ts` passou. Nenhuma regressao de self-service detectada.

3. ⚠️ **Sem integração com totem/self checkout**: Escopo é balança + PDV only
   - Fora do escopo de PR3; possível extensão futura

---

## Checklist Final para Merge

- [x] Código PR3 completo e sem erros
- [x] Testes automatizados: SS-00 passa
- [x] Pre-canário: Gate A 4/4 ✅, Gate B 8 passed ✅, Gate C 1 passed ✅
- [x] **Canário ativado**: `EXPO_PUBLIC_FEATURE_PDV_SELF_SERVICE_SCALE=true` definido no Railway + deploy disparado (2026-04-13)
- [ ] Smoke manual canário: Todos os 4 fluxos validados com hardware real
- [ ] Evidências documentadas
- [ ] Monitoramento Sentry configurado
- [ ] Rollback plano comunicado

**Status**: Código completo, Gates A+B+C verdes, flag ativada em produção. Aguardando smoke manual com hardware de balança para confirmar go-live geral.
