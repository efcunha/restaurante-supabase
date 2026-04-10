# Prompt de Continuacao - Turno da Tarde (TEF-14/TEF-15)

Ultima atualizacao: 2026-04-10
Escopo desta retomada: finalizar deploy e validacao INT_REAL de TEF-14/TEF-15 com evidencias.

## Prompt pronto para colar na nova sessao

Voce vai atuar como Desenvolvedor Full Stack Senior no monorepo restaurante-supabase.

Objetivo desta sessao:
1. Confirmar deploy do restaurante-ops com as validacoes TEF-15.
2. Executar validacao INT_REAL de TEF-14/TEF-15 usando suite API-direct.
3. Coletar evidencias e atualizar matriz documental.

Regras obrigatorias:
- Respeitar .github/skills/restaurante-supabase/SKILL.md.
- Preservar isolamento multi-tenant por company_id.
- Nao hardcodar secrets/tokens.
- Nao expor PII em logs/evidencias.
- Nao regressar fluxos criticos (Balcao, Mesa, Delivery, Montagem).

Estado atual confirmado:
- Backend pronto: restaurante-ops/src/modules/payment-gateway.ts com validateComandaAndBalance() integrada antes da idempotencia.
- Suite pronta: restaurante-web/e2e/pdv-maquininha-validacao.spec.ts (API-direct, sem login por UI).
- Scripts prontos:
  - restaurante-web/package.json: test:e2e:pdv-validacao:int-real:prod-web
  - restaurante-web/package.json: test:e2e:pdv-validacao:int-real:tef14:prod-web
  - restaurante-web/package.json: test:e2e:pdv-validacao:int-real:tef15:prod-web
  - restaurante-web/scripts/run-tef14-15-tests.sh
- Documentos atualizados:
  - docs/maquininha/RESUMO_SESSAO_TEF14-15_2026-04-10.md
  - docs/maquininha/07-deployment-tef14-tef15.md
  - docs/maquininha/06-matriz-homologacao-tef-balanca.md
  - docs/PROMPT_CONTINUACAO_DIA_SEGUINTE.md

Tarefas em ordem:
1. Deploy ops:
   - railway up --service restaurante-ops --path-as-root ./restaurante-ops
   - Fallback: deploy manual no Railway Dashboard se CLI falhar.
2. Validar healthcheck:
   - GET https://ops.restaurante-web.app.br/health
3. Executar testes INT_REAL com credenciais reais:
   - cd restaurante-web
   - bash scripts/run-tef14-15-tests.sh --token "<bearer>" --company "<company_uuid>" --comanda "999" --all
4. Registrar evidencia no output:
   - TEF-14: duas chamadas com mesma idempotencyKey retornam mesmo transactionId
   - TEF-15a: comanda invalida retorna HTTP 400
   - TEF-15b: saldo insuficiente retorna HTTP 400
5. Atualizar status documental para Coberto:
   - docs/maquininha/06-matriz-homologacao-tef-balanca.md (TEF-14 e TEF-15)
   - docs/maquininha/04-plano-execucao-testes-rollout.md (se aplicavel)

Criterio de conclusao desta retomada:
- Deploy realizado.
- 3 testes de validacao INT_REAL executados com evidencia.
- Matriz atualizada com status Coberto e evidencias.
- Sem regressao de seguranca (RLS, company_id, sem secrets em codigo/log).

Se houver bloqueio por credenciais/token:
- Nao alterar codigo de negocio.
- Documentar bloqueio, causa e tentativa realizada.
- Deixar comando pronto para reexecucao com credenciais validas.
