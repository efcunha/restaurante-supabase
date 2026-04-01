# SKILL.md Completeness Validation (Mar 30, 2026)

## Status Geral
✓ **COMPLETO** — Arquivo `.github/skills/restaurante-supabase/SKILL.md` contém **322 linhas**, sem truncamento.

## Índice de Conteúdo Completo
- ✓ Frontmatter YAML (name, description)
- ✓ Seção "Objetivo" (6 pontos)
- ✓ Seção "Contexto Rápido" (com tecnologias stack)
- ✓ Seção "Política de Ambiente"
- ✓ Stack Principal (React 19, React Native versions, TypeScript, Supabase)
- ✓ Arquivos de Referência (espelhados app/web, banco de dados, segurança/LGPD, ops)
- ✓ Regras Inegociáveis (7 regras críticas)
- ✓ Padrões de Arquitetura
- ✓ Canary Rollout (Phase 12) — flags de UI e sequência de rollout
- ✓ Domínio e Integridade — invariantes e conceitos-chave
- ✓ Banco de Dados (funções/índices críticos, migração de referência, runbook de remuneração)
- ✓ Segurança e LGPD (consolidação Mar/2026)
  - ✓ Auditoria consolidada (5 arquivos de documentação)
  - ✓ Hardening de segredos em scripts
  - ✓ Hardening de `public.profiles`
  - ✓ Compatibilidade app/web
  - ✓ Consolidação operacional (CORS, E2E secrets, rate limiting, validação produção)
- ✓ Activepieces (pagamento delivery)
  - ✓ Referências de projeto e flow
  - ✓ Lições críticas
  - ✓ Runbook curto
- ✓ Aprendizados Operacionais Recentes (Mar/2026) — 15 pontos
- ✓ Fluxo de Trabalho Recomendado
- ✓ Modo de Atuação: Desenvolvedor Full Stack Senior
  - ✓ Diagnóstico
  - ✓ Estratégia de implementação
  - ✓ Validação e entrega
- ✓ Comandos Úteis (desenvolvimento, testes, E2E, canary, drift, CI/CD)
- ✓ Maestro E2E (app nativo)
  - ✓ Flows ativos
  - ✓ Quando usar Maestro vs Playwright
  - ✓ Execução básica
  - ✓ Bloqueador conhecido (Mar 28, 2026)
- ✓ Checklist para o Copilot (6 pontos)

## Linhas Truncadas em copilot-instructions.md
O arquivo `copilot-instructions.md` exibe resumos (snapshots) de segurança/LGPD com linhas truncadas **propositalmente** para brevidade na orquestração. Conteúdo completo está em:
- `.github/skills/restaurante-supabase/SKILL.md` (SKILL primária — **complete**)
- `docs/security/SECURITY_AUDIT_REPORT_2026-03-23.md`
- `docs/security/REMEDIATION_PLAN_DETAILED.md`
- `docs/LGPD/LGPD-COMPLIANCE-GUIDE.md`
- `docs/security/EXECUTIVE_SUMMARY_PT.md`
- `docs/security/SECURITY_DOCUMENTATION_INDEX.md`

## Validação de Conteúdo Crítico

### Segurança (seção completa no SKILL.md)
```
## Seguranca e LGPD (Mar/2026)
Implementacoes ja aplicadas:
- Auditoria consolidada em:
	- `docs/security/SECURITY_AUDIT_REPORT_2026-03-23.md`
	- `docs/security/REMEDIATION_PLAN_DETAILED.md`
  - `docs/LGPD/LGPD-COMPLIANCE-GUIDE.md`
	- `docs/security/EXECUTIVE_SUMMARY_PT.md`
	- `docs/security/SECURITY_DOCUMENTATION_INDEX.md`
- Hardening de segredos em scripts de backup/restore/deploy
- Hardening de `public.profiles` aplicado remoto
- Compatibilidade app/web atualizada para aliases de papel
- Consolidacao operacional (2026-03-24)
  - CORS endurecido nas Edge Functions
  - Chaves/URLs hardcoded removidas de testes E2E
  - Rate limiting do `restaurante-ops` endurecido
  - Validacao em producao concluida para login
  - Billing ainda nao live em producao
[... conteúdo completo continua ...]
```

### LGPD (referenciado mas detalhe em docs/)
- Retenção de dados: `docs/LGPD/LGPD-DATA-RETENTION-POLICY.md`
- DSAR Operacional: `docs/LGPD/LGPD-DSAR-OPERATIONAL-GUIDE.md`
- Privacidade: `docs/LGPD/LGPD-PRIVACY-NOTICE.md`
- Compliance Guide: `docs/LGPD/LGPD-COMPLIANCE-GUIDE.md` (executive)

### Integridade de Banco de Dados
```
Funcoes/indices criticos:
- `get_next_delivery_comanda_number(company_id, env)`
- `adicionar_consumo_atomico(...)`
- `idx_unique_open_mesa`
- `can_manage_company_profiles(target_company_id)`
- `can_self_update_profile(...)`

Migracoes de referencia (todas presentes em database-backup/migrations/):
- 20260311161100_schema_dump.sql
- 20260314164000_fix_atomic_consume_function_type_casts.sql
- 20260314203000_add_unique_open_mesa_index.sql
- 20260322170000_create_reconcile_billing_event_atomic_function.sql
- 20260323183000_harden_profiles_rls_and_role_guardrails.sql
- 20260328175830_product_adicionais.sql
- 20260329113000_normalize_product_adicionais_category_constraints.sql
- 20260329140000_fix_adicionais_unico_null_and_trigger.sql
[... migrations continuam ...]
```

## Conclusão
**✓ Arquivo SKILL.md está completo, sem truncamento, e todas as seções críticas (segurança, LGPD, banco de dados) estão presentes.**

Para referências de detalhe, navegar pelos links em "Arquivos de Referência" ou consultar diretamente `docs/security/` e `database-backup/migrations/`.
