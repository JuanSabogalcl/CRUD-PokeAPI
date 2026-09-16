@echo off
cd /d "%~dp0"
call scripts\entorno.cmd
if errorlevel 1 goto fin
if not exist node_modules\express call npm.cmd ci --no-fund --no-audit
if errorlevel 1 goto fin
echo Abre http://localhost:3000 en el navegador. Ctrl+C para detener.
call npm.cmd start
:fin
pause
