# PROMPT DE INICIALIZACAO - Projeto Balanca

Use este prompt para retomar a implementacao da balanca em outro dia, com contexto atualizado e foco em execucao segura.

Ultima atualizacao: 2026-04-10

---

## Prompt pronto para uso

Voce vai atuar como Desenvolvedor Full Stack Senior no monorepo restaurante-supabase.

### Regras obrigatorias antes de qualquer alteracao

1. Ler integralmente:
- docs/balanca/README.md
- docs/balanca/01-arquitetura-tecnica-camadas.md
- docs/balanca/02-fluxos-tecnicos-desenvolvimento.md
- docs/balanca/03-contratos-api-bridge.md
- docs/balanca/04-dados-migracoes-rls.md
- docs/balanca/05-seguranca-lgpd-observabilidade.md
- docs/balanca/06-testes-rollout-rollback.md
- docs/balanca/BALANCA_IMPL_PROMPT.md
- .github/skills/restaurante-supabase/SKILL.md

2. Guardrails inegociaveis:
- Multi-tenant por company_id em toda leitura/escrita.
- RLS obrigatoria para qualquer dado novo.
- Sem hardcode de secrets/tokens/chaves.
- Sem PII em claro em logs (LGPD).
- Sem regressao dos fluxos criticos (Balcao, Mesa, Delivery, Montagem).

3. Validacoes obrigatorias no fim de cada bloco implementado:
- TypeScript sem erros nos arquivos alterados.
- Testes unitarios e/ou E2E do bloco alterado.
- Snyk Code Scan nos arquivos novos/alterados.

### Estado atual consolidado

- A documentacao de balanca esta consolidada e tecnicamente coerente para inicio.
- Escopo ainda e majoritariamente de arquitetura/planejamento; nao ha fechamento de execucao ponta-a-ponta registrado nesta pasta.
- O prompt operacional anterior era valido, mas generico. Este prompt prioriza retomada por fases com evidencia.

### Objetivo desta sessao

Implementar a feature de balanca por fases, sem quebrar o fluxo legado de pedido, com rollout controlado por feature flag.

### Ordem de execucao obrigatoria

1. Validar contratos do bridge e parser (PRT1/PRT2/PRT3).
2. Implementar bridge local com reconexao automatica (3s) e endpoints padronizados.
3. Implementar hook useBalanca espelhado app/web com polling controlado.
4. Implementar BalancaDisplay espelhado app/web com estados canonicos.
5. Integrar no fluxo de NovoPedido com fallback manual supervisionado.
6. Implementar migracoes (products, order_items, balanca_config) e RLS.
7. Implementar servico de configuracao por empresa (company_id + role).
8. Cobrir testes unitarios, integracao e E2E com bridge mockado.
9. Rodar smoke operacional controlado (bridge real ou emulador serial).
10. Preparar rollout em waves e plano de rollback.

### Entregaveis minimos da sessao

- Codigo por camadas com tipagem estrita.
- Migracoes criadas, aplicadas e validadas.
- RLS validada remotamente (quando houver novo objeto de dados).
- Testes criticos passando com evidencia.
- Documentacao atualizada em docs/balanca/.

### Checklist de aceite

- Nenhum secret hardcoded.
- Sem uso de EXPO_PUBLIC para segredo.
- Isolamento multi-tenant preservado.
- Fluxo legado de pedido sem regressao.
- Feature flag EXPO_PUBLIC_FEATURE_BALANCA funcional para desligar UX.
- Polling sempre encerrado ao fechar fluxo de pesagem.

### Se houver bloqueio

- Sem hardware disponivel: validar com emulador serial e registrar bloqueio para teste final com dispositivo real.
- Bridge indisponivel: preservar fallback manual no pedido e nao bloquear operacao.
- Falha de RLS/migration: parar deploy, corrigir policy/schema e revalidar antes de prosseguir.

Se houver conflito entre velocidade e seguranca, priorize seguranca e integridade de dados.

---

## Notas de uso

- Este documento e operacional para retomada D+1.
- O detalhamento arquitetural e de contratos permanece nos arquivos 01-06 desta pasta.
- Para retomada expressa de plantao, usar: docs/balanca/PROMPT_CONTINUACAO_D1_BALANCA_CURTO.md
