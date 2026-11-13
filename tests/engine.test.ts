import { describe, it, expect } from "vitest";
import { QUESTIONS, TEST_VERSIONS, questionsFor, CURRENT_TEST_VERSION, type Question } from "@/data/questions";
import { PROFESSIONS, effectiveDirections, LEVEL_LABELS } from "@/data/professions";
import { CATEGORIES, type CategoryId } from "@/data/categories";
import { DIRECTIONS } from "@/data/directions";
import { buildPlan } from "@/data/plan";
import { calculate, validateAnswers, maxScore, findProblem, type Answers } from "@/recommendation-engine";

// Категория «Наука и исследования» добавлена на этапе 4 и покрыта диагностикой v3 (tests/assessment.test.ts), а не старым тестом v2.
const LEGACY_CATEGORIES = CATEGORIES.filter((c) => c.id !== "science");

const V1 = TEST_VERSIONS[1];
const V2 = TEST_VERSIONS[2];

// Ответить на все вопросы одним вариантом
const all = (opt: string, qs: Question[] = QUESTIONS): Answers => Object.fromEntries(qs.map((q) => [q.id, opt]));

// Для каждого вопроса выбрать вариант, который даёт больше всего баллов направлению
const favorDir = (dir: string): Answers =>
  Object.fromEntries(
    QUESTIONS.map((q) => {
      const best = [...q.options].sort((a, b) => ((b.scores as any)[dir] ?? 0) - ((a.scores as any)[dir] ?? 0))[0];
      return [q.id, best.id];
    }),
  );

// Ответы в пользу категории: на вопросы про интересы выбираем вариант с наибольшим баллом этой категории,
// на остальные — первый вариант (нейтрально).
// На вопросы про направления выбираем вариант, который дают направления этой категории
// (иначе первый вариант всегда тянет к IT и тест проверял бы не то).
const favorCategory = (cat: CategoryId): Answers => {
  const sample = PROFESSIONS.find((p) => p.category === cat)!;
  const catDirs = effectiveDirections(sample) as Record<string, number>;
  return Object.fromEntries(
    QUESTIONS.map((q) => {
      const hasCat = q.options.some((o) => o.categories?.[cat]);
      if (hasCat) {
        const best = [...q.options].sort((a, b) => ((b.categories as any)?.[cat] ?? 0) - ((a.categories as any)?.[cat] ?? 0))[0];
        return [q.id, best.id];
      }
      const score = (o: (typeof q.options)[number]) =>
        Object.entries(catDirs).reduce((s, [d, w]) => s + ((o.scores as any)[d] ?? 0) * w, 0);
      const best = [...q.options].sort((a, b) => score(b) - score(a))[0];
      return [q.id, best.id];
    }),
  );
};

describe("тест: версии и вопросы", () => {
  it("версия 1 — 18 вопросов, версия 2 — 24, текущая версия 2", () => {
    expect(V1.length).toBe(18);
    expect(V2.length).toBe(24);
    expect(CURRENT_TEST_VERSION).toBe(2);
    expect(questionsFor(1)).toBe(V1);
    expect(questionsFor(99)).toBeNull();
  });
  it("во всех вопросах по 4 варианта, id уникальны", () => {
    V2.forEach((q) => expect(q.options.length).toBe(4));
    expect(new Set(V2.map((q) => q.id)).size).toBe(V2.length);
  });
  it("версия 1 — подмножество версии 2 (старые вопросы не меняли)", () => {
    expect(V2.slice(0, 18).map((q) => q.id)).toEqual(V1.map((q) => q.id));
  });
  it("ответы версии 1 не подходят версии 2 и наоборот", () => {
    expect(findProblem(all("a", V1), V2)).not.toBeNull();
    expect(findProblem(all("a", V2), V1)).toBeNull(); // лишние ответы не мешают
  });
  it("каждая категория упоминается в вопросах версии 2", () => {
    LEGACY_CATEGORIES.forEach((c) => {
      const used = V2.some((q) => q.options.some((o) => o.categories?.[c.id]));
      expect(used, c.name).toBe(true);
    });
  });
});

describe("каталог", () => {
  it("не меньше 100 профессий, id уникальны", () => {
    expect(PROFESSIONS.length).toBeGreaterThanOrEqual(100);
    expect(new Set(PROFESSIONS.map((p) => p.id)).size).toBe(PROFESSIONS.length);
  });
  it("в каждой из 18 категорий не меньше 5 профессий", () => {
    CATEGORIES.forEach((c) => {
      const n = PROFESSIONS.filter((p) => p.category === c.id).length;
      expect(n, c.name).toBeGreaterThanOrEqual(5);
    });
  });
  it("у каждой профессии заполнены все поля и есть направления", () => {
    PROFESSIONS.forEach((p) => {
      expect(p.title.trim(), p.id).not.toBe("");
      expect(p.description.trim(), p.id).not.toBe("");
      expect(p.aiImpact.trim(), p.id).not.toBe("");
      expect(LEVEL_LABELS[p.level], p.id).toBeTruthy();
      expect(p.skills.length, `${p.id} навыки`).toBeGreaterThanOrEqual(5);
      expect(p.skills.length, `${p.id} навыки`).toBeLessThanOrEqual(10);
      [p.tasks, p.subjects, p.study, p.projects, p.aiAutomates, p.humanSkills, p.growth].forEach((a) =>
        expect(a.length, p.id).toBeGreaterThan(0),
      );
      expect(Object.keys(effectiveDirections(p)).length, p.id).toBeGreaterThan(0);
    });
  });
  it("в каталоге нет выдуманных цифр, зарплат и рыночных обещаний", () => {
    const bad = /%|зарплат|тенге|₸|\$|гарантир|трудоустро/i;
    PROFESSIONS.forEach((p) => {
      const text = JSON.stringify(p);
      expect(bad.test(text), p.id).toBe(false);
    });
  });
  it("у каждого направления есть вопрос, который даёт ему баллы", () => {
    DIRECTIONS.forEach((d) => expect(maxScore(d.id)).toBeGreaterThan(0));
  });
});

