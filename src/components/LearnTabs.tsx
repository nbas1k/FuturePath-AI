"use client";
import { useState, type ReactNode } from "react";
import type { LearnTab } from "@/learn/recommend";

type Props = {
  tabs: { id: LearnTab; label: string }[];
  recommended: { tab: LearnTab; title: string; text: string };
  panels: Partial<Record<LearnTab, ReactNode>>;
  initialTab?: LearnTab; // из ссылки /learn?tab=...
};

// Рекомендация + переключатель между инструментами обучения. Показываются только инструменты, которые есть для профессии.
export function LearnTabs({ tabs, recommended, panels, initialTab }: Props) {
  const start = initialTab && tabs.some((t) => t.id === initialTab) ? initialTab : recommended.tab;
  const [tab, setTab] = useState<LearnTab>(start);
  const label = tabs.find((t) => t.id === recommended.tab)?.label ?? "";
  return (
    <div className="space-y-5">
      <div className="card flex flex-wrap items-center justify-between gap-3 border-l-4 !border-l-marker">
        <div>
          <p className="text-sm font-medium text-slate-500">Рекомендуем сейчас</p>
          <p className="font-semibold">{recommended.title}</p>
          <p className="text-sm text-slate-600 dark:text-slate-400">{recommended.text}</p>
        </div>
        {tab !== recommended.tab && <button className="btn-primary" onClick={() => setTab(recommended.tab)}>Перейти: {label}</button>}
      </div>

      <div role="tablist" aria-label="Инструменты обучения" className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto border-b border-slate-200 px-4 dark:border-slate-800 sm:mx-0 sm:px-0">
        {tabs.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
            className={"-mb-px shrink-0 whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm transition-colors " + (tab === t.id ? "border-slate-900 font-semibold text-slate-900 dark:border-marker dark:text-white" : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white")}>
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel">{panels[tab]}</div>
    </div>
  );
}
