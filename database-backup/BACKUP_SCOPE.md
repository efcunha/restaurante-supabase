# 📦 Escopo do Backup - O Que Está Incluído

Este documento explica exatamente o que está sendo incluído (e excluído) nos backups.

## ✅ O Que ESTÁ Incluído no Backup

### Schema: `public` (Apenas)

O backup está configurado para incluir **APENAS o schema `public`** através da flag `-n public` no comando `pg_dump`.

#### Objetos Incluídos:

1. **Tabelas e Dados**
   - ✅ Todas as tabelas do schema public
   - ✅ Todos os dados das tabelas
   - ✅ Sequences (auto-increment)
   - ✅ Constraints (PK, FK, CHECK, UNIQUE)
   - ✅ Defaults

2. **Índices**
   - ✅ Índices primários (PRIMARY KEY)
   - ✅ Índices únicos (UNIQUE)
   - ✅ Índices regulares (INDEX)
   - ✅ Índices parciais (WHERE)
   - ✅ Índices GIN, GIST, etc

3. **Funções e Procedures**
   - ✅ Stored procedures
   - ✅ Functions (SQL, PL/pgSQL)
   - ✅ Aggregate functions
   - ✅ Trigger functions

4. **Triggers**
   - ✅ Todos os triggers
   - ✅ Event triggers (se no schema public)

5. **Views**
   - ✅ Views simples
   - ✅ Materialized views
   - ✅ View dependencies

6. **Tipos Customizados**
   - ✅ ENUM types
   - ✅ COMPOSITE types
   - ✅ DOMAIN types

7. **Row Level Security (RLS)**
   - ✅ Policies
   - ✅ RLS enable/disable state

8. **Comentários**
   - ✅ COMMENT ON TABLE
   - ✅ COMMENT ON COLUMN
   - ✅ COMMENT ON FUNCTION

## ❌ O Que NÃO Está Incluído no Backup

### 1. Outros Schemas
- ❌ `auth` (schema do Supabase Auth)
- ❌ `storage` (schema do Supabase Storage)
- ❌ `realtime` (schema do Supabase Realtime)
- ❌ `extensions` (schema de extensões)
- ❌ `pg_catalog` (schema do sistema)
- ❌ `information_schema` (schema de metadados)
- ❌ Qualquer outro schema customizado

### 2. Objetos Globais
- ❌ Roles/Users (CREATE ROLE)
- ❌ Tablespaces
- ❌ Databases (CREATE DATABASE)
- ❌ Configurações globais (ALTER SYSTEM)

### 3. Extensões
- ❌ CREATE EXTENSION (não incluído por padrão)
- ❌ Dados das extensões em outros schemas

### 4. Configurações do Supabase
- ❌ Configurações de Auth
- ❌ Configurações de Storage
- ❌ Configurações de Realtime
- ❌ Edge Functions
- ❌ API Keys

### 5. Objetos de Sistema
- ❌ pg_stat_* (estatísticas)
- ❌ pg_catalog (catálogo do sistema)
- ❌ Logs do PostgreSQL

## 🔍 Como Verificar o Conteúdo do Backup

### Listar todos os objetos no backup:
```bash
pg_restore -l backups/backup_latest.dump
```

### Filtrar por tipo de objeto:
```bash
# Apenas tabelas
pg_restore -l backups/backup_latest.dump | grep "TABLE DATA"

# Apenas funções
pg_restore -l backups/backup_latest.dump | grep "FUNCTION"

# Apenas índices
pg_restore -l backups/backup_latest.dump | grep "INDEX"
```

### Ver estatísticas do backup:
```bash
# Tamanho do backup
ls -lh backups/backup_latest.dump

# Contar objetos por tipo
pg_restore -l backups/backup_latest.dump | awk '{print $3}' | sort | uniq -c
```

## 📊 Exemplo de Saída

Quando você lista o conteúdo do backup, verá algo como:

