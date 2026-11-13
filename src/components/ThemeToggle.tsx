"use client";
import { useEffect, useState } from "react";

// Переключатель светлой/тёмной темы; выбор хранится в localStorage
export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);
  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("theme", next ? "dark" : "light"); } catch {}
  }
  return (
    <button onClick={toggle} className="btn-ghost !px-3 !py-2" aria-label="Переключить тему">
      {dark ? "☀️" : "🌙"}
    </button>
  );
}
