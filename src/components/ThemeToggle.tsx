"use client";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useI18n } from "@/i18n/client";

// Переключатель светлой/тёмной темы; выбор хранится в localStorage
export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const { t } = useI18n();
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);
  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("theme", next ? "dark" : "light"); } catch {}
  }
  return (
    <button onClick={toggle} className="btn-ghost !min-h-[44px] !px-3 !py-2" aria-label={t("common.theme")}>
      {dark ? <Sun size={20} aria-hidden /> : <Moon size={20} aria-hidden />}
    </button>
  );
}
