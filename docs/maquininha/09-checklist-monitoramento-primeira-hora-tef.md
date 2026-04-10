# 09 - Checklist de monitoramento da primeira hora (TEF)

Data: 2026-04-10
Escopo: monitoramento inicial apos ativacao de TEF em producao.

## 1. Dados de controle

- Inicio da janela:
- Fim da janela:
- Responsavel:
- Tenant(s) observados:

## 2. Saude operacional (a cada 10 minutos)

- [ ] `GET /healthz` respondeu HTTP 200 em todos os checkpoints
- [ ] `GET /api/status` respondeu HTTP 200 em todos os checkpoints
- [ ] Nao houve indisponibilidade prolongada do `restaurante-ops`

## 3. Fluxo TEF (amostra controlada)

- [ ] Iniciacao de pagamento respondeu sem erro de configuracao
- [ ] Polling/status retornou transicoes coerentes
- [ ] Nao houve falso sucesso em caso de falha
- [ ] Nao houve duplicidade indevida por idempotencia

## 4. Seguranca e isolamento

- [ ] Sem vazamento de segredo/token em logs e evidencias
- [ ] `company_id` preservado no comportamento observado
- [ ] Sem indicio de acesso cruzado entre tenants

## 5. Decisao ao final da primeira hora

- [ ] Operacao estavel, manter TEF ativo
- [ ] Desvio relevante detectado, iniciar rollback imediato

## 6. Registro de incidentes (se houver)

Para cada incidente:

- Horario:
- Sintoma:
- Impacto:
- Acao imediata:
- Resultado:
- Proximo passo:
