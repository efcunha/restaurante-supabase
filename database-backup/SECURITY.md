# 🔒 Guia de Segurança - Database Backup

Este documento contém diretrizes de segurança para uso dos scripts de backup e restore.

## ⚠️ AVISOS CRÍTICOS DE SEGURANÇA

### 🚫 NUNCA Faça Isso

1. **NUNCA commite credenciais no Git**
   - ❌ `config.local.sh` com senhas
   - ❌ Arquivos `.dump` com dados reais
   - ❌ Logs com informações sensíveis

2. **NUNCA compartilhe backups publicamente**
   - ❌ Upload em repositórios públicos
   - ❌ Envio por email não criptografado
   - ❌ Armazenamento em cloud público

3. **NUNCA execute restore em produção sem testar**
   - ❌ Restore direto em produção
   - ❌ Sem backup prévio
   - ❌ Sem validação dos dados

## ✅ Boas Práticas de Segurança

### 1. Proteção de Credenciais

#### Usar Variáveis de Ambiente
```bash
# Ao invés de hardcoded no script
export PGPASSWORD='sua_senha'
./backup.sh
```

#### Usar .pgpass (Recomendado)
```bash
# Criar arquivo ~/.pgpass
echo "hostname:port:database:username:password" > ~/.pgpass
chmod 600 ~/.pgpass
```

#### Usar Vault/Secrets Manager
```bash
# AWS Secrets Manager
export PGPASSWORD=$(aws secretsmanager get-secret-value --secret-id db-password --query SecretString --output text)

# HashiCorp Vault
export PGPASSWORD=$(vault kv get -field=password secret/database)
```

### 2. Criptografia de Backups

#### Criptografar com GPG
```bash
# Backup e criptografar
./backup.sh
gpg --symmetric --cipher-algo AES256 backups/backup_latest.dump

# Descriptografar
gpg --decrypt backups/backup_latest.dump.gpg > backup_temp.dump
```

#### Criptografar com OpenSSL
```bash
# Criptografar
openssl enc -aes-256-cbc -salt -in backup.dump -out backup.dump.enc

# Descriptografar
openssl enc -d -aes-256-cbc -in backup.dump.enc -out backup.dump
```

### 3. Armazenamento Seguro

#### Opções Recomendadas
- ✅ AWS S3 com criptografia (SSE-S3 ou SSE-KMS)
- ✅ Azure Blob Storage com criptografia
- ✅ Google Cloud Storage com criptografia
- ✅ Servidor local com disco criptografado
- ✅ NAS com criptografia de volume

#### Exemplo: Upload para S3 Criptografado
```bash
# Backup e upload
./backup.sh
aws s3 cp backups/backup_latest.dump \
  s3://meu-bucket-backups/$(date +%Y-%m-%d)/ \
  --sse AES256 \
  --storage-class STANDARD_IA
```

### 4. Controle de Acesso

#### Permissões de Arquivo
```bash
# Apenas owner pode ler/escrever
chmod 600 config.local.sh
chmod 600 backups/*.dump

# Scripts executáveis apenas pelo owner
chmod 700 backup.sh restore.sh
```

#### Permissões de Diretório
```bash
# Apenas owner pode acessar
chmod 700 backups/
chmod 700 logs/
```

### 5. Auditoria e Logs

#### Registrar Todas as Operações
```bash
# Adicionar ao script
log_audit() {
  echo "[$(date)] $USER executed $1 from $(hostname)" >> /var/log/db-backup-audit.log
}

log_audit "backup"
```

#### Monitorar Acessos
```bash
# Verificar quem acessou backups
sudo ausearch -f /path/to/backups/ -i
```

### 6. Rotação de Credenciais

#### Política Recomendada
- 🔄 Trocar senhas a cada 90 dias
- 🔄 Usar senhas diferentes para cada ambiente
- 🔄 Revogar acesso de usuários inativos

#### Automatizar Rotação
```bash
# Script de rotação (exemplo)
#!/bin/bash
NEW_PASSWORD=$(openssl rand -base64 32)
psql -c "ALTER USER postgres PASSWORD '$NEW_PASSWORD';"
echo "export SOURCE_DB_PASSWORD='$NEW_PASSWORD'" > config.local.sh
```

## 🛡️ Proteção Contra Ameaças

### SQL Injection
- ✅ Scripts usam prepared statements
- ✅ Validação de entrada
- ✅ Escape de caracteres especiais

### Man-in-the-Middle
- ✅ SSL/TLS obrigatório (`PGSSLMODE=require`)
- ✅ Verificação de certificados
- ✅ Conexões criptografadas

### Acesso Não Autorizado
- ✅ Autenticação forte
- ✅ Firewall configurado
- ✅ IP whitelisting no Supabase

## 📋 Checklist de Segurança

Antes de usar em produção, verifique:

- [ ] `config.local.sh` está no `.gitignore`
- [ ] Permissões de arquivo corretas (600/700)
- [ ] SSL/TLS habilitado
- [ ] Backups criptografados
- [ ] Armazenamento seguro configurado
- [ ] Logs de auditoria habilitados
- [ ] Política de rotação de credenciais definida
- [ ] Acesso restrito por IP/firewall
- [ ] Backup testado em ambiente de staging
- [ ] Plano de recuperação de desastres documentado

## 🚨 Resposta a Incidentes

### Se Credenciais Forem Comprometidas

1. **Ação Imediata**
   ```bash
   # Revogar acesso
   psql -c "REVOKE ALL ON DATABASE postgres FROM usuario_comprometido;"
   
   # Trocar senha
   psql -c "ALTER USER postgres PASSWORD 'nova_senha_forte';"
   ```

2. **Investigação**
   - Verificar logs de acesso
   - Identificar dados acessados
   - Documentar o incidente

3. **Notificação**
   - Informar equipe de segurança
   - Notificar stakeholders
   - Seguir política de privacidade (LGPD/GDPR)

### Se Backup For Exposto

1. **Contenção**
   - Remover backup exposto
   - Revogar credenciais
   - Bloquear acesso

2. **Avaliação**
   - Identificar dados expostos
   - Avaliar impacto
   - Determinar escopo

3. **Remediação**
   - Notificar afetados
   - Implementar controles adicionais
   - Revisar políticas de segurança

## 📞 Contatos de Segurança

Em caso de incidente de segurança:
1. Notifique imediatamente a equipe de segurança
2. Não tente resolver sozinho
3. Preserve evidências
4. Documente tudo

## 🔗 Recursos Adicionais

- [OWASP Database Security](https://owasp.org/www-community/vulnerabilities/Database_Security)
- [PostgreSQL Security](https://www.postgresql.org/docs/current/security.html)
- [Supabase Security](https://supabase.com/docs/guides/platform/security)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)

---

**Última atualização**: 2026-02-11  
**Versão**: 1.0.0  
**Classificação**: CONFIDENCIAL
