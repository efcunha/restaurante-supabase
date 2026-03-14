# Migrations — restaurante-supabase

## Arquivos

| Arquivo | Tipo | Data | Descrição |
|---|---|---|---|
| `20260311161100_schema_dump.sql` | Schema completo | 2026-03-11 | DDL de 27 tabelas, funções, índices e RLS do schema `public` |
| `20260311161100_seed_data.sql` | Dados | 2026-03-11 | Dados de referência (produtos, mesas, configurações) |
| `add_atomic_consume_function.sql` | Função | 2026-03-11 | RPC `adicionar_consumo_atomico` — fix de race condition |
| `20260314164000_fix_atomic_consume_function_type_casts.sql` | Correção | 2026-03-14 | Corrige casts do RPC `adicionar_consumo_atomico` (`uuid/date/integer`) |
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
