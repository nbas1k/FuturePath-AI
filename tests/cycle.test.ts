import { describe, it, expect } from "vitest";
import { CYCLES, CYCLE_PROFESSIONS } from "../src/data/cycle";
import { professionById } from "../src/data/professions";
import { cycleStage, buildProof, type CycleFacts } from "../src/cycle/logic";
import { CHECKS, checkTask } from "../src/data/cycle/checks";
import type { CycleCriterion } from "../src/data/cycle/types";

const allCriteria = (id: string): CycleCriterion[] => CYCLES[id].skills.flatMap((s) => s.criteria);

describe("Цикл: содержание заданий", () => {
  it("есть цикл для трёх профессий, навыки совпадают с каталогом, по 3 критерия на навык", () => {
    expect(CYCLE_PROFESSIONS.sort()).toEqual(["marketer", "software-developer", "ux-designer"]);
    for (const id of CYCLE_PROFESSIONS) {
      const prof = professionById(id)!;
      expect(CYCLES[id].skills).toHaveLength(3);
      for (const s of CYCLES[id].skills) {
        expect(prof.skills).toContain(s.skill);
        expect(s.criteria).toHaveLength(3);
      }
    }
  });
  it("у каждого критерия 4 задания: варианты, правильный индекс в диапазоне, пояснение, без цифр рынка и ссылок", () => {
    for (const id of CYCLE_PROFESSIONS) {
      const ids = new Set<string>();
      for (const c of allCriteria(id)) {
        expect(c.lesson.length).toBeGreaterThan(30);
        for (const t of [c.diag, c.practice, c.ai, c.retest]) {
          expect(ids.has(t.id)).toBe(false);
          ids.add(t.id);
          expect(t.options.length).toBe(3);
          expect(new Set(t.options).size).toBe(3);
          expect(t.correct).toBeGreaterThanOrEqual(0);
          expect(t.correct).toBeLessThan(3);
          expect(t.explanation.length).toBeGreaterThan(5);
          expect(/https?:\/\/|зарплат|тенге|₸/i.test(t.question + t.options.join(" ") + t.explanation)).toBe(false);
        }
        // диагностика и повторная проверка не должны быть одним и тем же заданием
        expect(c.diag.question).not.toBe(c.retest.question);
        expect(c.diag.question).not.toBe(c.practice.question);
        expect(c.ai.question).not.toBe(c.retest.question);
      }
    }
  });
  it("правильные ответы не всегда на одной позиции", () => {
    for (const id of CYCLE_PROFESSIONS) {
      const pos = new Set(allCriteria(id).flatMap((c) => [c.diag.correct, c.retest.correct]));
      expect(pos.size).toBeGreaterThan(1);
    }
  });
});

describe("Цикл: проверка ответов ИИ (подготовленные утверждения)", () => {
  it("на каждый критерий есть утверждение, в каждом навыке есть и ошибочные, и верные", () => {
    for (const id of CYCLE_PROFESSIONS) {
      for (const sk of CYCLES[id].skills) {
        const flawed = sk.criteria.map((c) => CHECKS[c.id]);
        expect(flawed.every(Boolean)).toBe(true);
        expect(flawed.some((x) => x.flawed)).toBe(true);
        expect(flawed.some((x) => !x.flawed)).toBe(true);
        for (const c of sk.criteria) {
          const t = checkTask(c.id, sk.skill);
          expect(t.correct).toBe(CHECKS[c.id].flawed ? 1 : 0);
          expect(t.options).toHaveLength(2);
        }
      }
    }
  });
});

const f = (over: Partial<CycleFacts> = {}): CycleFacts => ({ hasRun: true, futureSeen: true, diagAnswered: 3, criteriaTotal: 3, practiceNeeded: 0, practiceDone: 0, aiFinished: true, retestAnswered: 3, ...over });

describe("Цикл: порядок шагов", () => {
  it("идёт строго по порядку", () => {
    expect(cycleStage(f({ hasRun: false }))).toBe("goal");
    expect(cycleStage(f({ futureSeen: false }))).toBe("future");
    expect(cycleStage(f({ diagAnswered: 1 }))).toBe("diag");
    expect(cycleStage(f({ practiceNeeded: 2, practiceDone: 1 }))).toBe("plan");
    expect(cycleStage(f({ aiFinished: false }))).toBe("ai");
    expect(cycleStage(f({ retestAnswered: 2 }))).toBe("retest");
    expect(cycleStage(f())).toBe("proof");
  });
  it("если пробелов нет, шаг плана пропускается сам", () => expect(cycleStage(f({ aiFinished: false, practiceNeeded: 0 }))).toBe("ai"));
});

