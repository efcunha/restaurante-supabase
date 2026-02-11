# Índice de Documentação - Migrations

Guia rápido para navegar pela documentação das migrations.

## 📚 Documentação Principal

| Arquivo | Descrição | Quando Usar |
|---------|-----------|-------------|
| [README.md](README.md) | Guia principal de instalação e execução | Primeira leitura obrigatória |
| [EXAMPLES.md](EXAMPLES.md) | Exemplos práticos de uso das novas funcionalidades | Após instalar as migrations |
| [CHANGELOG.md](CHANGELOG.md) | Histórico de alterações e roadmap | Para entender o que foi implementado |
| [INDEX.md](INDEX.md) | Este arquivo - índice de navegação | Para encontrar documentação específica |

## 🗂️ Scripts SQL por Categoria

### Validação
- `00_validate_prerequisites.sql` - Validar antes de executar
- `99_validate_migrations.sql` - Validar após executar

### Delivery
- `01_add_delivery_fields.sql` - Campos de delivery em orders
- `02_create_entregadores_table.sql` - Tabela de entregadores
- `05_create_delivery_functions.sql` - Funções de delivery

### Balança
- `03_add_barcode_fields.sql` - Campos de código de barras

### Fiscal
- `04_add_fiscal_fields.sql` - Campos fiscais e tabela de notas

### Performance
- `06_create_indexes.sql` - Índices de otimização

### Automação
- `run_all_migrations.sh` - Script Linux/Mac
- `run_all_migrations.bat` - Script Windows

## 🎯 Guias Rápidos

### Instalação Rápida
```bash
# Linux/Mac
cd docs/migrations
chmod +x run_all_migrations.sh
./run_all_migrations.sh "postgresql://..."

# Windows
cd docs\migrations
run_all_migrations.bat "postgresql://..."
```

### Consultas Mais Comuns

#### Delivery
- [Criar pedido delivery](EXAMPLES.md#criar-um-pedido-delivery)
- [Despachar pedido](EXAMPLES.md#despachar-um-pedido)
- [Listar entregadores](EXAMPLES.md#buscar-entregadores-disponíveis)
- [Estatísticas](EXAMPLES.md#estatísticas-de-delivery)

#### Balança
- [Cadastrar produto com código de barras](EXAMPLES.md#cadastrar-produto-com-código-de-barras)
- [Validar código EAN-13](EXAMPLES.md#validar-código-de-barras-ean-13)
- [Decodificar código de balança](EXAMPLES.md#decodificar-código-de-balança)

#### Fiscal
- [Cadastrar informações fiscais](EXAMPLES.md#cadastrar-informações-fiscais-do-produto)
- [Registrar NFC-e](EXAMPLES.md#registrar-emissão-de-nfc-e)
- [Buscar notas fiscais](EXAMPLES.md#buscar-notas-fiscais-do-dia)

## 🔍 Busca por Tópico

### Tabelas
- **orders** → `01_add_delivery_fields.sql`
- **products** → `03_add_barcode_fields.sql`, `04_add_fiscal_fields.sql`
- **entregadores** → `02_create_entregadores_table.sql`
- **notas_fiscais** → `04_add_fiscal_fields.sql`

### Funções
- **dispatch_order** → `05_create_delivery_functions.sql`
- **calculate_delivery_fee** → `05_create_delivery_functions.sql`
- **validate_ean13** → `03_add_barcode_fields.sql`
- **decode_weight_barcode** → `03_add_barcode_fields.sql`

### Índices
- Todos os índices → `06_create_indexes.sql`
- Índices específicos por tabela → Ver comentários em cada migration

### RLS Policies
- **entregadores** → `02_create_entregadores_table.sql`
- **notas_fiscais** → `04_add_fiscal_fields.sql`

## 🐛 Troubleshooting

| Problema | Solução | Arquivo |
|----------|---------|---------|
| Tabela não existe | Execute schema base primeiro | [README.md](README.md#troubleshooting) |
| Função RLS não existe | Verifique pré-requisitos | `00_validate_prerequisites.sql` |
| Erro de permissão | Precisa de superuser/owner | [README.md](README.md#troubleshooting) |
| Script trava | Verifique locks no banco | [README.md](README.md#troubleshooting) |

## 📊 Estrutura de Dados

### Novos Campos em `orders`
```
order_source         TEXT
delivery_info        JSONB
delivery_person_id   UUID
dispatched_at        TIMESTAMPTZ
external_order_id    TEXT
```

### Novos Campos em `products`
```
barcode              TEXT
pdv_code             TEXT
sold_by_weight       BOOLEAN
weight_unit          TEXT
price_per_unit       NUMERIC
barcode_format       TEXT
ncm                  TEXT
cfop                 TEXT
tax_rate             NUMERIC
cest                 TEXT
origem               INTEGER
```

### Tabela `entregadores`
Ver estrutura completa em [README.md](README.md#estrutura-das-novas-tabelas)

### Tabela `notas_fiscais`
Ver estrutura completa em [README.md](README.md#estrutura-das-novas-tabelas)

## 🔗 Links Úteis

### Documentação Externa
- [Supabase Docs](https://supabase.com/docs)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [Focus NFe API](https://focusnfe.com.br/doc/)
- [iFood API](https://developer.ifood.com.br/)

### Documentação do Projeto
- [Estudo Técnico](../estudo_tecnico.md)
- [Task List](../task.md)
- [Schema SQL Base](../../restaurante-app/scripts/postgres_schema.sql)

## 📞 Suporte

1. **Antes de executar**: Leia [README.md](README.md)
2. **Durante execução**: Monitore os logs
3. **Após execução**: Execute `99_validate_migrations.sql`
4. **Em caso de erro**: Consulte [Troubleshooting](README.md#troubleshooting)
5. **Para exemplos**: Veja [EXAMPLES.md](EXAMPLES.md)

## ✅ Checklist de Implementação

- [ ] Ler README.md completo
- [ ] Fazer backup do banco de dados
- [ ] Executar em ambiente de desenvolvimento primeiro
- [ ] Executar `00_validate_prerequisites.sql`
- [ ] Executar migrations em ordem (01 a 06)
- [ ] Executar `99_validate_migrations.sql`
- [ ] Testar exemplos do EXAMPLES.md
- [ ] Instalar `expo-barcode-scanner` no app
- [ ] Implementar telas no app mobile
- [ ] Criar Edge Functions no Supabase
- [ ] Testar integração com APIs externas
- [ ] Deploy em produção

---

**Última atualização**: 2026-02-11  
**Versão**: 1.0.0
