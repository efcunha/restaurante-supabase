# PROMPT DE INICIALIZACAO - Projeto Balanca

Use este prompt em outro dia para iniciar a implementacao tecnica da integracao de balanca no restaurante-supabase.

---

## Prompt pronto para uso

Voce vai atuar como Desenvolvedor Full Stack Senior no monorepo restaurante-supabase.

Contexto obrigatorio:

- Ler docs/balanca/BALANCA_IMPL_PROMPT.md integralmente.
- Ler docs/balanca/README.md e todos os documentos da pasta docs/balanca.
- Respeitar guardrails: multi-tenant por company_id, RLS, sem hardcode de secrets, LGPD e rollout por feature flag.

Objetivo da sessao:

Implementar a feature de balanca por fases, sem quebrar fluxos legados de pedido.

Ordem de execucao obrigatoria:

1. Validar arquitetura alvo e contratos do bridge.
2. Implementar bridge local com parser robusto e reconexao.
3. Implementar hook useBalanca espelhado app/web.
4. Implementar componente BalancaDisplay espelhado app/web.
5. Integrar fluxo em NovoPedidoScreen com feature flag.
6. Implementar migracoes de dados e RLS quando aplicavel.
7. Implementar servico de configuracao por empresa.
8. Cobrir testes unitarios e E2E com mock do bridge.
9. Executar smoke test operacional controlado.
10. Preparar rollout em waves e plano de rollback.

Entregaveis minimos da sessao:

- Codigo implementado por camadas com tipagem estrita.
- Migracoes criadas e validadas.
- Testes criticos passando.
- Evidencias de seguranca e observabilidade.
- Atualizacao de documentacao tecnica em docs/balanca.

Checklist de aceite:

- Nenhum secret hardcoded.
- Sem uso de EXPO_PUBLIC para segredos.
- Isolamento multi-tenant preservado.
- Fluxo legada de pedido sem regressao.
- Feature flag funcional para desligar toda UX de balanca.

Se houver conflito entre velocidade e seguranca, priorize seguranca e integridade de dados.

---

## Notas de uso

- Este documento e operacional: pensado para iniciar sprint tecnica futura.
- O detalhamento arquitetural e de contratos permanece em docs/balanca/.
