import { describe, it, expect } from "vitest";
import { SOFT_SITUATIONS, SOFT_ROUNDS } from "../src/data/softSkills";
import { nextLevel, pickNext, pointsOf, summarizeSoft, type Played } from "../src/softskills/logic";
import { recommendNext } from "../src/learn/recommend";

const best = (id: string) => SOFT_SITUATIONS.find((s) => s.id === id)!.options.findIndex((o) => o.points === 2);
const worst = (id: string) => SOFT_SITUATIONS.find((s) => s.id === id)!.options.findIndex((o) => o.points === 0);

describe("Soft Skills Lab: данные", () => {
  it("у каждой ситуации 3 варианта, есть вариант на 2 балла, id уникальны, на каждый навык по 3 уровня", () => {
    expect(new Set(SOFT_SITUATIONS.map((s) => s.id)).size).toBe(SOFT_SITUATIONS.length);
    for (const s of SOFT_SITUATIONS) {
      expect(s.options).toHaveLength(3);
      expect(s.options.some((o) => o.points === 2)).toBe(true);
      expect(s.options.every((o) => o.why.length > 5)).toBe(true);
    }
    expect(SOFT_SITUATIONS.length).toBeGreaterThanOrEqual(SOFT_ROUNDS);
  });
});

describe("Adaptive Difficulty", () => {
  it("уровень растёт за 2 балла, падает за 0, остаётся за 1 и не выходит за 1..3", () => {
    expect(nextLevel(1, 2)).toBe(2);
    expect(nextLevel(3, 2)).toBe(3);
    expect(nextLevel(2, 0)).toBe(1);
    expect(nextLevel(1, 0)).toBe(1);
    expect(nextLevel(2, 1)).toBe(2);
  });
  it("начинается с лёгкого уровня", () => expect(pickNext([])?.level).toBe(1));
  it("после сильных ответов ситуации усложняются, после слабых нет", () => {
    const strong: Played[] = [];
    const weak: Played[] = [];
    for (let i = 0; i < 3; i++) {
      const a = pickNext(strong)!;
      strong.push({ id: a.id, option: best(a.id) });
      const b = pickNext(weak)!;
      weak.push({ id: b.id, option: worst(b.id) });
    }
    expect(pickNext(strong)!.level).toBe(3);
    expect(pickNext(weak)!.level).toBe(1);
  });
  it("ситуации не повторяются, а упражнение заканчивается ровно за SOFT_ROUNDS шагов", () => {
    const played: Played[] = [];
    for (let i = 0; i < SOFT_ROUNDS; i++) {
      const n = pickNext(played)!;
      expect(played.some((p) => p.id === n.id)).toBe(false);
      played.push({ id: n.id, option: best(n.id) });
    }
    expect(pickNext(played)).toBeNull();
  });
  it("повреждённая запись не даёт ситуацию", () => {
    expect(pickNext([{ id: "нет", option: 0 }])).toBeNull();
    expect(pointsOf({ id: "c1", option: 9 })).toBeNull();
  });
});

describe("Soft Skills Lab: итог", () => {
  it("считает баллы по навыкам и находит слабый", () => {
    const s = summarizeSoft([{ id: "c1", option: best("c1") }, { id: "t1", option: worst("t1") }]);
    expect(s.total).toBe(2);
    expect(s.max).toBe(4);
    expect(s.weakest).toBe("teamwork");
  });
});

describe("Рекомендация: мягкие навыки", () => {
  const base = { hasCourse: true, hasChallenge: true, hasSim: true, round1Done: true, lessonsRead: 3, lessonsTotal: 3, round2Done: true, challengePhase: "done" as const, simFinishedRuns: 1, hasInterview: true, interviewDone: true };
  it("предлагается до карты навыков, если ещё не пройдено", () => {
    expect(recommendNext({ ...base, softDone: false }).tab).toBe("soft");
    expect(recommendNext({ ...base, softDone: true }).tab).toBe("skills");
  });
});
