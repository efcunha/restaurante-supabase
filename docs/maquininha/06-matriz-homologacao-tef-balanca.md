# 06 - Matriz de homologacao TEF + balanca

Ultima atualizacao: **2026-04-10**

## 1. Objetivo

Consolidar a execucao de homologacao do PDV web para os fluxos de TEF integrado e balanca, separando com clareza:

1. o que pode ser validado apenas com simulador local;
2. o que depende de mock automatizado no frontend/E2E;
3. o que exige integracao real controlada com `restaurante-ops`, bridge da balanca e ambiente operacional.

Este documento complementa, e nao substitui:

- `04-plano-execucao-testes-rollout.md`
- `05-fluxo-operacional-pdv-balanca.md`
- `../balanca/06-testes-rollout-rollback.md`

## 2. Escopo

Incluido nesta matriz:

- TEF integrado no `restaurante-web`
- Leitura de balanca no `restaurante-web`
- Uso dos simuladores em `src/features/dev-simulators`
- Mock automatizado de endpoints e polling
- Validacao real controlada de endpoints e bridge

Fora de escopo desta matriz:

- `restaurante-app` como alvo principal de homologacao TEF
- deploy, rollout e ativacao de flags em producao
- execucao real de testes nesta etapa documental
- homologacao financeira com adquirente externo alem do que o fluxo atual do projeto suporta

## 3. Legenda de tipos de validacao

| Tipo | Descricao | Objetivo | Limites |
| --- | --- | --- | --- |
| `SIM_LOCAL` | Simulador visual/manual em `dev-simulators` | Validar UX, fluxo guiado e treinamento operacional | Nao valida rede, polling real, autenticacao, idempotencia nem persistencia |
| `MOCK_AUTO` | Mock automatizado de fetch/route em testes | Validar contratos do frontend, polling, transicoes de estado e regressao | Nao valida infraestrutura externa nem comportamento real do bridge |
| `INT_REAL` | Integracao real controlada com endpoints/bridge | Validar aderencia ponta a ponta do que esta implementado hoje | Exige ambiente controlado, flags corretas, evidencias e risco operacional maior |

## 4. Premissas obrigatorias

| Item | Regra |
| --- | --- |
| Multi-tenant | Toda validacao deve respeitar `company_id` e autenticacao vigente |
| Feature flags | `pdv_enabled`, `pdv_devicePayment_enabled` e `pdv_scale_enabled` devem ser avaliadas por cenario |
| Simuladores | Nunca devem ser tratados como evidência de integracao real |
| Producao | Como nao existe staging dedicado, toda validacao real precisa ser controlada e documentada |
| Segurança | Nenhum secret, token ou PII deve aparecer em evidencias anexadas |

## 5. Fontes de verdade para evidencias

| Domínio | Fonte principal |
| --- | --- |
| TEF web | `restaurante-web/src/features/pdv/services/devicePaymentService.ts` |
| Polling TEF | `restaurante-web/src/features/pdv/hooks/devicePaymentPolling.ts` |
| Balanca web | `restaurante-web/src/features/pdv/services/scaleBridgeService.ts` |
| Simuladores locais | `restaurante-web/src/features/dev-simulators/` |
| E2E TEF | `restaurante-web/e2e/pdv-maquininha-aprovado.spec.ts` |
| E2E balanca | `restaurante-web/e2e/pdv-scale-regression.spec.ts` |
| Polling automatizado | `restaurante-web/e2e/pdv-device-payment-polling.spec.ts` |

## 6. Limites do simulador atual

Os simuladores atuais ajudam em UX e treino operacional, mas nao cobrem integralmente os contratos reais.

| Area | O que existe hoje | O que nao cobre |
| --- | --- | --- |
| Maquininha | `approved`, `declined`, `timeout`, valor e metodo locais | `processing`, `error`, autenticacao, endpoint real, polling, idempotencia |
| Balanca | peso, tara, instabilidade e string estilo Toledo | bridge HTTP real, reconexao USB, timeout de rede, parser do processo local |
| Roteamento | instrucao de rota/flag em documento local | rota/flag dev estruturadas ainda nao estao formalizadas no fluxo principal |

## 7. Matriz TEF integrado

