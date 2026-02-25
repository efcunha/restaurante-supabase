# Migrations SQL - Implementação Delivery, Fiscal e Balança

Este diretório contém todos os scripts SQL necessários para implementar as funcionalidades de Delivery, Gestão Fiscal e Venda por Peso no sistema.

## 📋 Arquivos de Migration

### Scripts de Validação
- **00_validate_prerequisites.sql** - Valida pré-requisitos antes de executar
- **99_validate_migrations.sql** - Valida se tudo foi aplicado corretamente

### Scripts de Migration (executar em ordem)
1. **01_add_delivery_fields.sql** - Adiciona campos para delivery na tabela orders
2. **02_create_entregadores_table.sql** - Cria tabela de entregadores com RLS
3. **03_add_barcode_fields.sql** - Adiciona campos de código de barras e balança em products
4. **04_add_fiscal_fields.sql** - Adiciona campos fiscais em products e cria tabela notas_fiscais
5. **05_create_delivery_functions.sql** - Cria funções auxiliares para delivery
6. **06_create_indexes.sql** - Cria índices para otimização de performance

### Scripts de Automação
- **run_all_migrations.sh** - Script bash para executar todas as migrations (Linux/Mac)
- **run_all_migrations.bat** - Script batch para executar todas as migrations (Windows)

## 🚀 Como Executar

### Opção 1: Script Automatizado (RECOMENDADO)

#### Linux/Mac:
```bash
cd docs/migrations
chmod +x run_all_migrations.sh
./run_all_migrations.sh "postgresql://user:pass@host:port/database"
```

#### Windows:
```cmd
cd docs\migrations
run_all_migrations.bat "postgresql://user:pass@host:port/database"
```

### Opção 2: Via Supabase Dashboard
1. Acesse o Supabase Dashboard
2. Vá em SQL Editor
3. Execute os scripts na ordem (00, 01, 02, 03, 04, 05, 06, 99)
4. Verifique os logs para confirmar sucesso

### Opção 3: Via psql (Manual)
```bash
# Definir variável de ambiente
export DATABASE_URL="postgresql://user:pass@host:port/database"

# Executar em ordem
psql $DATABASE_URL -f 00_validate_prerequisites.sql
psql $DATABASE_URL -f 01_add_delivery_fields.sql
psql $DATABASE_URL -f 02_create_entregadores_table.sql
psql $DATABASE_URL -f 03_add_barcode_fields.sql
psql $DATABASE_URL -f 04_add_fiscal_fields.sql
psql $DATABASE_URL -f 05_create_delivery_functions.sql
psql $DATABASE_URL -f 06_create_indexes.sql
psql $DATABASE_URL -f 99_validate_migrations.sql
```

### Opção 4: Via Supabase CLI
```bash
# Executar todos os scripts
supabase db push

# Ou executar individualmente
supabase db execute --file docs/migrations/01_add_delivery_fields.sql
```

## Rollback

Cada arquivo possui um bloco de comentários no final com os comandos de rollback caso seja necessário reverter as alterações.

## Validação

Após executar todos os scripts, execute:
```sql
-- Verificar se todas as colunas foram criadas
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name IN ('order_source', 'delivery_info', 'delivery_person_id', 'dispatched_at');

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'products' 
AND column_name IN ('barcode', 'pdv_code', 'sold_by_weight', 'ncm', 'cfop', 'tax_rate');

-- Verificar se a tabela entregadores foi criada
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'entregadores'
);
```

## ⚠️ Notas Importantes

### Antes de Executar
- 🔒 **FAÇA BACKUP DO BANCO** antes de executar em produção
- 🧪 Execute primeiro em ambiente de **desenvolvimento/staging**
- 📊 Verifique se há espaço suficiente no banco de dados
- 👥 Certifique-se de ter permissões de superuser ou owner

### Durante a Execução
- ⏱️ Tempo estimado: 2-5 minutos (dependendo do tamanho do banco)
- 🔄 Todos os scripts são **idempotentes** (podem ser executados múltiplas vezes)
- 🛡️ RLS policies serão aplicadas automaticamente nas novas tabelas
- 📝 Logs detalhados serão exibidos durante a execução

### Após a Execução
- ✅ Execute o script de validação (99_validate_migrations.sql)
- 📊 Verifique as estatísticas das tabelas com `ANALYZE`
- 🔍 Teste as novas funcionalidades em ambiente de staging
- 📱 Atualize o app mobile com as novas dependências


## 📊 Estrutura das Novas Tabelas

### Tabela: entregadores
```sql
- id (UUID, PK)
- company_id (UUID, FK → companies)
- name (TEXT)
- phone (TEXT)
- cpf (TEXT)
- vehicle_type (TEXT: moto, carro, bicicleta, a_pe)
- vehicle_plate (TEXT)
- active (BOOLEAN)
- max_deliveries_per_day (INTEGER)
- current_deliveries_today (INTEGER)
- rating (NUMERIC 0-5)
- total_deliveries (INTEGER)
- created_at, updated_at (TIMESTAMPTZ)
```

### Tabela: notas_fiscais
```sql
- id (UUID, PK)
- company_id (UUID, FK → companies)
- order_id (UUID, FK → orders)
- numero_nota (TEXT)
- serie (TEXT)
- chave_acesso (TEXT, UNIQUE)
- tipo (TEXT: nfce, nfe, nfse)
- status (TEXT: processando, autorizada, cancelada, rejeitada)
- valor_total, valor_produtos, valor_impostos (NUMERIC)
- cpf_cnpj_cliente, nome_cliente (TEXT)
- xml_nota, pdf_url, qrcode_url (TEXT)
- protocolo_autorizacao (TEXT)
- data_emissao, data_autorizacao (TIMESTAMPTZ)
- api_provider (TEXT)
- api_response (JSONB)
- created_at, updated_at (TIMESTAMPTZ)
```

## 🔧 Novas Funções Disponíveis

### Delivery
- `dispatch_order(order_id, delivery_person_id, dispatched_by)` - Despacha pedido
- `calculate_delivery_fee(distance_km, company_id)` - Calcula taxa de entrega
- `get_available_delivery_persons(company_id)` - Lista entregadores disponíveis
- `get_delivery_stats(company_id, date_start, date_end)` - Estatísticas de delivery

### Balança
- `validate_ean13(barcode)` - Valida código de barras EAN-13
- `decode_weight_barcode(barcode)` - Decodifica código de balança (formato 2AAAAAVVVVVVJ)

## 🔍 Troubleshooting

### Erro: "Tabela orders não existe"
Execute o schema base do projeto primeiro antes das migrations.

### Erro: "Função get_my_company_id não existe"
Certifique-se de que o schema base com RLS foi aplicado.

### Erro: "Permission denied"
Você precisa de permissões de superuser ou owner do banco.

### Erro: "Extension uuid-ossp not found"
Execute: `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`

### Script trava ou demora muito
- Verifique se há locks nas tabelas: `SELECT * FROM pg_locks WHERE NOT granted;`
- Verifique processos ativos: `SELECT * FROM pg_stat_activity;`

## 📞 Suporte

Em caso de problemas:
1. Verifique os logs de erro detalhados
2. Execute o script de validação (00_validate_prerequisites.sql)
3. Consulte a documentação do Supabase
4. Revise o estudo técnico em `docs/estudo_tecnico.md`
