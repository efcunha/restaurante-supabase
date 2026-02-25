# ⚠️ AVISO CRÍTICO - RESTORE DESTRUTIVO

## 🔴 LEIA ANTES DE EXECUTAR O RESTORE

O script de restore (`restore.sh` / `restore.bat`) executa operações **DESTRUTIVAS** e **IRREVERSÍVEIS** no banco de dados de destino.

## 🗑️ O Que Será DELETADO

Quando você executa o restore, o script faz:

```sql
-- 1. REMOVE TUDO DO SCHEMA (CASCADE remove dependências)
DROP SCHEMA IF EXISTS public CASCADE;

-- 2. RECRIA O SCHEMA VAZIO
CREATE SCHEMA public;

-- 3. RESTAURA OS DADOS DO BACKUP
pg_restore ...
```

### Isso significa que serão PERMANENTEMENTE DELETADOS:

- ✗ **TODAS as tabelas** e seus dados
- ✗ **TODAS as views**
- ✗ **TODAS as funções** (stored procedures)
- ✗ **TODOS os triggers**
- ✗ **TODOS os índices**
- ✗ **TODAS as sequences**
- ✗ **TODOS os tipos customizados**
- ✗ **TODAS as constraints**
- ✗ **TODAS as policies (RLS)**
- ✗ **TUDO que depende do schema public**

## 🛡️ Proteções Implementadas

O script possui as seguintes proteções:

1. **Confirmação Obrigatória**
   - Você DEVE digitar "SIM" (maiúsculas) para confirmar
   - Qualquer outra resposta cancela a operação

2. **Avisos Visuais**
   - Mensagens em vermelho destacando o perigo
   - Descrição clara do que será deletado

3. **Logs Detalhados**
   - Todas as operações são registradas
   - Logs salvos em `logs/restore_YYYY-MM-DD.log`

4. **Validação Pré-Restore**
   - Verifica integridade do backup
   - Testa conexão com o banco
   - Valida credenciais

## ✅ Checklist OBRIGATÓRIO Antes do Restore

Antes de executar o restore, CERTIFIQUE-SE de:

- [ ] **Fazer backup do banco de destino ANTES**
  ```bash
  # Fazer backup do banco atual
  ./backup.sh backup_antes_restore
  ```

- [ ] **Confirmar que está no banco CORRETO**
  ```bash
  # Verificar qual banco será afetado
  echo "Host: $TARGET_DB_HOST"
  echo "Database: $TARGET_DB_NAME"
  ```

- [ ] **Testar em ambiente de desenvolvimento PRIMEIRO**
  - NUNCA teste restore direto em produção
  - Use um banco de testes/staging

- [ ] **Notificar a equipe**
  - Avisar sobre a manutenção
  - Coordenar horário de menor impacto

- [ ] **Verificar o backup que será restaurado**
  ```bash
  # Ver conteúdo do backup
  pg_restore -l backups/backup_latest.dump
  ```

- [ ] **Ter plano de rollback**
  - Saber como reverter se algo der errado
  - Ter backup recente disponível

## 🚨 Cenários de Uso Correto

### ✅ Quando usar restore:

1. **Recuperação de Desastre**
   - Banco corrompido
   - Dados perdidos acidentalmente
   - Falha de hardware

2. **Migração de Ambiente**
   - Copiar produção para staging
   - Criar ambiente de desenvolvimento
   - Migrar entre servidores

3. **Rollback de Deploy**
   - Reverter mudanças problemáticas
   - Voltar para versão anterior

4. **Clonagem de Banco**
   - Criar cópia para testes
   - Análise de dados

### ❌ Quando NÃO usar restore:

1. **Adicionar dados incrementais**
   - Use INSERT/UPDATE ao invés
   - Restore substitui TUDO

2. **Atualizar apenas algumas tabelas**
   - Use restore seletivo ou SQL direto
   - Restore completo é overkill

3. **Em produção sem teste prévio**
   - SEMPRE teste em staging primeiro
   - Nunca arrisque dados de produção

## 🔄 Processo Recomendado de Restore

### Passo a Passo Seguro:

```bash
# 1. BACKUP DO BANCO ATUAL (CRÍTICO!)
./backup.sh backup_antes_restore_$(date +%Y%m%d_%H%M%S)

# 2. VERIFICAR BACKUP QUE SERÁ RESTAURADO
pg_restore -l backups/backup_latest.dump | head -20

# 3. TESTAR EM STAGING PRIMEIRO
# Editar config.local.sh para apontar para staging
./restore.sh backups/backup_latest.dump

# 4. VALIDAR DADOS EM STAGING
psql -h staging-host -U user -d postgres -c "SELECT COUNT(*) FROM orders;"

# 5. SE TUDO OK, FAZER EM PRODUÇÃO
# Editar config.local.sh para produção
./restore.sh backups/backup_latest.dump

# 6. VALIDAR DADOS EM PRODUÇÃO
psql -h prod-host -U user -d postgres -c "SELECT COUNT(*) FROM orders;"
```

## 🆘 Recuperação de Emergência

### Se algo der errado durante o restore:

1. **NÃO ENTRE EM PÂNICO**
   - O backup anterior ainda existe
   - Você pode reverter

2. **Verificar logs**
   ```bash
   tail -100 logs/restore_$(date +%Y-%m-%d).log
   ```

3. **Restaurar backup anterior**
   ```bash
   ./restore.sh backups/backup_antes_restore_*.dump
   ```

4. **Notificar equipe**
   - Informar sobre o problema
   - Coordenar solução

## 📞 Contatos de Emergência

Em caso de problemas críticos:
1. Notifique o DBA imediatamente
2. Preserve os logs
3. Não tente "consertar" sem orientação
4. Documente o que aconteceu

## 📝 Exemplo de Confirmação

Quando você executa `./restore.sh`, verá:

```
⚠️  ATENÇÃO: Esta operação irá DESTRUIR TODOS OS DADOS no banco de destino!
O schema 'public' será completamente removido (DROP CASCADE)
Banco de destino: aws-1-us-east-2.pooler.supabase.com
Database: postgres
Schema: public

TODAS as tabelas, funções, triggers e dados serão PERMANENTEMENTE DELETADOS!

Tem certeza que deseja continuar? (digite 'SIM' para confirmar):
```

**Você DEVE digitar exatamente: `SIM` (maiúsculas)**

Qualquer outra resposta cancela a operação.

---

## ⚖️ Responsabilidade

Ao executar o restore, você assume total responsabilidade por:
- Perda de dados
- Downtime do sistema
- Impacto nos usuários
- Consequências da operação

**USE COM EXTREMA CAUTELA!**

---

**Última atualização**: 2026-02-11  
**Versão**: 1.0.0  
**Classificação**: CRÍTICO
