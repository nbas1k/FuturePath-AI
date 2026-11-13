"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Compass, GraduationCap, TrendingUp, User } from "lucide-react";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { useI18n } from "@/i18n/client";
import type { MessageKey } from "@/i18n";

// Ровно 5 разделов. Остальные страницы открываются изнутри них.
const SECTIONS: { href: string; key: MessageKey; icon: typeof Home; match: string[] }[] = [
  { href: "/", key: "nav.home", icon: Home, match: ["/", "/features"] },
  { href: "/professions", key: "nav.professions", icon: Compass, match: ["/professions", "/compare", "/test", "/result", "/assessment"] },
  { href: "/learn", key: "nav.learn", icon: GraduationCap, match: ["/learn", "/plan", "/ai"] },
  { href: "/progress", key: "nav.progress", icon: TrendingUp, match: ["/progress", "/path"] },
  { href: "/profile", key: "nav.profile", icon: User, match: ["/profile", "/cabinet"] },
];

// Экраны без навигации: на них пользователь выполняет одну задачу.
const FULLSCREEN = ["/onboarding", "/learn/lesson"];

function isActive(path: string, match: string[]) {
  return match.some((m) => (m === "/" ? path === "/" : path === m || path.startsWith(m + "/")));
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { t } = useI18n();
  if (path === "/assessment" || FULLSCREEN.some((p) => path === p || path.startsWith(p + "/"))) {
    return <main className="mx-auto min-h-dvh w-full max-w-xl px-4 py-6">{children}</main>;
  }
  return (
    <div className="md:flex">
      {/* Компьютер: компактное боковое меню */}
      <aside className="sticky top-0 hidden h-dvh w-20 shrink-0 flex-col items-center gap-2 border-r-2 border-slate-200 bg-white py-5 md:flex lg:w-60 lg:items-stretch lg:px-4 dark:border-slate-800 dark:bg-slate-900">
        <Link href="/" className="mb-4 flex justify-center lg:justify-start" aria-label={t("app.name")}><Logo compact /></Link>
        <nav className="flex flex-1 flex-col gap-1" aria-label={t("nav.main")}>
          {SECTIONS.map((s) => {
            const active = isActive(path, s.match);
            const Icon = s.icon;
            return (
              <Link key={s.href} href={s.href} aria-current={active ? "page" : undefined} title={t(s.key)}
                className={`flex min-h-[48px] items-center justify-center gap-3 rounded-2xl border-2 px-3 text-sm font-bold transition-colors duration-150 lg:justify-start ${active ? "border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-700 dark:bg-indigo-950 dark:text-indigo-200" : "border-transparent text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"}`}>
                <Icon size={22} aria-hidden />
                <span className="hidden lg:inline">{t(s.key)}</span>
              </Link>
            );
          })}
        </nav>
        <div className="flex justify-center lg:justify-start"><ThemeToggle /></div>
      </aside>

      <div className="min-w-0 flex-1">
        <main className="mx-auto max-w-3xl px-4 pb-28 pt-6 md:pb-10 md:pt-8">{children}</main>
      </div>

      {/* Телефон: нижняя панель из 5 разделов */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden dark:border-slate-800 dark:bg-slate-900/95" aria-label={t("nav.main")}>
        <ul className="mx-auto grid max-w-xl grid-cols-5">
          {SECTIONS.map((s) => {
            const active = isActive(path, s.match);
            const Icon = s.icon;
            return (
              <li key={s.href}>
                <Link href={s.href} aria-current={active ? "page" : undefined}
                  className={`flex min-h-[56px] flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-bold transition-colors duration-150 ${active ? "text-indigo-700 dark:text-indigo-300" : "text-slate-500 dark:text-slate-400"}`}>
                  <span className={`flex h-8 w-12 items-center justify-center rounded-xl transition-colors duration-150 ${active ? "bg-indigo-100 dark:bg-indigo-950" : ""}`}><Icon size={22} aria-hidden /></span>
                  <span className="max-w-full truncate">{t(s.key)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
