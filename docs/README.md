# Docs Index

Este diretório centraliza a documentação transversal do monorepo.

## Status Atual (2026-04-13)

- Simplificação de UX PDV concluída em app e web.
- Matriz de homologação TEF + balança criada para separar simulador local, mocks automatizados e integração real controlada.
- Fluxo self-service por balança implementado de forma aditiva e sob feature flag no web.
- Binding de dispositivos por terminal (`pos_device_bindings`) implementado no banco para TEF, balança e impressora.
- Deploy do `restaurante-web` concluído no Railway com healthcheck aprovado.
- Build Android `preview` do `restaurante-app` concluído no EAS.
- Gate TypeScript do app reabilitado (`npm run type-check` sem erros).
- Snyk Code Scan executado nos arquivos alterados sem novos issues.
- Smoke E2E web de fluxos críticos executado com sucesso.
- Estudo técnico de integração iFood consolidado em `docs/ifood/`.
- SDD consolidado e atualizado para versão 1.2 com snapshot de arquitetura em 2026-04-13.

## Continuidade recomendada

1. `docs/PROMPT_CONTINUACAO_DIA_SEGUINTE.md`
2. `docs/maquininha/04-plano-execucao-testes-rollout.md`
3. `docs/maquininha/06-matriz-homologacao-tef-balanca.md`
4. `docs/maquininha/README.md`
5. `docs/maquininha/17-plano-fechamento-int-real-balanca-tef.md`
6. `docs/maquininha/18-checklist-operacional-int-real-t0-t1-t2.md`
7. `docs/maquininha/18-checklist-operacional-int-real-t0-t1-t2.turno-2026-04-14.md`
8. `docs/repository/HANDOFF_D1_POS_DEVICE_BINDINGS_2026-04-14.md`
9. `docs/repository/PR_DESCRIPTION_POS_DEVICE_BINDINGS_2026-04-14.md`
10. `docs/repository/PARECER_PRODUCAO_POS_DEVICE_BINDINGS_2026-04-14.md`
11. `docs/balanca/08-runbook-recuperacao-bridge-bloqueio-t0.md`

## Estrutura

- `design-system/`: guias de integração Figma + código, node map e prompts de implementação
- `observability/`: guias, prompt, runbook e SQL de referência da observabilidade centralizada
- `security/`: auditoria, remediação e documentação de segurança
- `LGPD/`: documentação consolidada de privacidade e compliance LGPD
- `repository/`: documentação estrutural do monorepo, mapas de domínio e runbook de automação de formulários
- `forms/`: arquivos de request, aprovação e guias para automação semi-automática segura de formulários
- `maquininha/`: arquitetura, fluxos técnicos, contratos, segurança e rollout da integração de pagamento presencial
- `balanca/`: arquitetura, fluxos, contratos, dados, segurança, testes e prompt de inicialização da integração de balança
- `ifood/`: estudo técnico da integração iFood (arquitetura, contratos, dados, segurança, rollout e backlog)
	- onboarding: `docs/ifood/CADASTRO-E-CREDENCIAIS-API.md`

## Ponto de entrada recomendado

1. `docs/design-system/STORYBOOK-FIGMA-SEM-CUSTO.md` para estratégia sem custo de integração Storybook + Figma
2. `docs/design-system/PROMPT-INICIO-STORYBOOK-FIGMA.md` para iniciar sessões de implementação com escopo e critérios de aceite
3. `docs/design-system/STORYBOOK_OPERATIONS_GUIDE.md` para operação, deploy, smoke e troubleshooting do Storybook público
4. `docs/security/README.md` para temas de segurança e compliance
5. `docs/LGPD/README.md` para temas de privacidade e LGPD
6. `docs/observability/OBSERVABILITY-IMPLEMENTATION-GUIDE.md` para arquitetura e runbooks de observabilidade
7. `docs/repository/DOMAINS.md` para mapa de domínios do monorepo
8. `docs/forms/README.md` para índice de automação semi-automática segura de formulários (arquivos de request, casos de uso, workflow)
9. `docs/repository/FORM_AUTOMATION_SEMI_AUTO_RUNBOOK.md` para execução segura da automação assistida de formulários
10. `docs/maquininha/README.md` para especificação técnica consolidada da integração de maquininha
11. `docs/maquininha/06-matriz-homologacao-tef-balanca.md` para execução de homologação TEF + balança com separação entre simulador, mocks e integração real
12. `docs/balanca/README.md` para especificação técnica consolidada da integração de balança
13. `docs/ifood/README.md` para estudo técnico consolidado da integração iFood
14. `docs/ifood/CADASTRO-E-CREDENCIAIS-API.md` para processo de cadastro, habilitação e obtenção de credenciais API no iFood