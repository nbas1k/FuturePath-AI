import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { I18nProvider } from "@/i18n/client";
import { getLang } from "@/i18n/server";

export const metadata: Metadata = {
  title: "FuturePath AI — профессии и навыки будущего",
  description: "Короткие уроки, симуляции профессий и ИИ-наставник. Учебный прототип: результаты теста — подсказка для размышления, а не диагноз.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#28A86B" };

// Скрипт выставляет тему до отрисовки, чтобы не было мигания
const themeScript = "try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  return (
    <html lang={lang} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* Nunito поддерживает кириллицу и казахские буквы (cyrillic-ext) */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap&subset=cyrillic,cyrillic-ext" />
      </head>
      <body>
        <I18nProvider lang={lang}>
          <AppShell>{children}</AppShell>
        </I18nProvider>
      </body>
    </html>
  );
}
