# 🗄️ Database Backup & Restore

Scripts para backup e restore do banco de dados Supabase.

## ⚠️ IMPORTANTE - SEGURANÇA

Esta pasta contém scripts para manipular dados sensíveis do banco de dados:
- ❌ **NÃO commite arquivos .dump, .sql ou credenciais no Git**
- ❌ **NÃO compartilhe arquivos de backup publicamente**
- ✅ **Mantenha backups em local seguro e criptografado**
- ✅ **Use variáveis de ambiente para credenciais**

## 📁 Estrutura

```
database-backup/
├── README.md              # Este arquivo
├── .gitignore            # Protege arquivos sensíveis
├── config.example.sh     # Exemplo de configuração
├── backup.sh             # Script de backup (Linux/Mac)
├── backup.bat            # Script de backup (Windows)
├── restore.sh            # Script de restore (Linux/Mac)
├── restore.bat           # Script de restore (Windows)
├── backups/              # Pasta para armazenar backups (ignorada pelo Git)
└── logs/                 # Logs de execução (ignorados pelo Git)
```

## 🚀 Configuração Inicial

### 1. Copiar arquivo de configuração
```bash
cp config.example.sh config.local.sh
```

### 2. Editar config.local.sh com suas credenciais
```bash
nano config.local.sh  # ou use seu editor preferido
```

### 3. Dar permissão de execução (Linux/Mac)
```bash
chmod +x backup.sh restore.sh
```

## 💾 Backup

### Linux/Mac
```bash
# Backup completo
./backup.sh

# Backup com nome customizado
./backup.sh meu_backup

# Backup apenas do schema (sem dados)
./backup.sh --schema-only
```

### Windows
```cmd
REM Backup completo
backup.bat

REM Backup com nome customizado
backup.bat meu_backup
```

## 🔄 Restore

### ⚠️ IMPORTANTE: O Restore é DESTRUTIVO!

O script de restore executa as seguintes operações:
1. **DROP SCHEMA public CASCADE** - Remove TUDO do schema
2. **CREATE SCHEMA public** - Recria o schema vazio
3. **pg_restore** - Restaura os dados do backup

**TODOS os dados existentes serão PERMANENTEMENTE DELETADOS!**

### Linux/Mac
```bash
# Restore do último backup
./restore.sh

# Restore de backup específico
./restore.sh backups/backup_2026-02-11_150000.dump

# Restore apenas do schema
./restore.sh --schema-only backups/backup.dump
```

### Windows
```cmd
REM Restore do último backup
restore.bat

REM Restore de backup específico
restore.bat backups\backup_2026-02-11_150000.dump
```

## 📊 Tipos de Backup

### Backup Completo (Padrão)
- Schema `public` + Dados
- Formato: Custom (-Fc)
- Comprimido automaticamente
- **Escopo**: Apenas schema `public` (ver [BACKUP_SCOPE.md](BACKUP_SCOPE.md))

### Backup Schema Only
- Apenas estrutura (tabelas, funções, índices)
- Sem dados
- Útil para criar ambientes de desenvolvimento

### Backup Data Only
- Apenas dados
- Sem estrutura
- Útil para migração de dados

## 🔐 Segurança

### Variáveis de Ambiente
Recomendamos usar variáveis de ambiente ao invés de hardcoded:

```bash
export PGPASSWORD='sua_senha'
export SOURCE_DB_HOST='aws-0-us-west-2.pooler.supabase.com'
export SOURCE_DB_USER='postgres.ykalocfhnetxenvmtlcn'
```

### Criptografia de Backups
Para backups em produção, considere criptografar:

```bash
# Backup e criptografar
./backup.sh && gpg -c backups/backup_latest.dump

# Descriptografar e restore
gpg -d backups/backup_latest.dump.gpg > backup_temp.dump
./restore.sh backup_temp.dump
rm backup_temp.dump
```

## 📅 Automação (Cron)

### Backup Diário às 2h da manhã
```bash
# Editar crontab
crontab -e

# Adicionar linha
0 2 * * * cd /caminho/para/database-backup && ./backup.sh >> logs/cron.log 2>&1
```

### Backup Semanal (Domingo às 3h)
```bash
0 3 * * 0 cd /caminho/para/database-backup && ./backup.sh weekly >> logs/cron.log 2>&1
```

## 🧹 Limpeza de Backups Antigos

### Manter apenas últimos 7 dias
```bash
find backups/ -name "*.dump" -mtime +7 -delete
```

### Manter apenas últimos 5 backups
```bash
ls -t backups/*.dump | tail -n +6 | xargs rm -f
```

## 🔍 Verificação de Backup

### Listar conteúdo do backup
```bash
pg_restore -l backups/backup_latest.dump
```

### Verificar tamanho
```bash
ls -lh backups/
```

### Testar restore em banco temporário
```bash
# Criar banco temporário
createdb test_restore

# Restore
pg_restore -d test_restore backups/backup_latest.dump

# Verificar
psql test_restore -c "\dt"

# Limpar
dropdb test_restore
```

## 🆘 Troubleshooting

### Erro: "password authentication failed"
- Verifique se a senha está correta em config.local.sh
- Certifique-se de que PGPASSWORD está exportado

### Erro: "connection refused"
- Verifique se o host e porta estão corretos
- Teste conexão: `psql -h HOST -p PORT -U USER -d postgres`

### Erro: "permission denied"
- Use `--no-owner --no-privileges` no restore
- Verifique permissões do usuário no banco

### Backup muito lento
- Use conexão pooler do Supabase
- Considere backup apenas de tabelas específicas
- Verifique largura de banda da rede

### Arquivo de backup corrompido
- Verifique espaço em disco
- Teste integridade: `pg_restore -l backup.dump`
- Mantenha múltiplas cópias de backup

## 📝 Logs

Logs são salvos em `logs/`:
- `backup_YYYY-MM-DD.log` - Log de cada backup
- `restore_YYYY-MM-DD.log` - Log de cada restore
- `cron.log` - Log de execuções automáticas

## 🔗 Links Úteis

- [pg_dump Documentation](https://www.postgresql.org/docs/current/app-pgdump.html)
- [pg_restore Documentation](https://www.postgresql.org/docs/current/app-pgrestore.html)
- [Supabase Database Backups](https://supabase.com/docs/guides/platform/backups)

## 📞 Suporte

Em caso de problemas:
1. Verifique os logs em `logs/`
2. Teste conexão com o banco
3. Valide as credenciais
4. Consulte a documentação do PostgreSQL