describe("расчёт", () => {
  it("одинаковые ответы дают одинаковый результат", () => {
    const a = all("a");
    expect(JSON.stringify(calculate(a))).toBe(JSON.stringify(calculate({ ...a })));
  });
  it("проценты направлений и категорий в диапазоне 0–100", () => {
    ["a", "b", "c", "d"].forEach((o) => {
      const r = calculate(all(o));
      [...r.directions, ...r.categories].forEach((d) => {
        expect(d.percent).toBeGreaterThanOrEqual(0);
        expect(d.percent).toBeLessThanOrEqual(100);
      });
    });
  });
  it.each(DIRECTIONS.map((d) => d.id))("ответы в пользу направления %s ставят его первым", (dir) => {
    const r = calculate(favorDir(dir));
    expect(r.top[0].id).toBe(dir);
    expect(r.top[0].percent).toBe(100);
  });
  it("вклад ответов в топ-направление суммируется в его баллы", () => {
    const r = calculate(all("b"));
    const d = r.top[0];
    expect(d.contributions.reduce((s, c) => s + c.points, 0)).toBe(d.score);
  });
  it("каждая профессия имеет совпадение 0–100 и причины", () => {
    const r = calculate(all("c"));
    expect(r.professions.length).toBe(PROFESSIONS.length);
    r.professions.forEach((m) => {
      expect(m.percent).toBeGreaterThanOrEqual(0);
      expect(m.percent).toBeLessThanOrEqual(100);
      expect(m.reasons.length).toBeGreaterThan(0);
    });
  });
  it("профессии отсортированы по убыванию совпадения", () => {
    const r = calculate(all("a"));
    for (let i = 1; i < r.professions.length; i++) {
      expect(r.professions[i - 1].percent).toBeGreaterThanOrEqual(r.professions[i].percent);
    }
  });
});

describe("версия 1 (старые результаты)", () => {
  it("считается по 18 вопросам, интересы не учитываются и так и сказано", () => {
    const r = calculate(all("a", V1), 1);
    expect(r.version).toBe(1);
    expect(r.hasInterests).toBe(false);
    expect(r.categories).toEqual([]);
    expect(r.professions[0].parts.interest).toBeNull();
    expect(r.professions[0].reasons.join(" ")).toMatch(/Интересы не оценивались/);
  });
  it("версия 1 и версия 2 с одинаковыми ответами на 18 вопросов дают одинаковые баллы направлений", () => {
    const a1 = all("c", V1);
    const r1 = calculate(a1, 1);
    const r2 = calculate({ ...a1, ...Object.fromEntries(V2.slice(18).map((q) => [q.id, q.options[0].id])) }, 2);
    expect(r1.directions.map((d) => d.score)).toEqual(r2.directions.map((d) => d.score));
  });
});

describe("совпадение по интересам (версия 2)", () => {
  it.each(LEGACY_CATEGORIES.map((c) => c.id))("ответы в пользу категории %s поднимают её в топ-3 категорий", (cat) => {
    const r = calculate(favorCategory(cat));
    const top3 = [...r.categories].sort((a, b) => b.percent - a.percent).slice(0, 3).map((c) => c.id);
    expect(top3).toContain(cat);
  });

  it.each(LEGACY_CATEGORIES.map((c) => c.id))("ответы в пользу категории %s дают в топ-15 профессию из неё", (cat) => {
    const r = calculate(favorCategory(cat));
    const top = r.professions.slice(0, 15).map((m) => m.profession.category);
    expect(top).toContain(cat);
  });

  it("интерес учитывается в совпадении (та же профессия при разных интересах даёт разные проценты)", () => {
    const itProf = PROFESSIONS.find((p) => p.category === "it")!;
    const a = calculate(favorCategory("it")).professions.find((m) => m.profession.id === itProf.id)!;
    const b = calculate(favorCategory("law")).professions.find((m) => m.profession.id === itProf.id)!;
    expect(a.percent).not.toBe(b.percent);
  });
});

describe("школьный предмет (требование профессии)", () => {
  it("выбранный предмет совпадает с требованием профессии → requirement 100", () => {
    const answers = { ...all("a"), q2: "a" }; // математика и информатика
    const r = calculate(answers);
    const mathProf = r.professions.find((m) => m.profession.subjects.includes("math_it"))!;
    expect(r.subjectArea).toBe("math_it");
    expect(mathProf.parts.requirement).toBe(100);
    const noMatch = r.professions.find((m) => !m.profession.subjects.includes("math_it"))!;
    expect(noMatch.parts.requirement).toBe(0);
  });
});

describe("проверка ответов", () => {
  it("находит пропущенный вопрос и неизвестный вариант", () => {
    expect(validateAnswers(all("a"))).toBeNull();
    expect(validateAnswers({})).toMatch(/Нет ответа/);
    expect(validateAnswers({ ...all("a"), q1: "zzz" })).toMatch(/Неизвестный/);
  });
});

describe("план на 30 дней", () => {
  it("ровно 30 дней, номера по порядку", () => {
    const plan = buildPlan(["it", "design", "business"]);
    expect(plan.length).toBe(30);
    expect(plan.map((p) => p.day)).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
    plan.forEach((p) => expect(p.task.length).toBeGreaterThan(5));
  });
});
