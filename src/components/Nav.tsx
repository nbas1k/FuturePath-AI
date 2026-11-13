"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

// Ровно 5 разделов. Остальные страницы открываются изнутри них.
const SECTIONS = [
  { href: "/", label: "Главная", match: ["/", "/features"] },
  { href: "/path", label: "Мой путь", match: ["/path", "/test", "/result"] },
  { href: "/learn", label: "Обучение", match: ["/learn", "/plan", "/ai"] },
  { href: "/professions", label: "Профессии", match: ["/professions", "/compare"] },
  { href: "/profile", label: "Профиль", match: ["/profile", "/cabinet"] },
];

function isActive(path: string, match: string[]) {
  return match.some((m) => (m === "/" ? path === "/" : path === m || path.startsWith(m + "/")));
}

export function Nav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" onClick={() => setOpen(false)}><Logo /></Link>
        <nav className="hidden items-center gap-1 sm:flex" aria-label="Основное меню">
          {SECTIONS.map((s) => {
            const active = isActive(path, s.match);
            return (
              <Link key={s.href} href={s.href} aria-current={active ? "page" : undefined}
                className={`relative px-3 py-2 text-sm transition-colors hover:text-slate-900 dark:hover:text-white ${active ? "font-semibold text-slate-900 after:absolute after:inset-x-3 after:-bottom-[13px] after:h-0.5 after:bg-marker dark:text-white" : "text-slate-600 dark:text-slate-400"}`}>
                {s.label}
              </Link>
            );
          })}
          <ThemeToggle />
        </nav>
        <div className="flex items-center gap-2 sm:hidden">
          <ThemeToggle />
          <button className="btn-ghost !px-3 !py-2" onClick={() => setOpen(!open)} aria-label="Меню" aria-expanded={open}>☰</button>
        </div>
      </div>
      {open && (
        <nav className="flex flex-col border-t border-slate-200 px-4 py-2 sm:hidden dark:border-slate-800" aria-label="Меню">
          {SECTIONS.map((s) => (
            <Link key={s.href} href={s.href} onClick={() => setOpen(false)}
              className={`border-l-2 px-3 py-3 text-sm ${isActive(path, s.match) ? "border-marker font-semibold text-slate-900 dark:text-white" : "border-transparent text-slate-600 dark:text-slate-400"}`}>
              {s.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
