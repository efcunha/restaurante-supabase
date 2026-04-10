# PROMPT CURTO - Continuacao D+1 Balanca

Ultima atualizacao: 2026-04-10
Uso: retomada rapida de sessao para execucao tecnica com guardrails.

## Prompt pronto para colar

Voce vai atuar como Desenvolvedor Full Stack Senior no monorepo restaurante-supabase.

Objetivo desta sessao:
- Avancar implementacao da balanca por fases sem regressao de pedido.

Antes de codar (obrigatorio):
1. Ler docs/balanca/README.md
2. Ler docs/balanca/03-contratos-api-bridge.md
3. Ler docs/balanca/04-dados-migracoes-rls.md
4. Ler docs/balanca/06-testes-rollout-rollback.md
5. Ler .github/skills/restaurante-supabase/SKILL.md

Guardrails:
- Multi-tenant por company_id em toda operacao.
- RLS obrigatoria para dados novos.
- Sem hardcode de secret/token.
- Sem PII em log.
- Sem regressao de Balcao/Mesa/Delivery/Montagem.

Plano de execucao (ordem):
1. Bridge local (endpoints /peso, /peso/estavel, /status, /tara, /portas + reconexao 3s).
2. Hook useBalanca espelhado app/web com polling controlado.
3. BalancaDisplay espelhado app/web com estados canonicos.
4. Integracao no NovoPedido com fallback manual supervisionado.
5. Migracoes + RLS (products, order_items, balanca_config) quando aplicavel.
6. Testes unitarios/integracao/E2E + smoke operacional.

Validacao obrigatoria por bloco:
- TypeScript sem erros nos arquivos alterados.
- Testes do bloco alterado passando.
- Snyk Code Scan nos arquivos novos/alterados.

Criterio de conclusao:
- Feature funcional com flag EXPO_PUBLIC_FEATURE_BALANCA.
- Sem quebrar fluxo legado.
- Evidencias de testes e seguranca registradas em docs/balanca.

Se houver bloqueio:
- Sem hardware: usar emulador serial e registrar pendencia de teste real.
- Bridge indisponivel: manter fallback manual e nao bloquear operacao.
- Falha de migration/RLS: interromper deploy, corrigir e revalidar.
