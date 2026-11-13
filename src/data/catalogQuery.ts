// Поиск, фильтры и сортировка каталога. Чистые функции: без React и без базы, поэтому их легко тестировать.
import type { CategoryId, SubjectArea } from "./categories";
import { LEVEL_DIFFICULTY, type Level, type Profession } from "./professions";

export type SearchScope = "all" | "title" | "skills";
export type SortKey = "title" | "match" | "level";

export type CatalogQuery = {
  text: string; // что ищем
  scope: SearchScope; // где ищем: везде, в названии или в навыках
  category: CategoryId | "all";
  level: Level | "all";
  subject: SubjectArea | "all";
  onlyMyInterests: boolean; // только категории, которые подходят по интересам пользователя
  favoritesOnly: boolean;
  sort: SortKey;
};

export const DEFAULT_QUERY: CatalogQuery = {
  text: "",
  scope: "all",
  category: "all",
  level: "all",
  subject: "all",
  onlyMyInterests: false,
  favoritesOnly: false,
  sort: "title",
};

// Контекст пользователя: совпадения, любимые категории, избранное
export type CatalogContext = {
  matches?: Record<string, number>; // id профессии -> совпадение 0..100 (если есть результат)
  myCategories?: CategoryId[]; // категории, которые подходят по интересам (топ-3)
  favorites?: string[]; // id избранных
};

// Совпадает ли профессия с текстом поиска в выбранной области
export function matchesText(p: Profession, text: string, scope: SearchScope): boolean {
  const t = text.trim().toLowerCase();
  if (!t) return true;
  const inTitle = p.title.toLowerCase().includes(t);
  const inSkills = p.skills.some((s) => s.toLowerCase().includes(t));
  if (scope === "title") return inTitle;
  if (scope === "skills") return inSkills;
  return inTitle || inSkills || p.description.toLowerCase().includes(t);
}

export function filterProfessions(list: Profession[], q: CatalogQuery, ctx: CatalogContext = {}): Profession[] {
  return list.filter((p) => {
    if (!matchesText(p, q.text, q.scope)) return false;
    if (q.category !== "all" && p.category !== q.category) return false;
    if (q.level !== "all" && p.level !== q.level) return false;
    if (q.subject !== "all" && !p.subjects.includes(q.subject)) return false;
    if (q.onlyMyInterests && !(ctx.myCategories ?? []).includes(p.category)) return false;
    if (q.favoritesOnly && !(ctx.favorites ?? []).includes(p.id)) return false;
    return true;
  });
}

// Сортировка: по названию (алфавит), по совпадению (сверху — лучшие), по сложности (сначала проще)
export function sortProfessions(list: Profession[], sort: SortKey, ctx: CatalogContext = {}): Profession[] {
  const copy = [...list];
  const byTitle = (a: Profession, b: Profession) => a.title.localeCompare(b.title, "ru");
  if (sort === "match" && ctx.matches) {
    const m = ctx.matches;
    copy.sort((a, b) => (m[b.id] ?? -1) - (m[a.id] ?? -1) || byTitle(a, b));
  } else if (sort === "level") {
    copy.sort((a, b) => LEVEL_DIFFICULTY[a.level] - LEVEL_DIFFICULTY[b.level] || byTitle(a, b));
  } else {
    copy.sort(byTitle);
  }
  return copy;
}

export function searchCatalog(list: Profession[], q: CatalogQuery, ctx: CatalogContext = {}): Profession[] {
  return sortProfessions(filterProfessions(list, q, ctx), q.sort, ctx);
}
