import { describe, expect, it } from "vitest";
import { CAREERS, UNIVERSAL_SKILLS, checkChallenge, rotateChallenge } from "@/catalog/build";
import { DIRECTION_IDS } from "@/catalog/directions";
import { EXTRAS } from "@/catalog/extras";
import { PROFESSIONS } from "@/data/professions";

describe("каталог 2.0", () => {
  it("не меньше 100 профессий, у каждой профессии каталога есть данные этапа 4 и наоборот", () => {
    expect(CAREERS.length).toBeGreaterThanOrEqual(100);
    expect(EXTRAS.length).toBe(PROFESSIONS.length);
    expect(new Set(EXTRAS.map((e) => e.id)).size).toBe(EXTRAS.length);
  });
  it("10 направлений, в каждом не меньше 6 профессий", () => {
    for (const d of DIRECTION_IDS) expect(CAREERS.filter((c) => c.direction === d).length, d).toBeGreaterThanOrEqual(6);
  });
  it("id и названия на ru/kk/en уникальны и непусты", () => {
    expect(new Set(CAREERS.map((c) => c.id)).size).toBe(CAREERS.length);
    for (const l of ["ru", "kk", "en"] as const) {
      const titles = CAREERS.map((c) => c.titles[l]);
      expect(titles.every((t) => t.trim().length > 1), l).toBe(true);
      expect(new Set(titles).size, l).toBe(titles.length);
    }
  });
  it("нет 100 одинаковых карточек: описания, наборы компетенций и задания различаются", () => {
    expect(new Set(CAREERS.map((c) => c.description)).size).toBe(CAREERS.length);
    expect(new Set(CAREERS.map((c) => c.competencies.map((x) => x.name).join("|"))).size).toBe(CAREERS.length);
    expect(new Set(CAREERS.map((c) => c.challenge.question)).size).toBe(CAREERS.length);
  });
  it("у каждой профессии заполнены все обязательные поля", () => {
    for (const c of CAREERS) {
      expect(c.tasks.length, c.id).toBeGreaterThanOrEqual(2);
      expect(c.competencies.length, c.id).toBeGreaterThanOrEqual(4);
      expect(c.prerequisites.subjects.length, c.id).toBeGreaterThan(0);
      expect(c.examples.length, c.id).toBeGreaterThan(0);
      expect(c.route.study.length, c.id).toBeGreaterThan(0);
      expect(Object.keys(c.universal).sort(), c.id).toEqual([...UNIVERSAL_SKILLS].sort());
      expect(c.topUniversal).toHaveLength(4);
      expect(c.holland, c.id).toMatch(/^[RIASEC]{3}$/);
      expect(new Set(c.holland).size, c.id).toBe(3);
      expect(["intro", "cycle"]).toContain(c.readiness);
      expect(c.reviewStatus).toBe("draft"); // не выдаём за проверенное экспертами
    }
  });
  it("вводные задания корректны: 3 варианта, верный в границах, нет одинаковых вариантов", () => {
    for (const e of EXTRAS) {
      expect(e.options).toHaveLength(3);
      expect(new Set(e.options).size, e.id).toBe(3);
      expect(e.correct).toBeGreaterThanOrEqual(0);
      expect(e.correct).toBeLessThan(3);
      expect(e.why.length, e.id).toBeGreaterThan(10);
    }
  });
  it("ротация вариантов детерминирована и сохраняет верный ответ", () => {
    for (const e of EXTRAS) {
      const a = rotateChallenge(e), b = rotateChallenge(e);
      expect(a).toEqual(b);
      expect(a.options[a.correct]).toBe(e.options[e.correct]);
    }
    const positions = new Set(EXTRAS.map((e) => rotateChallenge(e).correct));
    expect(positions.size).toBe(3); // верный ответ не всегда на одном месте
  });
  it("проверка задания на сервере: верный/неверный/некорректный выбор", () => {
    const c = CAREERS[0];
    const e = EXTRAS.find((x) => x.id === c.id)!;
    const r = rotateChallenge(e);
    const ok = checkChallenge(c.id, r.correct);
    expect(ok.ok && ok.correct).toBe(true);
    const bad = checkChallenge(c.id, (r.correct + 1) % 3);
    expect(bad.ok && !bad.correct).toBe(true);
    expect(checkChallenge(c.id, 7).ok).toBe(false);
    expect(checkChallenge("нет", 0).ok).toBe(false);
  });
  it("в публичных данных нет правильного ответа", () => {
    expect(JSON.stringify(CAREERS[0])).not.toContain("correct");
  });
  it("профили для диагностики индивидуальны: профессии одной категории различаются", () => {
    const it = CAREERS.filter((c) => c.category === "it").map((c) => c.holland);
    expect(new Set(it).size).toBeGreaterThan(1);
  });
});