```
; Archive created at 2026-02-11 16:51:20 -03
;     dbname: postgres
;     TOC Entries: 245
;     Compression: 6
;     Dump Version: 1.14-0
;     Format: CUSTOM
;     Integer: 4 bytes
;     Offset: 8 bytes
;     Dumped from database version: 15.1
;     Dumped by pg_dump version: 15.1

;
; Selected TOC Entries:
;
3456; 1259 16385 TABLE public orders postgres
3457; 1259 16386 SEQUENCE public orders_id_seq postgres
3458; 1259 16387 TABLE public products postgres
3459; 1259 16388 TABLE public comandas postgres
...
3500; 2606 16450 CONSTRAINT public orders orders_pkey postgres
3501; 2606 16451 FK CONSTRAINT public orders orders_company_id_fkey postgres
...
3520; 1259 16500 INDEX public idx_orders_company postgres
3521; 1259 16501 INDEX public idx_orders_status postgres
...
3540; 0 16385 TABLE DATA public orders postgres
3541; 0 16386 TABLE DATA public products postgres
...
```

## 🎯 Configuração Atual

No arquivo `config.example.sh`:

```bash
# Schema a ser incluído no backup (padrão: public)
export BACKUP_SCHEMA="public"
```

No comando `pg_dump` (backup.sh):

```bash
pg_dump \
  -h $SOURCE_DB_HOST \
  -p $SOURCE_DB_PORT \
  -U $SOURCE_DB_USER \
  -d $SOURCE_DB_NAME \
  -n public \              # ← APENAS schema public
  -Fc \                    # Formato custom (comprimido)
  -Z 6 \                   # Compressão nível 6
  -f $BACKUP_FILE
```

## 🔧 Como Incluir Outros Schemas (Se Necessário)

Se você precisar incluir outros schemas no futuro:

### Opção 1: Múltiplos Schemas
```bash
# Editar backup.sh
pg_dump \
  -n public \
  -n auth \
  -n storage \
  ...
```

### Opção 2: Todos os Schemas (Exceto Sistema)
```bash
# Remover a flag -n
pg_dump \
  -h $SOURCE_DB_HOST \
  ...
  # Sem -n = todos os schemas
```

### Opção 3: Excluir Schemas Específicos
```bash
pg_dump \
  -N auth \              # Excluir schema auth
  -N storage \           # Excluir schema storage
  ...
```

## ⚠️ Importante para Supabase

O Supabase usa vários schemas internos:
- `auth` - Autenticação
- `storage` - Armazenamento de arquivos
- `realtime` - Subscriptions em tempo real
- `extensions` - Extensões do PostgreSQL

**Recomendação**: Mantenha o backup **APENAS do schema `public`** porque:
1. ✅ Seus dados de aplicação estão no `public`
2. ✅ Schemas do Supabase são gerenciados pela plataforma
3. ✅ Restore de schemas internos pode causar problemas
4. ✅ Backup menor e mais rápido

## 📝 Resumo

| Item | Incluído | Observação |
|------|----------|------------|
| Schema `public` | ✅ Sim | Completo (schema + dados) |
| Outros schemas | ❌ Não | Apenas `public` |
| Tabelas | ✅ Sim | Todas do schema `public` |
| Dados | ✅ Sim | Todos os dados |
| Funções | ✅ Sim | Todas do schema `public` |
| Triggers | ✅ Sim | Todos do schema `public` |
| Índices | ✅ Sim | Todos do schema `public` |
| RLS Policies | ✅ Sim | Todas do schema `public` |
| Roles/Users | ❌ Não | Objetos globais |
| Extensões | ❌ Não | Gerenciadas pelo Supabase |
| Configurações Supabase | ❌ Não | Gerenciadas pela plataforma |

---

**Última atualização**: 2026-02-11  
**Versão**: 1.0.0  
**Schema incluído**: `public` apenas
