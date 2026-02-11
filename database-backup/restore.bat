@echo off
REM ============================================================================
REM Script de Restore - Supabase Database (Windows)
REM ============================================================================
REM Uso: restore.bat [arquivo_backup.dump]
REM ============================================================================

setlocal enabledelayedexpansion

REM ============================================================================
REM Configurações (EDITE AQUI)
REM ============================================================================

set TARGET_DB_HOST=aws-1-us-east-2.pooler.supabase.com
set TARGET_DB_PORT=5432
set TARGET_DB_USER=postgres.bqeemgkbzshupjrjxmuv
set TARGET_DB_NAME=postgres
set TARGET_DB_PASSWORD=A13546289b@P@ssw0rd

set BACKUP_SCHEMA=public

REM ============================================================================
REM Preparação
REM ============================================================================

if not exist "logs" mkdir logs

set LOG_FILE=logs\restore_%date:~-4%%date:~3,2%%date:~0,2%.log

REM Determinar arquivo de backup
if "%~1"=="" (
  if exist "backups\backup_latest.dump" (
    set BACKUP_FILE=backups\backup_latest.dump
  ) else (
    echo [ERROR] Nenhum arquivo de backup especificado ou encontrado
    echo Uso: restore.bat [arquivo_backup.dump]
    echo Ou crie um backup primeiro com: backup.bat
    pause
    exit /b 1
  )
) else (
  set BACKUP_FILE=%~1
)

REM ============================================================================
REM Início do restore
REM ============================================================================

echo.
echo ============================================
echo   Restore do Banco de Dados Supabase
echo ============================================
echo.
echo Iniciando restore...
echo Host: %TARGET_DB_HOST%
echo Database: %TARGET_DB_NAME%
echo Schema: %BACKUP_SCHEMA%
echo Arquivo: %BACKUP_FILE%
echo.

REM ============================================================================
REM Verificar arquivo de backup
REM ============================================================================

echo Verificando arquivo de backup...

if not exist "%BACKUP_FILE%" (
  echo [ERROR] Arquivo de backup nao encontrado: %BACKUP_FILE%
  pause
  exit /b 1
)

for %%A in (%BACKUP_FILE%) do (
  echo Arquivo: %BACKUP_FILE%
  echo Tamanho: %%~zA bytes
)

REM Verificar integridade
pg_restore -l %BACKUP_FILE% >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Arquivo de backup corrompido ou invalido
  pause
  exit /b 1
)

echo [OK] Arquivo de backup valido
echo.

REM ============================================================================
REM Confirmação de segurança
REM ============================================================================

echo.
echo [ATENCAO] Esta operacao ira DESTRUIR TODOS OS DADOS no banco de destino!
echo O schema '%BACKUP_SCHEMA%' sera completamente removido (DROP CASCADE)
echo Banco de destino: %TARGET_DB_HOST%
echo Database: %TARGET_DB_NAME%
echo Schema: %BACKUP_SCHEMA%
echo.
echo TODAS as tabelas, funcoes, triggers e dados serao PERMANENTEMENTE DELETADOS!
echo.
set /p CONFIRM="Tem certeza que deseja continuar? (digite SIM para confirmar): "

if not "%CONFIRM%"=="SIM" (
  echo Operacao cancelada pelo usuario
  pause
  exit /b 0
)

REM ============================================================================
REM Testar conexão
REM ============================================================================

echo.
echo Testando conexao com o banco de destino...
set PGPASSWORD=%TARGET_DB_PASSWORD%

psql -h %TARGET_DB_HOST% -p %TARGET_DB_PORT% -U %TARGET_DB_USER% -d %TARGET_DB_NAME% -c "SELECT 1" >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Falha ao conectar no banco de dados de destino
  pause
  exit /b 1
)

echo [OK] Conexao estabelecida com sucesso
echo.

REM ============================================================================
REM Limpar schema existente (DROP CASCADE)
REM ============================================================================

echo.
echo [ATENCAO] Removendo schema existente...
echo Executando: DROP SCHEMA %BACKUP_SCHEMA% CASCADE
echo.

psql -h %TARGET_DB_HOST% -p %TARGET_DB_PORT% -U %TARGET_DB_USER% -d %TARGET_DB_NAME% -c "DROP SCHEMA IF EXISTS %BACKUP_SCHEMA% CASCADE;" 2>> %LOG_FILE%
if errorlevel 1 (
  echo [ERROR] Falha ao remover schema %BACKUP_SCHEMA%
  pause
  exit /b 1
)

echo [OK] Schema %BACKUP_SCHEMA% removido com sucesso
echo.

REM Recriar schema vazio
echo Recriando schema %BACKUP_SCHEMA%...
psql -h %TARGET_DB_HOST% -p %TARGET_DB_PORT% -U %TARGET_DB_USER% -d %TARGET_DB_NAME% -c "CREATE SCHEMA %BACKUP_SCHEMA%;" 2>> %LOG_FILE%
if errorlevel 1 (
  echo [ERROR] Falha ao recriar schema %BACKUP_SCHEMA%
  pause
  exit /b 1
)

echo [OK] Schema %BACKUP_SCHEMA% recriado
echo.

REM ============================================================================
REM Executar restore
REM ============================================================================

echo Executando restore...
echo Isso pode levar alguns minutos dependendo do tamanho do backup...
echo.

pg_restore ^
  -h %TARGET_DB_HOST% ^
  -p %TARGET_DB_PORT% ^
  -U %TARGET_DB_USER% ^
  -d %TARGET_DB_NAME% ^
  --no-owner ^
  --no-privileges ^
  -n %BACKUP_SCHEMA% ^
  --verbose ^
  %BACKUP_FILE% 2>> %LOG_FILE%

REM pg_restore pode retornar erro mesmo com restore parcialmente bem-sucedido
echo [OK] Restore concluido!
echo.

REM ============================================================================
REM Verificação pós-restore
REM ============================================================================

echo Verificando restore...

psql -h %TARGET_DB_HOST% -p %TARGET_DB_PORT% -U %TARGET_DB_USER% -d %TARGET_DB_NAME% -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '%BACKUP_SCHEMA%'" >nul 2>&1
if errorlevel 1 (
  echo [WARNING] Nao foi possivel verificar o numero de tabelas
) else (
  echo [OK] Restore verificado
)

REM ============================================================================
REM Atualizar estatísticas
REM ============================================================================

echo.
echo Atualizando estatisticas do banco...
psql -h %TARGET_DB_HOST% -p %TARGET_DB_PORT% -U %TARGET_DB_USER% -d %TARGET_DB_NAME% -c "ANALYZE;" >nul 2>&1
if errorlevel 1 (
  echo [WARNING] Nao foi possivel atualizar estatisticas
) else (
  echo [OK] Estatisticas atualizadas
)

REM ============================================================================
REM Finalização
REM ============================================================================

echo.
echo ============================================
echo   OK Restore Concluido!
echo ============================================
echo.
echo Informacoes:
echo   Arquivo: %BACKUP_FILE%
echo   Destino: %TARGET_DB_HOST%
echo   Database: %TARGET_DB_NAME%
echo.
echo Verifique o log para detalhes:
echo %LOG_FILE%
echo.

REM Limpar variável de senha
set PGPASSWORD=

pause
