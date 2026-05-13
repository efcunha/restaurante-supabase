# PROMPT DE CONTINUACAO (DIA SEGUINTE)

Uso: retomada rapida de sessao com foco na fase atual de balanca, mantendo o historico de maquininha/TEF como encerrado no escopo principal.

Ultima atualizacao: 2026-04-13

---

## Status consolidado da fase anterior (maquininha/TEF)

Validacao documental realizada nesta data:

- Implantacao de maquininha/TEF (escopo TEF-14/TEF-15) esta 100% finalizada e validada em INT_REAL.
- Decisao operacional registrada: Go mantido em producao.
- Evidencias de fechamento: suite 3/3 aprovada, incluindo idempotencia (TEF-14) e bloqueios por comanda/saldo (TEF-15a/15b).

Fontes de verdade:

- docs/maquininha/11-encerramento-executivo-tef-2026-04-10.md
- docs/maquininha/07-deployment-tef14-tef15.md
- docs/maquininha/06-matriz-homologacao-tef-balanca.md

Observacao importante de escopo:

- Pendencias manuais de Pix em UI e WebUSB com hardware real continuam abertas em trilha separada e NAO reabrem o fechamento funcional do pacote TEF-14/TEF-15.
- Referencia: docs/maquininha/13-pix-tef-webusb-impressao-2026-04-10.md

---

## Prompt pronto para uso

Voce vai atuar como Desenvolvedor Full Stack Senior no monorepo restaurante-supabase.

Objetivo desta sessao:

- Avancar implementacao da balanca por fases, sem regressao em Balcao, Mesa, Delivery, Montagem e fluxo legado de pagamento.

### Leitura obrigatoria antes de codar

1. .github/skills/restaurante-supabase/SKILL.md
2. docs/balanca/README.md
3. docs/balanca/01-arquitetura-tecnica-camadas.md
4. docs/balanca/03-contratos-api-bridge.md
5. docs/balanca/04-dados-migracoes-rls.md
6. docs/balanca/06-testes-rollout-rollback.md
7. docs/maquininha/06-matriz-homologacao-tef-balanca.md (apenas para cenarios integrados)

### Guardrails inegociaveis

- Multi-tenant por company_id em toda operacao.
- RLS obrigatoria para dados novos e/ou alterados.
- Sem hardcode de segredo/token/chave.
- Sem EXPO_PUBLIC_* para segredo sensivel.
- Sem PII em logs.
- Sem quebra do fluxo legado de pagamento.

### Validacoes obrigatorias por bloco

- TypeScript sem erros nos arquivos alterados.
- Testes do bloco alterado passando (unit/integracao/E2E, conforme impacto).
- Snyk Code Scan nos arquivos novos/alterados.

---

## Estado atual da fase balanca

Direcao da fase:

- Bridge local + resiliencia de conexao.
- Hook e componentes espelhados app/web.
- Integracao no NovoPedido com fallback manual supervisionado.
- Cobertura de testes e evidencias de rollout/rollback.

Plano de execucao recomendado (ordem):

1. Bridge local (endpoints /peso, /peso/estavel, /status, /tara, /portas + reconexao 3s).
2. Hook useBalanca espelhado app/web com polling controlado.
3. BalancaDisplay espelhado app/web com estados canonicos.
4. Integracao no NovoPedido com fallback manual supervisionado.
5. Migracoes + RLS (products, order_items, balanca_config) quando aplicavel.
6. Testes unitarios, integracao, E2E e smoke operacional.

---

## Pendencias ativas (balanca e integracao)

Fonte principal de acompanhamento:

- docs/maquininha/06-matriz-homologacao-tef-balanca.md

Itens pendentes relevantes nesta fase:

- BAL-09, BAL-10, BAL-11, BAL-12 (INT_REAL da balanca)
- INT-02, INT-03 (cenarios integrados balanca + pagamento)
- Telemetria operacional da fase de integracao frontend

Observacao:

- TEF-14/TEF-15 permanecem marcados como Coberto e encerrados no ciclo anterior; nao tratar como pendencia desta continuidade.

---

## Criterio de conclusao desta continuidade

- Feature de balanca funcional por flag EXPO_PUBLIC_FEATURE_BALANCA.
- Sem regressao em fluxos criticos.
- Evidencias de testes e seguranca registradas em docs/balanca.
- Matriz atualizada com status real e evidencias sanitizadas.

---

## Se houver bloqueio

- Sem hardware: usar emulador serial e registrar pendencia de teste real.
- Bridge indisponivel: manter fallback manual e nao bloquear operacao.
- Falha de migration/RLS: interromper deploy, corrigir e revalidar antes de seguir.

---

## Entregaveis esperados ao fim da sessao

1. Lista objetiva de arquivos alterados.
2. Resumo de seguranca (o que foi protegido e como).
3. Resultado dos testes executados.
4. Pendencias da proxima iteracao (se houver).

Se houver conflito entre velocidade e seguranca, priorize seguranca e integridade de dados.
