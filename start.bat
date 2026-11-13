@echo off
chcp 65001 >nul
title FuturePath AI - сервер

REM Переходим в папку, где лежит этот файл (работает из любого места)
cd /d "%~dp0"

echo.
echo === FuturePath AI: запуск ===
echo.

REM 1. Проверяем, установлен ли Node.js
where node >nul 2>nul
if errorlevel 1 (
    echo [ОШИБКА] Node.js не найден. Установите версию 20 или новее с https://nodejs.org
    pause
    exit /b 1
)

REM 2. Если библиотек нет, устанавливаем их (делается один раз)
if not exist "node_modules" (
    echo [1/3] Устанавливаю библиотеки, это может занять несколько минут...
    call npm install
    if errorlevel 1 (
        echo [ОШИБКА] npm install не выполнился. Смотрите текст выше.
        pause
        exit /b 1
    )
) else (
    echo [1/3] Библиотеки уже установлены.
)

REM 3. Если базы данных нет, создаём её (делается один раз)
if not exist "prisma\dev.db" (
    echo [2/3] Создаю базу данных...
    call npx prisma db push
    if errorlevel 1 (
        echo [ОШИБКА] Не удалось создать базу данных. Смотрите текст выше.
        pause
        exit /b 1
    )
) else (
    echo [2/3] База данных уже есть.
)

REM 4. Запускаем сайт на порту 3001
echo [3/3] Запускаю сервер на http://localhost:3001
echo Чтобы остановить сервер, закройте это окно или нажмите Ctrl+C.
echo.
start "" http://localhost:3001
call npm run dev

pause