describe("Цикл: доказательство прогресса", () => {
  const cs = allCriteria("software-developer").slice(0, 3);
  const ans = (ok: boolean[], pick: (c: CycleCriterion) => string) => cs.map((c, i) => ({ taskId: pick(c), answer: 0, correct: ok[i] }));
  const d = (ok: boolean[]) => ans(ok, (c) => c.diag.id);
  const r = (ok: boolean[]) => ans(ok, (c) => c.retest.id);

  it("считает исправленные ошибки и рост", () => {
    const p = buildProof(cs, d([false, false, true]), r([true, false, true]), [], [], true);
    expect(p.before).toBe(1);
    expect(p.after).toBe(2);
    expect(p.fixed).toEqual([cs[0].name]);
    expect(p.stillWeak).toEqual([cs[1].name]);
    expect(p.kept).toEqual([cs[2].name]);
    expect(p.growthText).toContain("вырос");
    expect(p.confirmed).toBe(false);
  });
  it("не выдумывает рост: нет изменений и снижение описаны честно", () => {
    expect(buildProof(cs, d([true, false, false]), r([true, false, false]), [], [], true).growthText).toContain("Роста");
    const worse = buildProof(cs, d([true, true, true]), r([true, false, true]), [], [], true);
    expect(worse.worse).toEqual([cs[1].name]);
    expect(worse.growthText).toContain("снизился");
  });
  it("потолок: если начальный результат максимален, рост показать нельзя", () => {
    const p = buildProof(cs, d([true, true, true]), r([true, true, true]), [], [], true);
    expect(p.ceiling).toBe(true);
    expect(p.growthText).toContain("рост показать нельзя");
    expect(p.confirmed).toBe(true);
  });
  it("всегда есть оговорка, что это учебный индикатор по 3 заданиям", () => {
    expect(buildProof(cs, d([false, false, false]), r([false, false, false]), [], [], true).honesty).toContain("не доказывает");
  });
  it("заметка об ИИ: ошибся / не ошибся / пропущен", () => {
    const hints = cs.map((c, i) => ({ taskId: c.ai.id, choice: 1, correct: i !== 0 }));
    const followed = cs.map((c, i) => ({ taskId: c.ai.id, answer: i === 0 ? 1 : 0, correct: false }));
    expect(buildProof(cs, d([false, false, false]), r([true, true, true]), hints, followed, false).aiNote).toContain("приняли неверную подсказку в 1");
    const caught = cs.map((c) => ({ taskId: c.ai.id, answer: 0, correct: true }));
    expect(buildProof(cs, d([false, false, false]), r([true, true, true]), hints, caught, false).aiNote).toContain("заметили ошибку в 1");
    const right = hints.map((h) => ({ ...h, correct: true }));
    expect(buildProof(cs, d([false, false, false]), r([true, true, true]), right, caught, false).aiNote).toContain("не ошибся");
    expect(buildProof(cs, d([false, false, false]), r([true, true, true]), [], [], true).aiNote).toContain("пропущен");
  });
});

describe("Цикл: заметка об ИИ с подготовленными утверждениями", () => {
  const cs = allCriteria("ux-designer").slice(0, 3);
  const ids = cs.map((c) => `${c.id}-c`);
  const checks = [{ taskId: ids[0], flawed: true }, { taskId: ids[1], flawed: false }, { taskId: ids[2], flawed: true }];
  const dr = cs.map((c) => ({ taskId: c.diag.id, answer: 0, correct: false }));
  const rt = cs.map((c) => ({ taskId: c.retest.id, answer: 0, correct: true }));
  it("считает замеченные ошибки и отвергнутые верные утверждения", () => {
    const a = [{ taskId: ids[0], answer: 1, correct: true }, { taskId: ids[1], answer: 1, correct: false }, { taskId: ids[2], answer: 0, correct: false }];
    const p = buildProof(cs, dr, rt, [], a, false, checks);
    expect(p.aiNote).toContain("с ошибкой: вы заметили 1");
    expect(p.aiNote).toContain("отвергнуто: 1");
  });
});
