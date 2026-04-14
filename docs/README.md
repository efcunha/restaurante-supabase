# Docs Index

Este diretório centraliza a documentação transversal do monorepo.

## Status Atual (2026-04-08)

- Simplificação de UX PDV concluída em app e web.
- Matriz de homologação TEF + balança criada para separar simulador local, mocks automatizados e integração real controlada.
- Deploy do `restaurante-web` concluído no Railway com healthcheck aprovado.
- Build Android `preview` do `restaurante-app` concluído no EAS.
- Gate TypeScript do app reabilitado (`npm run type-check` sem erros).
- Snyk Code Scan executado nos arquivos alterados sem novos issues.
- Smoke E2E web de fluxos críticos executado com sucesso.
- Estudo técnico de integração iFood consolidado em `docs/ifood/`.

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
- `repository/`: documentação estrutural do monorepo e mapas de domínio
- `maquininha/`: arquitetura, fluxos técnicos, contratos, segurança e rollout da integração de pagamento presencial
- `balanca/`: arquitetura, fluxos, contratos, dados, segurança, testes e prompt de inicialização da integração de balança
- `ifood/`: estudo técnico da integração iFood (arquitetura, contratos, dados, segurança, rollout e backlog)
	- onboarding: `docs/ifood/CADASTRO-E-CREDENCIAIS-API.md`

## Ponto de entrada recomendado

1. `docs/design-system/STORYBOOK-FIGMA-SEM-CUSTO.md` para estratégia sem custo de integração Storybook + Figma
2. `docs/design-system/PROMPT-INICIO-STORYBOOK-FIGMA.md` para iniciar sessões de implementação com escopo e critérios de aceite
3. `docs/security/README.md` para temas de segurança e compliance
4. `docs/LGPD/README.md` para temas de privacidade e LGPD
5. `docs/observability/OBSERVABILITY-IMPLEMENTATION-GUIDE.md` para arquitetura e runbooks de observabilidade
6. `docs/repository/DOMAINS.md` para mapa de domínios do monorepo
7. `docs/maquininha/README.md` para especificação técnica consolidada da integração de maquininha
8. `docs/maquininha/06-matriz-homologacao-tef-balanca.md` para execução de homologação TEF + balança com separação entre simulador, mocks e integração real
9. `docs/balanca/README.md` para especificação técnica consolidada da integração de balança
10. `docs/ifood/README.md` para estudo técnico consolidado da integração iFood
11. `docs/ifood/CADASTRO-E-CREDENCIAIS-API.md` para processo de cadastro, habilitação e obtenção de credenciais API no iFood