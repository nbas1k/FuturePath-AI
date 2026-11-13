"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { CATEGORIES, categoryName, SUBJECT_AREAS, type CategoryId, type SubjectArea } from "@/data/categories";
import { LEVEL_LABELS, type Level, type Profession } from "@/data/professions";
import { DEFAULT_QUERY, searchCatalog, type CatalogQuery, type SearchScope, type SortKey } from "@/data/catalogQuery";
import { useFavorites } from "./useFavorites";

type Props = {
  professions: Profession[];
  matches: Record<string, number>; // пусто, если результата нет
  myCategories: CategoryId[];
  hasInterests: boolean; // есть ли результат с интересами (версия 2)
};

const selectCls = "min-w-0 max-w-full rounded-xl border border-slate-300 bg-white p-2.5 text-sm dark:border-slate-700 dark:bg-slate-900";

// Каталог: поиск по названию и навыкам, фильтры, сортировка, избранное и выбор двух профессий для сравнения
export function ProfessionCatalog({ professions, matches, myCategories, hasInterests }: Props) {
  const [q, setQ] = useState<CatalogQuery>(DEFAULT_QUERY);
  const [compare, setCompare] = useState<string[]>([]);
  const { ids: favorites, toggle: toggleFav } = useFavorites();
  const hasMatches = Object.keys(matches).length > 0;

  const list = useMemo(
    () => searchCatalog(professions, q, { matches, myCategories, favorites }),
    [professions, q, matches, myCategories, favorites],
  );

  const set = (patch: Partial<CatalogQuery>) => setQ((prev) => ({ ...prev, ...patch }));

  function toggleCompare(id: string) {
    setCompare((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id]; // держим не больше двух: новая вытесняет самую старую
      return [...prev, id];
    });
  }

  return (
    <div className="space-y-5">
      {/* Поиск */}
      <div className="card space-y-3 !p-4">
        <div className="flex flex-wrap gap-2">
          <input
            value={q.text}
            onChange={(e) => set({ text: e.target.value })}
            placeholder={q.scope === "skills" ? "Например: Python, эмпатия, чертежи…" : "Название профессии…"}
            aria-label="Поиск"
            className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white p-2.5 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
          <select value={q.scope} onChange={(e) => set({ scope: e.target.value as SearchScope })} aria-label="Где искать" className={selectCls}>
            <option value="all">Везде</option>
            <option value="title">В названии</option>
            <option value="skills">По навыкам</option>
          </select>
        </div>

        {/* Фильтры */}
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <select value={q.category} onChange={(e) => set({ category: e.target.value as CategoryId | "all" })} aria-label="Направление" className={selectCls}>
            <option value="all">Все направления</option>
            {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={q.level} onChange={(e) => set({ level: e.target.value as Level | "all" })} aria-label="Уровень подготовки" className={selectCls}>
            <option value="all">Любой уровень</option>
            {(Object.keys(LEVEL_LABELS) as Level[]).map((l) => <option key={l} value={l}>{LEVEL_LABELS[l]}</option>)}
          </select>
          <select value={q.subject} onChange={(e) => set({ subject: e.target.value as SubjectArea | "all" })} aria-label="Школьный предмет" className={selectCls}>
            <option value="all">Любой школьный предмет</option>
            {SUBJECT_AREAS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select value={q.sort} onChange={(e) => set({ sort: e.target.value as SortKey })} aria-label="Сортировка" className={selectCls}>
            <option value="title">По названию</option>
            <option value="match" disabled={!hasMatches}>По совпадению {hasMatches ? "" : "(нужен тест)"}</option>
            <option value="level">Сначала проще по подготовке</option>
          </select>
        </div>

        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={q.onlyMyInterests} disabled={!hasInterests || myCategories.length === 0}
              onChange={(e) => set({ onlyMyInterests: e.target.checked })} className="accent-indigo-600" />
            Только мои интересы {!hasInterests && <span className="text-xs text-slate-500">(нужен обновлённый тест)</span>}
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={q.favoritesOnly} onChange={(e) => set({ favoritesOnly: e.target.checked })} className="accent-indigo-600" />
            Только избранное ({favorites.length})
          </label>
          <button className="text-indigo-600 underline dark:text-indigo-400" onClick={() => { setQ(DEFAULT_QUERY); }}>Сбросить фильтры</button>
        </div>
      </div>

      {/* Сравнение */}
      {compare.length > 0 && (
        <div className="card flex flex-wrap items-center justify-between gap-3 !p-4">
          <p className="text-sm">Для сравнения выбрано: {compare.length} из 2 {compare.length === 1 && "— выберите ещё одну"}</p>
          {compare.length === 2 ? (
            <Link href={`/compare?a=${compare[0]}&b=${compare[1]}`} className="btn-primary">Сравнить таблицей</Link>
          ) : (
            <button className="btn-ghost" onClick={() => setCompare([])}>Очистить</button>
          )}
        </div>
      )}

      <p className="text-sm text-slate-500">Найдено: {list.length} из {professions.length}</p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((p) => {
          const fav = favorites.includes(p.id);
          const sel = compare.includes(p.id);
          return (
            <article key={p.id} className="card flex flex-col transition hover:-translate-y-0.5 hover:border-indigo-400">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="chip">{categoryName(p.category)}</span>
                {matches[p.id] !== undefined && <span className="chip">Совпадение {matches[p.id]}%</span>}
              </div>
              <Link href={`/professions/${p.id}`} className="font-semibold hover:text-indigo-600 dark:hover:text-indigo-400">{p.title}</Link>
              <p className="mt-1 line-clamp-3 text-sm text-slate-500">{p.description}</p>
              <p className="mt-2 text-xs text-slate-500">Подготовка: {LEVEL_LABELS[p.level]}</p>
              <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-4">
                <div className="flex gap-2">
                  <button onClick={() => toggleFav(p.id)} aria-pressed={fav} className="btn-ghost !px-3 !py-1.5 text-xs">{fav ? "★ В избранном" : "☆ В избранное"}</button>
                  <button onClick={() => toggleCompare(p.id)} aria-pressed={sel} className={`${sel ? "btn-primary" : "btn-ghost"} !px-3 !py-1.5 text-xs`}>
                    {sel ? "✓ Выбрано" : "Сравнить"}
                  </button>
                </div>
                <Link href={`/professions/${p.id}`} className="text-xs text-indigo-600 dark:text-indigo-400">Подробнее →</Link>
              </div>
            </article>
          );
        })}
      </div>
      {list.length === 0 && <p className="py-8 text-center text-sm text-slate-500">Ничего не найдено. Попробуйте другой запрос или сбросьте фильтры.</p>}
    </div>
  );
}
