@echo off
REM ============================================================================
REM Script: run_all_migrations.bat
REM Description: Executa todas as migrations em ordem (Windows)
REM Usage: run_all_migrations.bat [DATABASE_URL]
REM ============================================================================

setlocal enabledelayedexpansion

REM Database URL (pode ser passado como argumento ou variável de ambiente)
if "%~1"=="" (
  if "%DATABASE_URL%"=="" (
    echo ERROR: DATABASE_URL nao definida
    echo Usage: run_all_migrations.bat postgresql://user:pass@host:port/database
    echo    or: set DATABASE_URL=postgresql://... ^& run_all_migrations.bat
    exit /b 1
  )
  set "DB_URL=%DATABASE_URL%"
) else (
  set "DB_URL=%~1"
)

echo ============================================
echo Iniciando Migrations - Delivery, Fiscal e Balanca
echo ============================================
echo.

REM Validar pre-requisitos
echo [0/7] Validando pre-requisitos...
psql "%DB_URL%" -f "00_validate_prerequisites.sql" >nul 2>&1
if errorlevel 1 (
  echo   X Erro ao validar pre-requisitos
  exit /b 1
)
echo   OK Sucesso
echo.

REM Migration 1: Delivery fields
echo [1/7] Adicionando campos de delivery...
psql "%DB_URL%" -f "01_add_delivery_fields.sql" >nul 2>&1
if errorlevel 1 (
  echo   X Erro ao executar 01_add_delivery_fields.sql
  exit /b 1
)
echo   OK Sucesso
echo.

REM Migration 2: Entregadores table
echo [2/7] Criando tabela de entregadores...
psql "%DB_URL%" -f "02_create_entregadores_table.sql" >nul 2>&1
if errorlevel 1 (
  echo   X Erro ao executar 02_create_entregadores_table.sql
  exit /b 1
)
echo   OK Sucesso
echo.

REM Migration 3: Barcode fields
echo [3/7] Adicionando campos de codigo de barras...
psql "%DB_URL%" -f "03_add_barcode_fields.sql" >nul 2>&1
if errorlevel 1 (
  echo   X Erro ao executar 03_add_barcode_fields.sql
  exit /b 1
)
echo   OK Sucesso
echo.

REM Migration 4: Fiscal fields
echo [4/7] Adicionando campos fiscais...
psql "%DB_URL%" -f "04_add_fiscal_fields.sql" >nul 2>&1
if errorlevel 1 (
  echo   X Erro ao executar 04_add_fiscal_fields.sql
  exit /b 1
)
echo   OK Sucesso
echo.

REM Migration 5: Delivery functions
echo [5/7] Criando funcoes de delivery...
psql "%DB_URL%" -f "05_create_delivery_functions.sql" >nul 2>&1
if errorlevel 1 (
  echo   X Erro ao executar 05_create_delivery_functions.sql
  exit /b 1
)
echo   OK Sucesso
echo.

REM Migration 6: Indexes
echo [6/7] Criando indices de performance...
psql "%DB_URL%" -f "06_create_indexes.sql" >nul 2>&1
if errorlevel 1 (
  echo   X Erro ao executar 06_create_indexes.sql
  exit /b 1
)
echo   OK Sucesso
echo.

REM Validar migrations
echo [7/7] Validando migrations...
psql "%DB_URL%" -f "99_validate_migrations.sql" >nul 2>&1
if errorlevel 1 (
  echo   X Erro ao validar migrations
  exit /b 1
)
echo   OK Sucesso
echo.

echo ============================================
echo OK TODAS AS MIGRATIONS FORAM APLICADAS!
echo ============================================
echo.
echo Proximos passos:
echo   1. Instalar expo-barcode-scanner no app mobile
echo   2. Criar Edge Functions no Supabase
echo   3. Implementar telas de delivery no app
echo.

endlocal