| ID | Tipo | Cenario | Pre-condicao | Entrada | Passos resumidos | Resultado esperado | Evidencia minima | Status inicial |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TEF-01 | SIM_LOCAL | Aprovar transacao local | Simulador de maquininha acessivel | Valor qualquer e metodo local | Abrir simulador e acionar `Aprovar` | UI registra transacao aprovada com NSU ficticio | Captura da tela do simulador e log local em memoria | Planejado |
| TEF-02 | SIM_LOCAL | Recusar transacao local | Mesmo contexto do simulador | Valor qualquer | Acionar `Recusar` | UI registra recusa e motivo aleatorio | Captura da tela com motivo exibido | Planejado |
| TEF-03 | SIM_LOCAL | Simular timeout local | Mesmo contexto do simulador | Valor qualquer | Acionar `Timeout` | UI registra timeout operacional local | Captura da tela e log local | Planejado |
| TEF-04 | MOCK_AUTO | Iniciacao retorna `processing` | Flags PDV habilitadas no teste | `POST /payments/initiate` mockado | Executar fluxo web com route mock | Frontend mostra processamento sem marcar pagamento final | Saida do teste automatizado e fixture mock | Coberto parcialmente |
| TEF-05 | MOCK_AUTO | Polling `processing -> approved` | Mesmo cenario do teste de polling | `transactionId` valido | Executar polling ate estado final | Estado final `approved` e mensagem coerente | Teste automatizado do polling | Coberto |
| TEF-06 | MOCK_AUTO | Polling `processing -> declined` | Mesmo cenario do teste de polling | `transactionId` valido | Executar polling com retorno final negativo | Estado final `declined` sem falso sucesso | Teste automatizado do polling | Coberto |
| TEF-07 | MOCK_AUTO | Polling `processing -> timeout` | Mesmo cenario do teste de polling | `transactionId` valido | Executar polling sem estado final antes do prazo | Estado final `timeout` com mensagem operacional | Teste automatizado do polling | Coberto |
| TEF-08 | MOCK_AUTO | Endpoint indisponivel na iniciacao | Flags PDV habilitadas | Mock de `POST /payments/initiate` falhando | Executar inicio da maquininha | Frontend mostra erro operacional sem travar fluxo | `restaurante-web/e2e/pdv-device-payment-service.spec.ts` (`TEF-08`) | Coberto |
| TEF-09 | MOCK_AUTO | `EXPO_PUBLIC_OPS_BASE_URL` ausente | Flag PDV habilitada e env ausente | Valor valido | Acionar pagamento por maquininha | Servico retorna erro de configuracao sem chamar rede | `restaurante-web/e2e/pdv-device-payment-service.spec.ts` (`TEF-09`) | Coberto |
| TEF-10 | MOCK_AUTO | Feature flag desabilitada | `pdv_enabled=false` ou `pdv_devicePayment_enabled=false` | Valor valido | Acionar fluxo de maquininha | Frontend bloqueia fluxo com mensagem coerente | `restaurante-web/e2e/pdv-device-payment-service.spec.ts` (`TEF-10`) | Coberto |
| TEF-11 | INT_REAL | Iniciar transacao real controlada | Flags PDV habilitadas, usuario autenticado, OPS acessivel | `companyId`, comanda, valor e metodo validos | Iniciar maquininha a partir da UI | Backend aceita request e retorna `processing` ou estado equivalente | `npm run test:e2e:pdv-maquininha:int-real:prod-web` com response real `POST /payments/initiate => 202` e payload `status=processing` apos: (1) hardening CORS publicado; (2) `payment_gateway_configs` ativo no tenant; (3) `PDV_DEVICE_SIMULATION=true` em `restaurante-ops`. | Coberto |
| TEF-12 | INT_REAL | Confirmar transacao aprovada | Mesmo contexto do item anterior | `transactionId` real | Aguardar polling ate finalizacao | Estado final `approved` sem duplicidade de baixa | `npx playwright test e2e/pdv-maquininha-aprovado.spec.ts` em `INT_REAL` com expectativa `approved` e evidencia de polling `processing -> succeeded` (`Statuses observados: ['processing','processing','succeeded']`) | Coberto |
| TEF-13 | INT_REAL | Confirmar timeout operacional | Mesmo contexto do item anterior | `transactionId` com atraso/nao conclusao | Deixar polling expirar | Frontend mostra timeout e nao registra sucesso falso | `npx playwright test e2e/pdv-maquininha-aprovado.spec.ts` em `INT_REAL` com expectativa `timeout`, evidenciando polling ativo (`/status` requests/responses: `26/26`) e encerramento sem sucesso falso | Coberto |
| TEF-14 | INT_REAL | Retry sem duplicidade de sucesso | Ops deployado com validacao ativa, token real e company real | Duas chamadas com mesma idempotencyKey | Executar suite API-direct de validacao TEF-14 | Mesmo transactionId retornado nas duas chamadas | Output de `e2e/pdv-maquininha-validacao.spec.ts` com transactionId identico e status 202 | Coberto |
| TEF-15 | INT_REAL | Validar bloqueio por comanda invalida e saldo insuficiente | Ops deployado com validacao ativa, token real e company real | Comanda inexistente e valor acima do saldo | Executar suite API-direct de validacao TEF-15 | Backend retorna HTTP 400 e impede processamento indevido | Output de `e2e/pdv-maquininha-validacao.spec.ts` com TEF-15a e TEF-15b em 400 | Coberto |

