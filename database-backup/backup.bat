@echo off
REM ============================================================================
REM Script de Backup - Supabase Database (Windows)
REM ============================================================================
REM Uso: backup.bat [nome_do_backup]
REM ============================================================================

setlocal enabledelayedexpansion

REM ============================================================================
REM Carregar configurações
REM ============================================================================

set "ENV_FILE=.env.local"

if not exist "%ENV_FILE%" (
  echo [ERROR] Arquivo %ENV_FILE% nao encontrado!
  echo Execute: copy .env.example .env.local
  pause
  exit /b 1
)

for /f "usebackq tokens=1,* delims==" %%A in ("%ENV_FILE%") do (
  set "k=%%A"
  set "v=%%B"
  if not "!k!"=="" if not "!k:~0,1!"=="#" (
    if "!v:~0,1!"=="\"" set "v=!v:~1!"
    if "!v:~-1!"=="\"" set "v=!v:~0,-1!"
    set "!k!=!v!"
  )
)

REM ============================================================================
REM Configurações
REM ============================================================================

if "%SOURCE_DB_PASSWORD%"=="" (
  echo [ERROR] SOURCE_DB_PASSWORD nao configurado em %ENV_FILE%
  pause
  exit /b 1
)

REM ============================================================================
REM Preparação
REM ============================================================================

set TIMESTAMP=%date:~-4%%date:~3,2%%date:~0,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%

if "%~1"=="" (
  set BACKUP_NAME=backup_%TIMESTAMP%
) else (
  set BACKUP_NAME=%~1
)

if not exist "backups" mkdir backups
if not exist "logs" mkdir logs

set BACKUP_FILE=backups\%BACKUP_NAME%.dump
set LOG_FILE=logs\backup_%date:~-4%%date:~3,2%%date:~0,2%.log

REM ============================================================================
REM Início do backup
REM ============================================================================

echo.
echo ============================================
echo   Backup do Banco de Dados Supabase
echo ============================================
echo.
echo Iniciando backup...
echo Host: %SOURCE_DB_HOST%
echo Database: %SOURCE_DB_NAME%
echo Schema: %BACKUP_SCHEMA%
echo Arquivo: %BACKUP_FILE%
echo.

REM ============================================================================
REM Testar conexão
REM ============================================================================

echo Testando conexao com o banco...
set PGPASSWORD=%SOURCE_DB_PASSWORD%

psql -h %SOURCE_DB_HOST% -p %SOURCE_DB_PORT% -U %SOURCE_DB_USER% -d %SOURCE_DB_NAME% -c "SELECT 1" >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Falha ao conectar no banco de dados
  pause
  exit /b 1
)

echo [OK] Conexao estabelecida com sucesso
echo.

REM ============================================================================
REM Executar backup
REM ============================================================================

echo Executando backup...
echo Isso pode levar alguns minutos...
echo.

pg_dump ^
  -h %SOURCE_DB_HOST% ^
  -p %SOURCE_DB_PORT% ^
  -U %SOURCE_DB_USER% ^
  -d %SOURCE_DB_NAME% ^
  -n %BACKUP_SCHEMA% ^
  -F%BACKUP_FORMAT% ^
  -Z %COMPRESSION_LEVEL% ^
  -f %BACKUP_FILE% ^
  --verbose 2>> %LOG_FILE%

if errorlevel 1 (
  echo [ERROR] Falha ao executar backup
  echo Verifique o log: %LOG_FILE%
  pause
  exit /b 1
)

echo [OK] Backup concluido com sucesso!
echo.

REM ============================================================================
REM Informações do backup
REM ============================================================================

echo ============================================
echo   Informacoes do Backup
echo ============================================
echo Arquivo: %BACKUP_FILE%

for %%A in (%BACKUP_FILE%) do (
  echo Tamanho: %%~zA bytes
)

echo Data: %date% %time%
echo.

REM ============================================================================
REM Verificar integridade
REM ============================================================================

echo Verificando integridade do backup...
pg_restore -l %BACKUP_FILE% >nul 2>&1
if errorlevel 1 (
  echo [WARNING] Nao foi possivel verificar a integridade do backup
) else (
  echo [OK] Backup integro e valido
)

REM ============================================================================
REM Finalização
REM ============================================================================

echo.
echo ============================================
echo   OK Backup Concluido com Sucesso!
echo ============================================
echo.
echo Para restaurar este backup, execute:
echo restore.bat %BACKUP_FILE%
echo.

REM Limpar variável de senha
set PGPASSWORD=

pause
