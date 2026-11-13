"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { CATEGORY_LABELS, FEATURES, STATUS_LABELS, type FeatureCategory, type FeatureStatus, type Needs } from "@/data/features";

const NEEDS_TEXT: Record<Needs, string> = { none: "Ничего не нужно", profession: "Нужна выбранная профессия (выбор прямо на странице)", test: "Нужен пройденный тест" };
const STATUS_STYLE: Record<FeatureStatus, string> = {
  ready: "bg-indigo-50 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200",
  partial: "bg-marker-soft text-marker-ink dark:bg-amber-950 dark:text-amber-200",
  missing: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

export function FeaturesCatalog() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<FeatureCategory | "all">("all");
  const [st, setSt] = useState<FeatureStatus | "all">("all");

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return FEATURES.filter((f) => (cat === "all" || f.category === cat) && (st === "all" || f.status === st) && (!t || `${f.title} ${f.desc} ${f.limit}`.toLowerCase().includes(t)));
  }, [q, cat, st]);

  const field = "rounded-lg border border-slate-300 bg-white p-2.5 text-sm dark:border-slate-700 dark:bg-slate-900";
  return (
    <div className="space-y-5">
      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск по возможностям" aria-label="Поиск по возможностям" className={field} />
        <select value={cat} onChange={(e) => setCat(e.target.value as FeatureCategory | "all")} aria-label="Категория" className={field}>
          <option value="all">Все категории</option>
          {(Object.keys(CATEGORY_LABELS) as FeatureCategory[]).map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
        </select>
        <select value={st} onChange={(e) => setSt(e.target.value as FeatureStatus | "all")} aria-label="Статус" className={field}>
          <option value="all">Любой статус</option>
          {(Object.keys(STATUS_LABELS) as FeatureStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
      </div>
      <p className="text-sm text-slate-500" aria-live="polite">Показано: {list.length} из {FEATURES.length}</p>
      {list.length === 0 && <p className="card text-sm text-slate-500">Ничего не найдено. Сбросьте поиск или фильтры.</p>}
      {(Object.keys(CATEGORY_LABELS) as FeatureCategory[]).map((c) => {
        const items = list.filter((f) => f.category === c);
        if (items.length === 0) return null;
        return (
          <section key={c} aria-labelledby={`cat-${c}`} className="space-y-3">
            <div className="flex items-baseline gap-3 border-b border-slate-300 pb-2 dark:border-slate-700">
              <h2 id={`cat-${c}`} className="text-xl font-semibold">{CATEGORY_LABELS[c]}</h2>
              <span className="text-sm text-slate-500">{items.length} из {FEATURES.filter((f) => f.category === c).length}</span>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2">
            {items.map((f) => (
          <li key={f.n} id={`f${f.n}`} className={"card flex flex-col space-y-2 border-l-4 " + (f.status === "ready" ? "!border-l-indigo-600 dark:!border-l-indigo-300" : f.status === "partial" ? "!border-l-marker" : "!border-l-slate-300 dark:!border-l-slate-700")}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-slate-500">Функция {f.n}</p>
                <h3 className="font-semibold">{f.title}</h3>
              </div>
              <span className={"shrink-0 rounded px-2 py-0.5 text-xs font-medium " + STATUS_STYLE[f.status]}>{STATUS_LABELS[f.status]}</span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">{f.desc}</p>
            {f.limit && <p className="text-xs text-slate-500"><b>Ограничения:</b> {f.limit}</p>}
            {f.status !== "missing" && <p className="text-xs text-slate-500"><b>Что нужно:</b> {NEEDS_TEXT[f.needs]}</p>}
            <div className="mt-auto pt-1">
              {f.href ? <Link href={f.href} className="btn-primary !py-1.5 text-sm">Открыть</Link> : <span className="text-xs font-medium text-slate-500">Кнопки запуска нет: функции пока нет</span>}
            </div>
          </li>
            ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