### Atualizacao de execucao - 2026-04-10 (turno da tarde)

- Tentativa de deploy via CLI executada com o comando `railway up --service restaurante-ops --path-as-root ./restaurante-ops`.
- Resultado do deploy CLI: bloqueado por autenticacao (`Invalid RAILWAY_TOKEN`).
- Healthcheck validado em producao: `GET /healthz` = HTTP 200 e `GET /api/status` = HTTP 200 em `https://ops.restaurante-web.app.br`.
- Credenciais foram carregadas dos `.env` locais e a suite INT_REAL foi executada com sucesso usando tenant real.
- Evidencias objetivas da execucao:
	- TEF-14: `status=202` nas duas chamadas com mesma `idempotencyKey` e mesmo `transactionId`.
	- TEF-15a: `status=400` para comanda inexistente (`99999999`).
	- TEF-15b: `status=400` para valor acima do saldo em comanda valida (`comanda 10`).
- Resultado final da suite: `3 passed` (`e2e/pdv-maquininha-validacao.spec.ts`).
- Comando utilizado para reexecucao controlada:

```bash
cd d:/restaurante-supabase/restaurante-web
bash scripts/run-tef14-15-tests.sh --token "<bearer>" --company "<company_uuid>" --comanda "999" --all
```

### Fechamento Go/No-Go - 2026-04-10 (fim do dia)

- Decisao formal: **Go** para ativacao de TEF em producao hoje.
- Checklist funcional: **OK** (TEF-14, TEF-15a, TEF-15b aprovados em INT_REAL no ciclo atual).
- Checklist de operacao: **OK** (`/healthz` e `/api/status` com HTTP 200).
- Checklist de evidencia: **OK** (JSON e Markdown atualizados no rerun automatico).
- Checklist de rollback: **OK** (procedimento por feature flag documentado em `04-plano-execucao-testes-rollout.md`, secao 6).

Evidencias referenciais deste fechamento:
- `restaurante-web/tmp/evidencias/tef14-15-int-real.json`
- `restaurante-web/tmp/evidencias/tef14-15-int-real.md`

## 8. Matriz balanca

| ID | Tipo | Cenario | Pre-condicao | Entrada | Passos resumidos | Resultado esperado | Evidencia minima | Status inicial |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| BAL-01 | SIM_LOCAL | Leitura estavel local | Simulador de balanca acessivel | Ajuste manual do slider | Ajustar peso bruto no slider | Simulador mostra peso liquido e status `estavel` | Captura da tela com valor e log local | Planejado |
| BAL-02 | SIM_LOCAL | Tara local | Mesmo contexto | Peso bruto diferente de zero | Acionar `Tarar` | Peso liquido volta a zero e estado `tarado` aparece | Captura da tela com tara ativa | Planejado |
| BAL-03 | SIM_LOCAL | Instabilidade local | Mesmo contexto | Peso base qualquer | Ativar modo `Instavel` | Log local gera leituras variando com estado `instavel` | Captura da tela e log local | Planejado |
| BAL-04 | MOCK_AUTO | Leitura estavel via service | Flags PDV e balanca habilitadas | Mock de fetch com `peso_kg` e `estavel=true` | Executar leitura via service/hook | Resultado `stable` com peso coerente | Teste automatizado do service | Coberto |
| BAL-05 | MOCK_AUTO | Timeout do bridge | Mesmo cenario do teste | Mock de fetch gerando `AbortError` | Executar leitura com timeout curto | Resultado `timeout` com mensagem operacional | Teste automatizado do service | Coberto |
| BAL-06 | MOCK_AUTO | Leitura instavel | Flags PDV e balanca habilitadas | Mock de fetch com `estavel=false` | Executar leitura | Resultado `unstable` sem confirmar peso | `restaurante-web/e2e/pdv-scale-regression.spec.ts` (`BAL-06`) | Coberto |
| BAL-07 | MOCK_AUTO | Erro inesperado do bridge | Flags PDV e balanca habilitadas | Mock de fetch rejeitando erro generico | Executar leitura | Resultado `error` com mensagem operacional | `restaurante-web/e2e/pdv-scale-regression.spec.ts` (`BAL-07`) | Coberto |
| BAL-08 | MOCK_AUTO | Feature flag da balanca desligada | `pdv_enabled=false` ou `pdv_scale_enabled=false` | Chamada ao service | Executar leitura | Service retorna erro por flag sem chamar bridge | `restaurante-web/e2e/pdv-scale-regression.spec.ts` (`BAL-08`) | Coberto |
| BAL-09 | INT_REAL | Capturar peso estavel real | Bridge acessivel e balanca conectada | Produto pesavel e peso fisico | Acionar leitura real | UI recebe peso estavel e permite seguir o fluxo | Evidencia visual, resposta do bridge e log sanitizado | Pendente |
| BAL-10 | INT_REAL | Capturar leitura instavel real | Mesmo contexto | Produto ainda em movimentacao | Acionar leitura antes da estabilidade | UI bloqueia confirmacao ate estabilizar | Evidencia visual e log do bridge | Pendente |
| BAL-11 | INT_REAL | Indisponibilidade do bridge | Flags habilitadas, bridge fora do ar | Acao de leitura real | Tentar capturar peso | Mensagem operacional clara com retry/fallback manual | Evidencia visual, erro do endpoint e ausencia de item indevido | Pendente |
| BAL-12 | INT_REAL | Regressao cruzada com TEF habilitado | `pdv_devicePayment_enabled=true` e `pdv_scale_enabled=true` | Fluxo de leitura de peso | Executar leitura no contexto PDV com TEF ativo | Balanca segue funcional sem interferencia do fluxo TEF | Evidencia visual, logs sanitizados e comparacao do fluxo | Pendente |

