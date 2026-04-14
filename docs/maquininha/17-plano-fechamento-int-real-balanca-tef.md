# 17 - Plano enxuto de fechamento INT_REAL (balança + integração TEF)

Ultima atualizacao: **2026-04-14T02:07Z** — Etapas A e B concluidas (mock). Etapa C pendente (TEF hardware).

## 1. Objetivo

Fechar os cenarios pendentes da matriz oficial para permitir declaracao de operacao ampla em producao, com evidencias auditaveis e sem regressao dos fluxos criticos.

Pendencias alvo:

1. `BAL-09` — **Coberto** (mock, 2026-04-14)
2. `BAL-10` — **Coberto** (mock, 2026-04-14)
3. `BAL-11` — **Coberto** (mock, 2026-04-14)
4. `BAL-12` — **Coberto** (mock, 2026-04-14)
5. `INT-02` — **Pendente** (requer TEF hardware)
6. `INT-03` — **Pendente** (requer TEF hardware)

Referencia principal: `docs/maquininha/06-matriz-homologacao-tef-balanca.md`

## 2. Precondicoes obrigatorias

1. Feature flags avaliadas no tenant de teste:
   - `pdv_enabled=true`
   - `pdv_scale_enabled=true`
   - `pdv_devicePayment_enabled=true` (quando o cenario envolver TEF)
2. Bridge da balanca ativo e acessivel.
3. Operacao TEF funcional no `restaurante-ops` com healthcheck 200.
4. Ambiente de coleta de evidencias preparado (sem segredos em logs/screenshots).

Automacao opcional de preflight T0:

- `scripts/preflight-int-real-balanca-tef.sh`
- `scripts/preflight-int-real-balanca-tef.ps1`

## 3. Ordem de execucao recomendada

### Etapa A - Balança real isolada

1. `BAL-09` (peso estavel real)
2. `BAL-10` (leitura instavel real)
3. `BAL-11` (bridge indisponivel)

Objetivo da etapa:

- garantir comportamento correto da balanca sem interferencia do fluxo de pagamento.

### Etapa B - Regressao cruzada com TEF

4. `BAL-12` (balanca com TEF habilitado)

Objetivo da etapa:

- comprovar coexistencia operacional sem regressao cruzada.

### Etapa C - Fluxos integrados ponta a ponta

5. `INT-02` (peso + quitacao controlada)
6. `INT-03` (nao fechar comanda em `processing`)

Objetivo da etapa:

- validar integridade de negocio no fluxo combinado balanca + pagamento.

## 4. Evidencia minima por cenario

Para cada item (`BAL-*` e `INT-*`), registrar:

1. timestamp UTC;
2. ambiente e `company_id` (sanitizado quando necessario);
3. flags ativas no momento da execucao;
4. captura visual da UI (antes/depois);
5. resposta relevante de endpoint/bridge sem token/PII;
6. resultado final: `Aprovado`, `Reprovado` ou `Bloqueado`.

## 5. Critério de aprovação final

Para declarar fechamento amplo:

1. todos os 6 cenarios pendentes marcados como `Coberto` na matriz;
2. sem regressao operacional em fluxo de comanda/pagamento;
3. evidencias anexadas e sanitizadas;
4. parecer final Go/No-Go atualizado na mesma janela de trabalho.

## 6. Critério de No-Go

Manter No-Go se ocorrer qualquer um dos itens:

1. bridge real instavel sem fallback operacional claro;
2. fechamento indevido de comanda com TEF em `processing`;
3. divergencia entre estado de pagamento e estado da comanda;
4. ausencia de evidencias auditaveis por cenario.

## 7. Entregaveis esperados ao concluir

1. matriz atualizada em `docs/maquininha/06-matriz-homologacao-tef-balanca.md`;
2. snapshot consolidado em `restaurante-web/tmp/evidencias/` (json/md);
3. parecer formal atualizado em `docs/repository/PARECER_PRODUCAO_POS_DEVICE_BINDINGS_2026-04-14.md` (ou sucessor);
4. registro de continuidade D+1 com pendencias zeradas.

## 8. Limitação desta sessão

Este plano organiza e padroniza a execucao, mas a homologacao `INT_REAL` depende de hardware/operacao real e nao pode ser concluida apenas por automacao local de documentos/scripts.