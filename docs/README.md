# Docs Index

Este diretório centraliza a documentação transversal do monorepo.

## Status Atual (2026-04-08)

- Simplificação de UX PDV concluída em app e web.
- Deploy do `restaurante-web` concluído no Railway com healthcheck aprovado.
- Build Android `preview` do `restaurante-app` concluído no EAS.
- Gate TypeScript do app reabilitado (`npm run type-check` sem erros).
- Snyk Code Scan executado nos arquivos alterados sem novos issues.
- Smoke E2E web de fluxos críticos executado com sucesso.

## Continuidade recomendada

1. `docs/PROMPT_CONTINUACAO_DIA_SEGUINTE.md`
2. `docs/maquininha/04-plano-execucao-testes-rollout.md`
3. `docs/maquininha/README.md`

## Estrutura

- `observability/`: guias, prompt, runbook e SQL de referência da observabilidade centralizada
- `security/`: auditoria, remediação e documentação de segurança
- `LGPD/`: documentação consolidada de privacidade e compliance LGPD
- `repository/`: documentação estrutural do monorepo e mapas de domínio
- `maquininha/`: arquitetura, fluxos técnicos, contratos, segurança e rollout da integração de pagamento presencial
- `balanca/`: arquitetura, fluxos, contratos, dados, segurança, testes e prompt de inicialização da integração de balança

## Ponto de entrada recomendado

1. `docs/security/README.md` para temas de segurança e compliance
2. `docs/LGPD/README.md` para temas de privacidade e LGPD
3. `docs/observability/OBSERVABILITY-IMPLEMENTATION-GUIDE.md` para arquitetura e runbooks de observabilidade
4. `docs/repository/DOMAINS.md` para mapa de domínios do monorepo
5. `docs/maquininha/README.md` para especificação técnica consolidada da integração de maquininha
6. `docs/balanca/README.md` para especificação técnica consolidada da integração de balança