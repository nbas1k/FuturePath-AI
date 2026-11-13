import { describe, it, expect } from "vitest";
import { PROFESSIONS } from "@/data/professions";
import { DEFAULT_QUERY, filterProfessions, searchCatalog, sortProfessions, type CatalogQuery } from "@/data/catalogQuery";

const q = (patch: Partial<CatalogQuery>): CatalogQuery => ({ ...DEFAULT_QUERY, ...patch });

describe("поиск", () => {
  it("по названию находит профессию", () => {
    const r = filterProfessions(PROFESSIONS, q({ text: "психолог", scope: "title" }));
    expect(r.map((p) => p.id)).toContain("psychologist");
    r.forEach((p) => expect(p.title.toLowerCase()).toContain("психолог"));
  });
  it("по навыкам находит профессии с этим навыком", () => {
    const r = filterProfessions(PROFESSIONS, q({ text: "Python", scope: "skills" }));
    expect(r.length).toBeGreaterThan(0);
    r.forEach((p) => expect(p.skills.some((s) => s.toLowerCase().includes("python"))).toBe(true));
  });
  it("в режиме «в названии» не ищет по навыкам", () => {
    const r = filterProfessions(PROFESSIONS, q({ text: "Python", scope: "title" }));
    expect(r.length).toBe(0);
  });
  it("пустой запрос возвращает весь каталог", () => {
    expect(filterProfessions(PROFESSIONS, q({})).length).toBe(PROFESSIONS.length);
  });
  it("поиск не зависит от регистра", () => {
    expect(filterProfessions(PROFESSIONS, q({ text: "ПЕДАГОГ", scope: "title" })).length)
      .toBe(filterProfessions(PROFESSIONS, q({ text: "педагог", scope: "title" })).length);
  });
});

describe("фильтры", () => {
  it("по направлению — только выбранная категория", () => {
    const r = filterProfessions(PROFESSIONS, q({ category: "law" }));
    expect(r.length).toBeGreaterThanOrEqual(5);
    r.forEach((p) => expect(p.category).toBe("law"));
  });
  it("по уровню подготовки", () => {
    const r = filterProfessions(PROFESSIONS, q({ level: "college" }));
    expect(r.length).toBeGreaterThan(0);
    r.forEach((p) => expect(p.level).toBe("college"));
  });
  it("по школьному предмету", () => {
    const r = filterProfessions(PROFESSIONS, q({ subject: "bio" }));
    r.forEach((p) => expect(p.subjects).toContain("bio"));
  });
  it("«только мои интересы» оставляет категории пользователя", () => {
    const r = filterProfessions(PROFESSIONS, q({ onlyMyInterests: true }), { myCategories: ["cyber", "medicine"] });
    expect(r.length).toBeGreaterThan(0);
    r.forEach((p) => expect(["cyber", "medicine"]).toContain(p.category));
  });
  it("«только избранное» оставляет сохранённые", () => {
    const r = filterProfessions(PROFESSIONS, q({ favoritesOnly: true }), { favorites: ["doctor", "teacher"] });
    expect(r.map((p) => p.id).sort()).toEqual(["doctor", "teacher"]);
  });
  it("фильтры комбинируются", () => {
    const r = filterProfessions(PROFESSIONS, q({ category: "it", text: "тест", scope: "title" }));
    expect(r.map((p) => p.id)).toEqual(["qa-engineer"]);
  });
});

describe("сортировка", () => {
  it("по названию — по алфавиту", () => {
    const r = sortProfessions(PROFESSIONS, "title");
    for (let i = 1; i < r.length; i++) {
      expect(r[i - 1].title.localeCompare(r[i].title, "ru")).toBeLessThanOrEqual(0);
    }
  });
  it("по совпадению — лучшие сверху", () => {
    const matches = { doctor: 90, teacher: 40, "software-developer": 70 };
    const r = sortProfessions(PROFESSIONS.filter((p) => p.id in matches), "match", { matches });
    expect(r.map((p) => p.id)).toEqual(["doctor", "software-developer", "teacher"]);
  });
  it("по сложности — проще сверху", () => {
    const r = sortProfessions(PROFESSIONS, "level");
    expect(r[0].level).toBe("college");
    expect(r[r.length - 1].level).toBe("master");
  });
  it("результат поиска детерминирован: одинаковый запрос — одинаковый порядок", () => {
    const a = searchCatalog(PROFESSIONS, q({ sort: "title" })).map((p) => p.id);
    const b = searchCatalog(PROFESSIONS, q({ sort: "title" })).map((p) => p.id);
    expect(a).toEqual(b);
  });
});

import { calculate } from "@/recommendation-engine";
import { recommendDiverse } from "@/recommendation-engine";

describe("разнообразие рекомендаций", () => {
  it("не больше двух профессий из одной категории и не больше limit", () => {
    const answers = Object.fromEntries(
      [...Array(24)].map((_, i) => [`q${i + 1}`, "d"]),
    ) as Record<string, string>;
    const r = calculate(answers);
    const list = recommendDiverse(r, 6, 2);
    expect(list.length).toBeLessThanOrEqual(6);
    const counts = new Map<string, number>();
    list.forEach((m) => counts.set(m.profession.category, (counts.get(m.profession.category) ?? 0) + 1));
    counts.forEach((n) => expect(n).toBeLessThanOrEqual(2));
  });
});
