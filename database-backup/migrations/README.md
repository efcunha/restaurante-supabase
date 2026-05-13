# Migrations — restaurante-supabase

## Arquivos

| Arquivo | Tipo | Data | Descrição |
|---|---|---|---|
| `20260311161100_schema_dump.sql` | Schema completo | 2026-03-11 | DDL de 27 tabelas, funções, índices e RLS do schema `public` |
| `20260311161100_seed_data.sql` | Dados | 2026-03-11 | Dados de referência (produtos, mesas, configurações) |
| `add_atomic_consume_function.sql` | Função | 2026-03-11 | RPC `adicionar_consumo_atomico` — fix de race condition |
| `20260314164000_fix_atomic_consume_function_type_casts.sql` | Correção | 2026-03-14 | Corrige casts do RPC `adicionar_consumo_atomico` (`uuid/date/integer`) |
| `20260314203000_add_unique_open_mesa_index.sql` | Índice | 2026-03-14 | Garante uma única comanda aberta por mesa (company + date + table_number) |
| `20260321120000_create_billing_tables.sql` | Billing | 2026-03-21 | Cria tabelas de cobrança, RLS e RPCs de licença (`subscriptions`, `invoices`, etc.) |
| `20260321130000_add_is_test_to_companies.sql` | Billing | 2026-03-21 | Adiciona `companies.is_test` e bypass de licença para empresa de teste |
| `create_delivery_comanda_number_function.sql` | Função | anterior | Função de controle de número de comanda para delivery |

## Tabelas capturadas (27)

```
agendamentos, app_configurations, app_settings, audit_logs,
cash_movements, cash_registers, clientes, comandas, companies,
daily_statistics, delivery_counters, environments, estoque,
inventory, order_transfers, orders, pagamentos,
partition_maintenance_config, pizza_extras, products, profiles,
query_performance_logs, suppliers, tables
```

## Como restaurar em um novo projeto Supabase

```bash
# 1. Criar projeto no Supabase e obter a DATABASE_URL

# 2. Restaurar schema
psql "$DATABASE_URL" -f migrations/20260311161100_schema_dump.sql

# 3. Restaurar dados de referência
psql "$DATABASE_URL" -f migrations/20260311161100_seed_data.sql

# 4. Aplicar funções extras (se não incluídas no schema)
psql "$DATABASE_URL" -f migrations/add_atomic_consume_function.sql

# 5. Aplicar correções pós-dump
psql "$DATABASE_URL" -f migrations/20260314164000_fix_atomic_consume_function_type_casts.sql
```

Ou via Supabase CLI:
```bash
# Linkar ao novo projeto e aplicar
supabase db push
```

## Como atualizar este dump

```bash
# Schema (DDL)
npx supabase db dump \
  --db-url "postgresql://postgres.SEU_PROJECT_REF:SENHA@aws-0-us-west-2.pooler.supabase.com:5432/postgres" \
  --schema public \
  -f migrations/$(date +%Y%m%d%H%M%S)_schema_dump.sql

# Dados
npx supabase db dump \
  --db-url "postgresql://postgres.SEU_PROJECT_REF:SENHA@aws-0-us-west-2.pooler.supabase.com:5432/postgres" \
  --schema public --data-only \
  -f migrations/$(date +%Y%m%d%H%M%S)_seed_data.sql
```

> ⚠️ **Nota**: A senha pode conter `@` — encode como `%40` na URL.

## Mantendo migrations sempre atualizadas (sem drift)

### Fluxo recomendado (sempre)

1. Crie migration antes de alterar o banco:

```bash
supabase migration new nome_da_mudanca_em_snake_case
```

2. Coloque o SQL no arquivo gerado em `migrations/`.
3. Aplique via fluxo de migration (CLI ou MCP), nunca como SQL solto fora de migration.
4. Faça commit do arquivo de migration no mesmo PR da feature.

### Se precisar rodar SQL manual em produção (emergência)

1. Rode o SQL manual.
2. Crie imediatamente uma migration de reconciliação com o mesmo conteúdo/efeito.
3. Registre a versão no histórico remoto (`supabase_migrations.schema_migrations`) para evitar reexecução futura.
4. Commit e documente no changelog o motivo da execução manual.

### Checklist anti-desalinhamento

- Banco remoto e pasta `migrations/` devem ter as mesmas versões.
- Não editar migration antiga já aplicada; crie uma nova migration incremental.
- Evitar rodar DDL direto no painel SQL sem criar migration correspondente.

## Changelog de migrations críticas

### 2026-03-11 — Fix race condition multi-garçon

**Problema:** Com 4 ou mais garçons simultâneos, o sistema gerava apenas 2 mesas e agrupava itens.

**Causa-raiz (cadeia de 3 bugs):**
1. `getNextComandaNumber` filtrava `status='aberta'` ao buscar o max → recalculava números de comandas fechadas
2. `ensureComandaAberta` filtrava `table_number=mesa` → não encontrava o placeholder reservado (table_number='') → tentativa de INSERT duplicado
3. `adicionarConsumo` usava READ→CALCULATE→WRITE → race condition sobrescrevia totais

**Fixes aplicados:**
- `ComandaNumberService.ts`: ordenação numérica via `reduce+parseInt`, removido filtro de status
- `ComandasService.ts`: busca sem `table_number`, RPC atômica `adicionar_consumo_atomico`, ordenação numérica em `listarComandasAbertas`

**Resultado:** 4 workers simultâneos no Playwright → 4 mesas isoladas ✅

### 2026-03-14 — Fix type mismatch no RPC atômico

**Problema:** o fluxo de pedido funcionava, mas a RPC `adicionar_consumo_atomico` falhava em runtime e caía no fallback `READ→WRITE`.

**Causa-raiz:** a função recebia parâmetros `TEXT`, enquanto a tabela `comandas` usa `company_id UUID`, `date_key DATE` e `comanda_number INTEGER`.

**Fix aplicado:** casts explícitos na função:
- `p_company_id::uuid`
- `p_date_key::date`
- `p_comanda_number::integer`

**Resultado esperado:** o fluxo continua igual para o usuário, mas a atualização do consumo volta a ser realmente atômica e deixa de depender do fallback.

### 2026-03-14 — Proteção definitiva de concorrência por mesa

**Problema:** dois garçons em paralelo ainda podiam abrir comandas diferentes para a mesma mesa por janela de corrida entre o check do frontend e o insert/update.

**Fix aplicado:** índice único parcial no banco:
- `idx_unique_open_mesa` em `(company_id, date_key, btrim(table_number))`
- aplicado apenas quando `status = 'aberta'` e `table_number` não vazio

**Resultado esperado:** o banco passa a bloquear atomicamente a segunda abertura concorrente para a mesma mesa no mesmo dia/empresa.
