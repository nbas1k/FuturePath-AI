import { describe, expect, it } from "vitest";
import { TRACKS } from "@/content";
import { toRow } from "@/learn/convert";
import { gradeExercise, norm } from "@/learn/engine";
import { CAREER_BY_ID } from "@/catalog/build";
import { UNIVERSAL_SKILLS } from "@/catalog/build";

// «Идеальный» ответ по ключу: проверяем, что ключ и данные согласованы и верный ответ действительно оценивается как верный.
function perfect(row: ReturnType<typeof toRow>): unknown {
  const k = row.answerKey as any;
  switch (row.type) {
    case "choice": case "case": return k.correct;
    case "multi": return k.correct;
    case "match": return k.map;
    case "order": return k.order;
    case "fill": return k.blanks.map((b: string[]) => b[0]);
    case "text": return k.groups.slice(0, k.min).map((g: string[]) => g[0]).join(" ");
    case "project": return { checked: Array.from({ length: k.n }, () => true) };
  }
}

describe("контент обучения", () => {
  const lessons = TRACKS.flatMap((t) => t.modules.flatMap((m) => m.lessons.map((l) => ({ track: t, module: m, lesson: l }))));

  it("есть 4 профессиональных маршрута (медицина, программирование, архитектура, бизнес) и они связаны с каталогом", () => {
    const careers = TRACKS.filter((t) => t.kind === "career").map((t) => t.id.split(":")[1]);
    expect(careers.sort()).toEqual(["architect", "doctor", "entrepreneur", "software-developer"]);
    for (const c of careers) expect(CAREER_BY_ID.has(c), c).toBe(true);
  });
  it("каждый профессиональный маршрут: 3 модуля × 2 урока, id уникальны", () => {
    for (const t of TRACKS.filter((x) => x.kind === "career")) {
      expect(t.modules).toHaveLength(3);
      for (const m of t.modules) expect(m.lessons).toHaveLength(2);
    }
    const ids = lessons.map((x) => x.lesson.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("урок: 3–10 минут, теория, цели и не менее 4 упражнений разных типов", () => {
    for (const { lesson } of lessons) {
      expect(lesson.minutes ?? 5, lesson.id).toBeGreaterThanOrEqual(3);
      expect(lesson.minutes ?? 5, lesson.id).toBeLessThanOrEqual(10);
      expect(lesson.theory.length, lesson.id).toBeGreaterThanOrEqual(2);
      expect(lesson.objectives.length, lesson.id).toBeGreaterThan(0);
      expect(lesson.exercises.length, lesson.id).toBeGreaterThanOrEqual(4);
      expect(new Set(lesson.exercises.map((e) => e.type)).size, lesson.id).toBeGreaterThanOrEqual(3); // не только обычные тесты
    }
  });
  it("уроки идут по структуре: фазы first → harder → apply → check", () => {
    const rank = { first: 0, harder: 1, apply: 2, check: 3 } as const;
    for (const { lesson } of lessons) {
      let prev = 0;
      for (const e of lesson.exercises) { const r = rank[e.phase ?? "check"]; expect(r, lesson.id).toBeGreaterThanOrEqual(prev); prev = r; }
    }
  });
  it("верный ответ по ключу оценивается как верный для каждого упражнения", () => {
    for (const { lesson } of lessons) lesson.exercises.forEach((e, i) => {
      const row = toRow(e, `${lesson.id}/e${i + 1}`, lesson.comps);
      const g = gradeExercise(row.type as any, row.data, row.answerKey, perfect(row));
      expect(g, `${lesson.id}/e${i + 1} ${row.type}`).not.toBeNull();
      expect(g!.correct, `${lesson.id}/e${i + 1} ${row.type}`).toBe(true);
      expect(g!.score).toBe(1);
    });
  });
  it("в упражнениях нет пустых текстов, ключевые слова для text нормализуются непусто", () => {
    for (const { lesson } of lessons) lesson.exercises.forEach((e) => {
      expect(String(typeof e.prompt === "string" ? e.prompt : e.prompt.ru).length).toBeGreaterThan(5);
      expect(String(typeof e.explain === "string" ? e.explain : e.explain.ru).length).toBeGreaterThan(10);
      if (e.type === "text") for (const g of e.groups) for (const k of g) expect(norm(k).length).toBeGreaterThan(1);
      if (e.type === "choice" || e.type === "case") { expect(e.options.length).toBeGreaterThanOrEqual(3); expect(e.correct).toBeLessThan(e.options.length); }
    });
  });
  it("компетенции: id профессии существуют в матрице каталога, универсальные — среди 12 навыков", () => {
    for (const { track, lesson } of lessons) {
      for (const c of lesson.comps) {
        if (c.startsWith("us:")) expect((UNIVERSAL_SKILLS as readonly string[]).includes(c.slice(3)), c).toBe(true);
        else expect(CAREER_BY_ID.get(c.split(":")[0])?.competencies.some((k) => k.id === c), `${lesson.id} -> ${c}`).toBe(true);
      }
      void track;
    }
  });
  it("в каждом профессиональном маршруте есть задания разных типов, включая кейс и мини-проект", () => {
    for (const t of TRACKS.filter((x) => x.kind === "career")) {
      const types = new Set(t.modules.flatMap((m) => m.lessons.flatMap((l) => l.exercises.map((e) => e.type))));
      for (const need of ["choice", "multi", "match", "order", "fill", "text", "case", "project"]) expect(types.has(need as any), `${t.id}: ${need}`).toBe(true);
    }
  });
  it("в медицинском маршруте нет рекомендаций по лечению и диагнозов", () => {
    const doctor = JSON.stringify(TRACKS.find((t) => t.id === "career:doctor")).toLowerCase();
    for (const bad of ["принимайте", "назначьте", "дозировк", "поставьте диагноз", "лечится"]) expect(doctor.includes(bad), bad).toBe(false);
  });
});