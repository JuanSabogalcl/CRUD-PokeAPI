@echo off
cd /d "%~dp0"
call scripts\entorno.cmd
if errorlevel 1 exit /b 1
echo Terminal preparada con Node.js, npm y Git.
cmd /k
