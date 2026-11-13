@echo off
title FuturePath AI
cd /d "%~dp0"
echo.
echo === FuturePath AI: start ===
echo.
where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js not found. Install Node.js 24 LTS from https://nodejs.org
  pause
  exit /b 1
)
if not exist ".env" (
  copy /y ".env.example" ".env" >nul
  echo [!] Created .env from .env.example.
  echo     Fill DATABASE_URL and DIRECT_DATABASE_URL with your PostgreSQL connection, then run start.bat again.
  notepad ".env"
  pause
  exit /b 1
)
node -e "const {parseEnv}=require('node:util'); const e=parseEnv(require('node:fs').readFileSync('.env','utf8')); for(const k of ['DATABASE_URL','DIRECT_DATABASE_URL']) if(!(process.env[k] ?? e[k])?.trim()){console.error('[ERROR] Set '+k+' in .env before running Prisma.'); process.exit(1);}"
if errorlevel 1 (
  pause
  exit /b 1
)
if not exist "node_modules\.bin\next.cmd" (
  echo [1/3] Installing dependencies, this takes a few minutes...
  call npm install
  if errorlevel 1 (
    echo [ERROR] npm install failed. See the messages above.
    pause
    exit /b 1
  )
) else (
  echo [1/3] Dependencies are installed.
)
echo [2/3] Preparing the database...
call npx prisma generate
if errorlevel 1 (
  echo [ERROR] Prisma Client generation failed.
  pause
  exit /b 1
)
call npx prisma migrate deploy
if errorlevel 1 (
  echo [ERROR] Migration failed. Check DATABASE_URL, DIRECT_DATABASE_URL and the Prisma output above.
  pause
  exit /b 1
)
echo [3/3] Starting http://localhost:3001  (close this window or press Ctrl+C to stop)
echo.
start "" http://localhost:3001
call npm run dev
pause