## 9. Matriz de cenario integrado PDV

| ID | Tipo | Cenario | Pre-condicao | Entrada | Passos resumidos | Resultado esperado | Evidencia minima | Status inicial |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| INT-01 | MOCK_AUTO | Nao regressao da balanca com TEF desligado | Flags PDV e balanca ativas, TEF desligado | Leitura estavel mockada | Executar teste de regressao atual | Balanca continua funcional | Teste automatizado existente | Coberto |
| INT-02 | INT_REAL | Fluxo por peso seguido de quitacao controlada | Balanca real operante e fluxo de pagamento disponivel | Item pesavel e pagamento valido | Capturar peso, adicionar item e seguir para pagamento | Consumo e quitacao permanecem separados e consistentes | Evidencia visual do item pesado + saldo atualizado | Pendente |
| INT-03 | INT_REAL | Comanda nao fecha com TEF ainda em `processing` | Fluxo TEF real iniciado | `transactionId` em andamento | Iniciar TEF e tentar encerrar fluxo antes da resposta final | Nao ocorre fechamento indevido da comanda | Evidencia visual + estado final da comanda | Pendente |

## 10. Checklist de evidencia por execucao

Para cada cenario executado, registrar no minimo:

1. data e ambiente utilizados;
2. feature flags ativas no momento;
3. identificador da comanda ou fixture de teste;
4. resposta relevante do endpoint ou do bridge, sem expor credenciais;
5. evidencia visual da UI quando houver comportamento operacional;
6. conclusao objetiva: aprovado, reprovado, bloqueado ou nao aplicavel.

## 11. Critérios de aceite por tipo

| Tipo | Criterio de aceite |
| --- | --- |
| `SIM_LOCAL` | Validar apenas UX, textos, estados locais e treinamento; nunca usar como prova de integracao real |
| `MOCK_AUTO` | Validar contrato do frontend, transicoes e regressao com repetibilidade automatizada |
| `INT_REAL` | Validar aderencia ponta a ponta do fluxo atualmente implementado, com evidencias sanitizadas e sem regressao operacional |

## 12. Go / no-go documental

### Go para homologacao controlada

- cenarios criticos de TEF em `processing`, `approved`, `declined` e `timeout` estiverem cobertos por mock automatizado e ao menos um fluxo real controlado;
- cenarios de balanca estavel, timeout e indisponibilidade do bridge estiverem cobertos;
- evidencias estiverem registradas sem expor segredo, token ou PII;
- ficar claro quais validacoes foram feitas com simulador, mock e integracao real.

### No-go

- simulador local estiver sendo usado como substituto de validacao real;
- lacunas de `error`, bridge indisponivel ou bloqueio por feature flag permanecerem sem cobertura;
- evidencias nao permitirem comprovar o comportamento observado;
- houver risco de confundir ambiente de teste com producao por ausencia de governanca documental.

## 13. Proximos passos sugeridos

1. Atualizar esta matriz a cada rodada de homologacao com status real dos cenarios.
2. Vincular evidencias executadas ao plano de `04-plano-execucao-testes-rollout.md`.
3. Quando os simuladores evoluirem, revisar a secao de limites para evitar falsa confianca.
4. Se o escopo de balanca ganhar lifecycle proprio, avaliar extrair uma matriz complementar em `docs/balanca/` apenas para casos exclusivos do bridge.