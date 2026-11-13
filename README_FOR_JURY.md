# FuturePath AI — запуск для жюри / Jury setup

## Русский

1. Скачайте и распакуйте [репозиторий FuturePath AI](https://github.com/nbas1k/FuturePath-AI). Нужны Windows, интернет и Node.js 24 LTS с npm ([скачать Node.js](https://nodejs.org/)). Уже установленный Node.js 26 тоже подходит.
2. Положите полученный от команды файл **.env.jury** в папку рядом с **START_WINDOWS.bat**. Имя файла должно быть именно .env.jury, без окончания .txt.
3. Дважды щёлкните **START_WINDOWS.bat**. Дождитесь сообщения **Ready** и откройте [http://localhost:3001](http://localhost:3001). Для остановки нажмите Ctrl+C в окне запуска.

Запуск проверяет Groq и оба подключения к Neon, устанавливает зависимости по lock-файлу, генерирует Prisma Client, применяет миграции и собирает Next.js. PostgreSQL работает удалённо. На компьютере жюри нужны только Node.js и интернет.

Для демонстрации войдите как **jury@example.test** с паролем от команды или зарегистрируйте новый аккаунт. Заполните профиль, пройдите тест, откройте результаты и запросите ИИ-анализ. Проверьте сохранение данных после выхода и повторного входа. У демо-профиля есть пример записи в портфолио.

## English

1. Download and extract the [FuturePath AI repository](https://github.com/nbas1k/FuturePath-AI). Use Windows, internet access and Node.js 24 LTS with npm ([Node.js download](https://nodejs.org/)). An existing Node.js 26 installation is also supported.
2. Place the private **.env.jury** file supplied by the team next to **START_WINDOWS.bat**. Check that its name has no .txt suffix.
3. Double-click **START_WINDOWS.bat**. Wait for **Ready**, then open [http://localhost:3001](http://localhost:3001). Press Ctrl+C in the launcher window to stop.

The launcher checks Groq and both Neon connections, installs locked dependencies, generates Prisma Client, deploys migrations and builds Next.js. PostgreSQL runs remotely. The jury computer only needs Node.js and internet access.

Sign in as **jury@example.test** with the password supplied privately, or register a fresh account. Complete the profile and career assessment, open the results and request AI analysis. Sign out and back in to check persistence. The demo profile has a sample portfolio item.

## Настройка командой / Team configuration

Copy .env.example to .env.jury and fill in the following values. Передайте готовый файл жюри по закрытому каналу. Keep the file out of Git and revoke temporary credentials after judging.

| Variable | Value |
| --- | --- |
| DATABASE_URL | Pooled Neon URL for the dedicated database futurepath_jury with TLS. |
| DIRECT_DATABASE_URL | Direct Neon URL for the same branch, database, role and schema with TLS. |
| AI_PROVIDER | groq |
| GROQ_API_KEY | Temporary Groq key for judging. |
| GROQ_MODEL | Chat model enabled for that key. |
| JURY_DEMO_PASSWORD | Private demo password, 8–128 characters. Required to seed the demo account. |

In the separate Neon project, open Connect. Copy the connection string with Connection pooling enabled for DATABASE_URL, then disable pooling and copy the direct string. Create a temporary key in the Groq Console and choose a chat model available in that account. The launcher rejects localhost, mismatched endpoints and other database names. The local app binds to loopback on port 3001.

If startup fails, fix the item named in the console and run the batch file again. For database errors, check both Neon strings, access to TCP 5432 and the role's migration permissions. For Groq, check the key, model and quota. If port 3001 is in use, stop the application occupying it.

## Архитектура / Architecture

Next.js App Router serves the UI and API routes. Prisma reads and writes remote PostgreSQL. The application stores scrypt password hashes and hashed session tokens, with HttpOnly cookies on the client. The career assessment ranks results using the application's rules. The server requests AI analysis from Groq using those results and validates the response before showing it. An AI error can trigger the application's existing rule-based fallback, so verify the AI indicator when demonstrating the integration.

## Резервный запуск / Optional hosted demo

Use a separate Vercel project after approval. Set the same test database and Groq environment variables in its target environment, with COOKIE_SECURE unset for HTTPS and ADMIN_SECRET unset. Apply migrations and seed the demo account from the Windows launcher before deploying. Verify the hosted URL using a new account before sharing it with the jury. The hosted URL allows a browser-only demo and keeps the provider credentials on the server.
