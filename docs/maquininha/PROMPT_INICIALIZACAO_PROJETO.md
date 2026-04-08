# PROMPT DE INICIALIZACAO - Projeto Maquininha

Use este prompt em outro dia para iniciar a implementacao tecnica da integracao de maquininha no restaurante-supabase.

> **Uso correto:** este documento serve para bootstrap/arranque de uma iniciativa do zero.
>
> Para continuar o estado atual do projeto, usar preferencialmente:
> - `docs/PROMPT_CONTINUACAO_DIA_SEGUINTE.md`
> - `docs/maquininha/06-matriz-homologacao-tef-balanca.md`
>
> Isso evita retomar a feature por um plano inicial que ja nao reflete integralmente o momento atual.

---

## Prompt pronto para uso

Voce vai atuar como Desenvolvedor Full Stack Senior no monorepo restaurante-supabase.

Contexto obrigatorio:

- Ler docs/maquininha/prompt-hyperswitch-restaurante.md integralmente.
- Ler docs/maquininha/README.md e todos os documentos da pasta docs/maquininha.
- Respeitar guardrails: multi-tenant por company_id, RLS, sem hardcode de secrets, LGPD e rollout por feature flag.

Objetivo da sessao:

Implementar a integracao de pagamento presencial (card present) via Hyperswitch por fases, sem quebrar fluxos legados de pagamento.

Ordem de execucao obrigatoria:

1. Validar arquitetura alvo e contratos entre web, ops, gateway e Supabase.
2. Implementar endpoints no restaurante-ops para iniciar pagamento e consultar status.
3. Implementar webhook idempotente de atualizacao de status.
4. Implementar camada de services e hooks no restaurante-web para consumir os endpoints.
5. Integrar UI de pagamento no fluxo existente com feature flag.
6. Implementar migracoes planejadas (configuracao de gateway e transacoes).
7. Validar RLS e isolamento por company_id nas tabelas novas.
8. Implementar testes unitarios e E2E dos fluxos criticos.
9. Executar smoke test controlado de seguranca, erros e observabilidade.
10. Executar rollout progressivo por waves e manter plano de rollback imediato.

Entregaveis minimos da sessao:

- Codigo implementado por camadas com tipagem estrita.
- Migracoes criadas, aplicadas e verificadas.
- Testes criticos passando.
- Evidencias de seguranca e observabilidade.
- Atualizacao da documentacao tecnica em docs/maquininha.

Checklist de aceite:

- Nenhum secret hardcoded.
- Sem uso de EXPO_PUBLIC para credenciais sensiveis.
- Isolamento multi-tenant preservado.
- Fluxo legado de pagamento sem regressao.
- Feature flag funcional para desligar toda UX de maquininha.

Se houver conflito entre velocidade e seguranca, priorize seguranca e integridade de dados.

---

## Notas de uso

- Este documento e operacional: pensado para iniciar sprint tecnica futura.
- O detalhamento arquitetural e de fluxos permanece em docs/maquininha/.
- Para continuidade do estado atual, o ponto de entrada oficial passou a ser `docs/PROMPT_CONTINUACAO_DIA_SEGUINTE.md`.
