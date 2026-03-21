# 🚀 Quick Start - Database Backup & Restore

Guia rápido para começar a usar os scripts de backup e restore.

## ⚡ Setup Rápido (5 minutos)

### 1. Copiar arquivo de configuração
```bash
cd database-backup
cp config.example.sh config.local.sh
```

### 2. Editar credenciais
```bash
nano config.local.sh  # ou use seu editor preferido
```

Substitua `SUA_SENHA_AQUI` pelas senhas reais:
- `SOURCE_DB_PASSWORD` - Senha do banco de origem (backup)
- `TARGET_DB_PASSWORD` - Senha do banco de destino (restore)

### 3. Dar permissão de execução (Linux/Mac)
```bash
chmod +x backup.sh restore.sh
```

## 💾 Fazer Backup

### Linux/Mac
```bash
./backup.sh
```

### Windows
```cmd
backup.bat
```

O backup será salvo em: `backups/backup_YYYY-MM-DD_HHMMSS.dump`

**Escopo**: Apenas schema `public` (tabelas, funções, dados, etc.)  
Para detalhes completos, veja [BACKUP_SCOPE.md](BACKUP_SCOPE.md)

## 🔄 Restaurar Backup

### ⚠️ ATENÇÃO: Operação DESTRUTIVA!
O restore executa `DROP SCHEMA public CASCADE` antes de restaurar.
**TODOS os dados existentes serão DELETADOS!**

### Linux/Mac
```bash
# Restaurar último backup
./restore.sh

# Restaurar backup específico
./restore.sh backups/backup_2026-02-11_150000.dump
```

### Windows
```cmd
REM Restaurar último backup
restore.bat

REM Restaurar backup específico
restore.bat backups\backup_2026-02-11_150000.dump
```

## ⚠️ IMPORTANTE

1. **Teste primeiro em desenvolvimento!**
2. **Faça backup antes de fazer restore!**
3. **Nunca commite config.local.sh no Git!**
4. **Mantenha backups em local seguro!**

## 📝 Comandos Úteis

### Verificar drift de migrations (local x remoto)
```bash
./check-migration-sync.sh
```

### Listar backups disponíveis
```bash
ls -lh backups/
```

### Ver conteúdo de um backup
```bash
pg_restore -l backups/backup_latest.dump
```

### Verificar tamanho total dos backups
```bash
du -sh backups/
```

### Limpar backups antigos (mais de 7 dias)
```bash
find backups/ -name "*.dump" -mtime +7 -delete
```

## 🆘 Problemas Comuns

### "password authentication failed"
- Verifique se editou config.local.sh
- Confirme que as senhas estão corretas

### "connection refused"
- Verifique se o host e porta estão corretos
- Teste: `psql -h HOST -p PORT -U USER -d postgres`

### "permission denied"
- Linux/Mac: Execute `chmod +x backup.sh restore.sh`
- Windows: Execute como Administrador

## 📚 Documentação Completa

Para mais detalhes, consulte [README.md](README.md)

## 🔗 Links Rápidos

- [Configuração Completa](README.md#configuração-inicial)
- [Exemplos de Uso](README.md#backup)
- [Troubleshooting](README.md#troubleshooting)
- [Automação com Cron](README.md#automação-cron)
