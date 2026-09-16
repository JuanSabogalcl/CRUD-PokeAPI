@echo off
cd /d "%~dp0"
call scripts\entorno.cmd
if errorlevel 1 goto fin
if not exist node_modules\express call npm.cmd ci --no-fund --no-audit
if errorlevel 1 goto fin
call npm.cmd test
:fin
pause
