@echo off
where node.exe >nul 2>nul
if errorlevel 1 (
  for /d %%D in ("%LOCALAPPDATA%\OptativaIII-tools\node-*-win-x64") do set "PATH=%%~D;%PATH%"
)
where git.exe >nul 2>nul
if errorlevel 1 set "PATH=%LOCALAPPDATA%\OptativaIII-tools\git\cmd;%PATH%"
where node.exe >nul 2>nul
if errorlevel 1 (
  echo No se encuentra Node.js. Instala Node.js 22 o superior desde https://nodejs.org/
  exit /b 1
)
exit /b 0
