@echo off
setlocal

REM Sobe o th0th Tools API (PowerShell), com working dir correto.
REM Uso: double click ou rodar no terminal.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-tools-api.ps1"

endlocal

