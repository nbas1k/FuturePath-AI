"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { DIRECTION_IDS, directionKey, type CareerDirection } from "@/catalog/directions";
import type { MessageKey } from "@/i18n";

type Item = { id: string; direction: CareerDirection; titles: { ru: string; kk: string; en: string }; readiness: "intro" | "cycle" };

export function CareerCatalog({ careers }: { careers: Item[] }) {
  const { t, lang } = useI18n();
  const [dir, setDir] = useState<CareerDirection | "all">("all");
  const [q, setQ] = useState("");

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return careers
      .filter((c) => (dir === "all" || c.direction === dir) && (!needle || Object.values(c.titles).some((x) => x.toLowerCase().includes(needle))))
      .sort((a, b) => a.titles[lang].localeCompare(b.titles[lang], lang));
  }, [careers, dir, q, lang]);

  const chip = (active: boolean) =>
    `shrink-0 rounded-full border-2 px-4 py-2 text-sm font-bold transition-colors duration-150 min-h-[44px] ${active ? "border-indigo-400 bg-indigo-50 text-indigo-800 dark:border-indigo-600 dark:bg-indigo-950 dark:text-indigo-200" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"}`;

  return (
    <div className="space-y-4">
      <label className="relative block">
        <span className="sr-only">{t("cat.search")}</span>
        <Search size={18} aria-hidden className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("cat.search")}
          className="min-h-[48px] w-full rounded-2xl border-2 border-slate-200 bg-white py-2 pl-11 pr-4 font-semibold outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-900" />
      </label>

      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label={t("cat.title")}>
        <button type="button" className={chip(dir === "all")} aria-pressed={dir === "all"} onClick={() => setDir("all")}>{t("cat.all")}</button>
        {DIRECTION_IDS.map((d) => (
          <button key={d} type="button" className={chip(dir === d)} aria-pressed={dir === d} onClick={() => setDir(d)}>{t(directionKey(d))}</button>
        ))}
      </div>

      {list.length === 0 ? (
        <p className="py-8 text-center font-semibold text-slate-500" role="status">{t("cat.noResults")}</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {list.map((c) => (
            <li key={c.id}>
              <Link href={`/professions/${c.id}`} className="card flex h-full min-h-[72px] flex-col justify-center gap-1 !py-3 transition-colors duration-150 hover:bg-slate-50 dark:hover:bg-slate-800">
                <span className="font-extrabold">{c.titles[lang]}</span>
                <span className="text-xs font-semibold text-slate-500">{t(directionKey(c.direction))} · {t(`cat.readiness.${c.readiness}` as MessageKey)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
