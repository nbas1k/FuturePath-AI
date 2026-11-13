@echo off
setlocal
cd /d "%~dp0" || exit /b 1
title FuturePath AI - Jury
where.exe node.exe >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Install Node.js 24 LTS from https://nodejs.org/ and reopen this file.
  goto :failed
)
node.exe -e "process.exit([24, 26].includes(Number(process.versions.node.split('.')[0])) ? 0 : 1)"
if errorlevel 1 (
  echo [ERROR] Use Node.js 24 LTS or Node.js 26. Run node --version to check your installation.
  goto :failed
)
where.exe npm.cmd >nul 2>nul
if errorlevel 1 (
  echo [ERROR] npm was not found. Reinstall Node.js with npm and add it to PATH.
  goto :failed
)
node.exe scripts\jury-start.cjs
if errorlevel 1 goto :failed
exit /b 0

:failed
echo See README_FOR_JURY.md for setup and troubleshooting.
pause
exit /b 1