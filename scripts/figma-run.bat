@echo off
REM Figma Code Connect — Parse + Publish para todos os projetos
REM Usage: scripts\figma-run.bat [parse|publish] [FIGMA_FILE_KEY]

setlocal
set ACTION=%1
if "%ACTION%"=="" set ACTION=parse
set FILE_KEY=%2

if not "%FILE_KEY%"=="" (
  echo Sync FIGMA_FILE_KEY and envs...
  call node scripts\figma-sync.mjs --file-key %FILE_KEY% --skip-parse
  if errorlevel 1 (
    echo ERRO: falha ao sincronizar FIGMA setup.
    exit /b 1
  )
  echo.
)
call node scripts\figma-run.mjs %ACTION%
if errorlevel 1 exit /b 1

echo.
echo ============================================
echo   Done.
echo ============================================
