import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";

export const metadata: Metadata = {
  title: "FuturePath AI — подготовка к работе в эпоху ИИ",
  description: "Проверь навыки без ИИ, подтяни пробелы, поработай с ИИ и проверь прогресс заново. Учебный прототип хакатона.",
};

// Скрипт выставляет тему до отрисовки, чтобы не было мигания
const themeScript = "try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* Шрифты подключены в корневом layout для всех страниц (App Router), поэтому правило про отдельные страницы здесь не применимо */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geologica:wght@500;600;700&family=Golos+Text:wght@400;500;600;700&display=swap&subset=cyrillic" />
      </head>
      <body>
        <Nav />
        <main className="mx-auto max-w-5xl px-4 py-8 sm:py-10">{children}</main>
        <footer className="mx-auto mt-6 max-w-5xl border-t border-slate-200 px-4 py-6 text-xs leading-relaxed text-slate-500 dark:border-slate-800">
          FuturePath AI — учебный прототип хакатона. Тест не является научной психодиагностикой: это подсказка для размышления, а не приговор.
        </footer>
      </body>
    </html>
  );
}
