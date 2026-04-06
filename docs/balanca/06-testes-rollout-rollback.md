# 06 - Testes, rollout e rollback

## 1. Estrategia de testes

## 1.1 Unitarios

Cobrir:

- Parser de leitura decimal e inteira.
- Deteccao de estabilidade e instabilidade.
- Mapeamento de erros para mensagens operacionais.
- Regras de habilitacao/desabilitacao do confirmar.

## 1.2 Integracao

Cobrir:

- Hook consumindo respostas do bridge mockado.
- Fluxo de tara.
- Timeout de peso estavel.
- Interrupcao de polling no fechamento de tela.

## 1.3 E2E

Casos minimos:

1. Produto pesavel abre fluxo de balanca.
2. Leitura instavel bloqueia confirmar.
3. Leitura estavel permite confirmar.
4. Valor por kg e calculado corretamente.
5. Erro de bridge mostra mensagem e permite retry.
6. Confirmacao adiciona item com peso_kg.
7. Fechamento encerra polling.

## 1.4 Smoke test operacional

- Validar leitura com hardware real ou emulador serial.
- Validar reconexao apos desconectar e reconectar USB.
- Validar fallback manual em indisponibilidade do bridge.

## 2. Rollout progressivo

Fases recomendadas:

- Wave 1: piloto interno (sandbox controlado).
- Wave 2: grupo reduzido de restaurantes.
- Wave 3: liberacao ampla com monitoramento ativo.

## 3. Feature flag

Flag recomendada:

- EXPO_PUBLIC_FEATURE_BALANCA

Politica:

- Default desligado em producao ate validacao completa.
- Ativacao controlada por janela operacional.

## 4. Criterios de go/no-go

Go quando:

- Taxa de sucesso de leitura dentro da meta.
- Sem regressao em fluxo de pedido.
- Sem falhas de seguranca ou isolamento.

No-Go quando:

- Instabilidade recorrente do bridge sem mitigacao.
- Falhas de parser causando erro operacional.
- Alertas criticos de observabilidade sem resolucao.

## 5. Plano de rollback

1. Desativar feature flag de balanca.
2. Manter fluxo de venda manual ativo.
3. Preservar trilha de auditoria do periodo.
4. Abrir incidente com causa raiz e plano corretivo.
