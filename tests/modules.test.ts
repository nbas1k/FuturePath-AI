import { describe, it, expect } from "vitest";
import { CHALLENGES, CHALLENGE_PROFESSIONS } from "@/data/challenge";
import { SIMS, SIM_PROFESSIONS, SIM_START } from "@/data/simulator";
import { TRACK_TASK_SKILLS } from "@/data/skillTags";
import { TRACKS } from "@/data/track";
import { professionById } from "@/data/professions";
import { gradeSet, compareChallenge } from "@/challenge/logic";
import { applyEffects, bestOption, metricsFromChoices, summarize } from "@/simulator/logic";
import { buildSkillMap, CONFIRM_THRESHOLD } from "@/skills/map";
import { recommendNext, type LearnFacts } from "@/learn/recommend";
import { challengePrompt, validateAiHelp } from "@/backend/ai/challengeAi";
import { AiFormatError } from "@/backend/ai/schemas";

const dev = CHALLENGES["software-developer"];
const perfectSolo = Object.fromEntries(dev.solo.map((t) => [t.id, t.correct]));
const wrongSolo = Object.fromEntries(dev.solo.map((t) => [t.id, (t.correct + 1) % t.options.length]));

describe("Human + AI Challenge: содержание", () => {
  it.each(CHALLENGE_PROFESSIONS)("%s: по 3 задания в каждом наборе, правильный индекс в диапазоне", (id) => {
    const s = CHALLENGES[id];
    for (const set of [s.solo, s.ai]) {
      expect(set.length).toBe(3);
      set.forEach((t) => {
        expect(t.correct).toBeGreaterThanOrEqual(0);
        expect(t.correct).toBeLessThan(t.options.length);
        expect(new Set(t.options).size).toBe(t.options.length);
        expect(t.explanation.length).toBeGreaterThan(5);
      });
    }
  });
  it.each(CHALLENGE_PROFESSIONS)("%s: навыки заданий есть в каталоге профессии", (id) => {
    const prof = professionById(id)!;
    [...CHALLENGES[id].solo, ...CHALLENGES[id].ai].forEach((t) => expect(prof.skills).toContain(t.skill));
  });
  it.each(CHALLENGE_PROFESSIONS)("%s: наборы сопоставимы — те же навыки, тот же порядок", (id) => {
    const s = CHALLENGES[id];
    expect(s.ai.map((t) => t.skill)).toEqual(s.solo.map((t) => t.skill));
  });
  it("нет ссылок, процентов и зарплат", () => {
    expect(/https?:\/\/|%|зарплат|тенге/i.test(JSON.stringify(CHALLENGES))).toBe(false);
  });
});

describe("Human + AI Challenge: проверка и сравнение", () => {
  it("все верные — полный балл; все неверные — ноль", () => {
    const a = gradeSet(dev.solo, perfectSolo);
    const b = gradeSet(dev.solo, wrongSolo);
    expect(a.ok && a.graded.score).toBe(3);
    expect(b.ok && b.graded.score).toBe(0);
  });
  it("неполные и подделанные ответы отклоняются", () => {
    expect(gradeSet(dev.solo, { s1: 0 }).ok).toBe(false);
    expect(gradeSet(dev.solo, { ...perfectSolo, s1: 99 }).ok).toBe(false);
    expect(gradeSet(dev.solo, { ...perfectSolo, s1: "1" }).ok).toBe(false);
  });
  const withAi = (answers: Record<string, number>) => {
    const g = gradeSet(dev.ai, answers);
    if (!g.ok) throw new Error("bad");
    return g.graded;
  };
  const solo = (() => { const g = gradeSet(dev.solo, perfectSolo); if (!g.ok) throw new Error("bad"); return g.graded; })();
  const correctAnswers = Object.fromEntries(dev.ai.map((t) => [t.id, t.correct]));
  const wrongAnswers = Object.fromEntries(dev.ai.map((t) => [t.id, (t.correct + 1) % t.options.length]));

  it("пользователь доверился неверной подсказке ИИ — это считается", () => {
    const ai = dev.ai.map((t) => ({ taskId: t.id, choice: (t.correct + 1) % t.options.length, why: "x", correct: false }));
    const c = compareChallenge(solo, withAi(wrongAnswers), ai);
    expect(c.followedWrongAi).toBe(3);
    expect(c.aiScore).toBe(0);
    expect(c.verdict).toMatch(/ИИ может ошибаться/);
  });
  it("пользователь поймал ошибку ИИ — это тоже считается", () => {
    const ai = dev.ai.map((t) => ({ taskId: t.id, choice: (t.correct + 1) % t.options.length, why: "x", correct: false }));
    const c = compareChallenge(solo, withAi(correctAnswers), ai);
    expect(c.correctedWrongAi).toBe(3);
    expect(c.withAiScore).toBe(3);
  });
  it("верные подсказки приняты — счётчики сходятся", () => {
    const ai = dev.ai.map((t) => ({ taskId: t.id, choice: t.correct, why: "x", correct: true }));
    const c = compareChallenge(solo, withAi(correctAnswers), ai);
    expect(c.followedRightAi).toBe(3);
    expect(c.aiScore).toBe(3);
    expect(c.followedRightAi + c.ignoredRightAi + c.followedWrongAi + c.correctedWrongAi).toBe(3);
  });
});

describe("Human + AI Challenge: запрос к ИИ", () => {
  it("в запросе нет правильных ответов и пояснений", () => {
    const p = challengePrompt(dev.ai);
    dev.ai.forEach((t) => expect(p.user).not.toContain(t.explanation));
    expect(JSON.stringify(p)).not.toMatch(/correct|правильный ответ/i);
    dev.ai.forEach((t) => expect(p.user).toContain(t.question));
  });
  const good = { answers: dev.ai.map((t) => ({ taskId: t.id, choice: 0, why: "Потому что." })) };
  it("корректный ответ ИИ принимается", () => {
    expect(validateAiHelp(good, dev.ai)).toHaveLength(3);
  });
  it("неверное число ответов, пропуск задания и неверный номер варианта отклоняются", () => {
    expect(() => validateAiHelp({ answers: good.answers.slice(0, 2) }, dev.ai)).toThrow(AiFormatError);
    expect(() => validateAiHelp({ answers: good.answers.map((a, i) => (i === 0 ? { ...a, taskId: "zzz" } : a)) }, dev.ai)).toThrow(AiFormatError);
    expect(() => validateAiHelp({ answers: good.answers.map((a, i) => (i === 0 ? { ...a, choice: 99 } : a)) }, dev.ai)).toThrow(AiFormatError);
    expect(() => validateAiHelp({ answers: good.answers.map((a, i) => (i === 0 ? { ...a, choice: "0" } : a)) }, dev.ai)).toThrow(AiFormatError);
  });
  it("ссылки и проценты в объяснении ИИ запрещены", () => {
    expect(() => validateAiHelp({ answers: good.answers.map((a) => ({ ...a, why: "см. https://x.test" })) }, dev.ai)).toThrow(AiFormatError);
    expect(() => validateAiHelp({ answers: good.answers.map((a) => ({ ...a, why: "в 90% случаев" })) }, dev.ai)).toThrow(AiFormatError);
  });
});

describe("Job Simulator: содержание", () => {
  it.each(SIM_PROFESSIONS)("%s: 4 ситуации по 3 варианта, эффекты от -2 до 2, есть последствия", (id) => {
    const s = SIMS[id];
    expect(s.situations.length).toBe(4);
    s.situations.forEach((sit) => {
      expect(sit.options.length).toBe(3);
      sit.options.forEach((o) => {
        expect(o.consequence.length).toBeGreaterThan(10);
        for (const v of Object.values(o.effects)) { expect(v).toBeGreaterThanOrEqual(-2); expect(v).toBeLessThanOrEqual(2); }
      });
      // у лучшего варианта сумма эффектов положительная, а есть и явно плохой
      const sums = sit.options.map((o) => o.effects.quality + o.effects.time + o.effects.trust);
      expect(Math.max(...sums)).toBeGreaterThan(0);
      expect(Math.min(...sums)).toBeLessThan(0);
    });
  });
  it("нет ссылок, процентов и зарплат", () => {
    expect(/https?:\/\/|%|зарплат|тенге/i.test(JSON.stringify(SIMS))).toBe(false);
  });
});

describe("Job Simulator: логика", () => {
  const sc = SIMS["software-developer"];
  it("лучшие решения дают сильный итог, худшие — слабый", () => {
    const best = sc.situations.map(bestOption);
    const worst = sc.situations.map((s) => {
      const sums = s.options.map((o) => o.effects.quality + o.effects.time + o.effects.trust);
      return sums.indexOf(Math.min(...sums));
    });
    const mb = metricsFromChoices(sc, best);
    const mw = metricsFromChoices(sc, worst);
    expect(mb.ok && summarize(mb.metrics).level).toBe("strong");
    expect(mw.ok && summarize(mw.metrics).level).toBe("weak");
  });
  it("метрики не выходят за 0..10", () => {
    let m = { ...SIM_START };
    for (let i = 0; i < 20; i++) m = applyEffects(m, { quality: 2, time: 2, trust: 2 });
    expect(m).toEqual({ quality: 10, time: 10, trust: 10 });
    for (let i = 0; i < 20; i++) m = applyEffects(m, { quality: -2, time: -2, trust: -2 });
    expect(m).toEqual({ quality: 0, time: 0, trust: 0 });
  });
  it("неверный выбор и лишние выборы отклоняются", () => {
    expect(metricsFromChoices(sc, [9]).ok).toBe(false);
    expect(metricsFromChoices(sc, [0, 0, 0, 0, 0]).ok).toBe(false);
    expect(metricsFromChoices(sc, [-1]).ok).toBe(false);
  });
  it("итог называет самую слабую метрику", () => {
    const v = summarize({ quality: 9, time: 2, trust: 8 });
    expect(v.weakest).toBe("time");
    expect(v.text).toMatch(/Запас по срокам/);
  });
});

describe("Карта навыков и Skill Gap", () => {
  const skills = ["A", "B", "C", "D"];
  it("подтверждён при 75% и выше, ниже — пробел", () => {
    const attempts = [
      { skill: "A", correct: true }, { skill: "A", correct: true }, { skill: "A", correct: true }, { skill: "A", correct: false }, // 75
      { skill: "B", correct: true }, { skill: "B", correct: false }, // 50
    ];
    const m = buildSkillMap(skills, { A: 1, B: 1 }, attempts);
    expect(CONFIRM_THRESHOLD).toBe(75);
    expect(m.rows[0].status).toBe("confirmed");
    expect(m.rows[1].status).toBe("gap");
  });
  it("самооценка «уверенно» при слабом результате — переоценка", () => {
    const m = buildSkillMap(["A"], { A: 2 }, [{ skill: "A", correct: false }]);
    expect(m.rows[0].status).toBe("overestimated");
  });
  it("навык без заданий — «нет заданий», а не выдуманный уровень", () => {
    const m = buildSkillMap(["A"], { A: 2 }, []);
    expect(m.rows[0].status).toBe("unchecked");
    expect(m.rows[0].verifiedPct).toBeNull();
  });
  it("самооценка не подтверждает навык сама по себе", () => {
    const m = buildSkillMap(["A"], { A: 2 }, []);
    expect(m.confirmed).toBe(0);
  });
  it("с чего начать: сначала переоценка, затем пробел, затем непроверенное", () => {
    const attempts = [{ skill: "B", correct: false }, { skill: "C", correct: false }];
    const m = buildSkillMap(["A", "B", "C"], { C: 2 }, attempts);
    expect(m.nextSkill).toBe("C");
    const m2 = buildSkillMap(["A", "B"], {}, [{ skill: "B", correct: false }]);
    expect(m2.nextSkill).toBe("B");
    const m3 = buildSkillMap(["A"], {}, []);
    expect(m3.nextSkill).toBe("A");
  });
  it("все навыки подтверждены — рекомендовать нечего", () => {
    const m = buildSkillMap(["A"], {}, [{ skill: "A", correct: true }]);
    expect(m.nextSkill).toBeNull();
  });
});

describe("Связь заданий с навыками каталога", () => {
  it.each(Object.keys(TRACK_TASK_SKILLS))("%s: каждое задание курса привязано к существующему навыку", (id) => {
    const prof = professionById(id)!;
    const track = TRACKS[id];
    track.tasks.forEach((t) => {
      const skill = TRACK_TASK_SKILLS[id][t.id];
      expect(skill, `${id}/${t.id}`).toBeTruthy();
      expect(prof.skills).toContain(skill);
    });
  });
});

describe("Один рекомендуемый шаг в «Обучении»", () => {
  const base: LearnFacts = { hasCourse: true, hasChallenge: true, hasSim: true, round1Done: false, lessonsRead: 0, lessonsTotal: 3, round2Done: false, challengePhase: "solo", simFinishedRuns: 0 };
  it("сначала первая проверка курса", () => expect(recommendNext(base).tab).toBe("course"));
  it("потом курс", () => expect(recommendNext({ ...base, round1Done: true, lessonsRead: 1 }).title).toMatch(/мини-курс/));
  it("потом повторная проверка", () => expect(recommendNext({ ...base, round1Done: true, lessonsRead: 3 }).title).toMatch(/повторную/));
  it("после курса — сравнение с ИИ", () => expect(recommendNext({ ...base, round1Done: true, lessonsRead: 3, round2Done: true }).tab).toBe("challenge"));
  it("после Challenge — симулятор", () => expect(recommendNext({ ...base, round1Done: true, lessonsRead: 3, round2Done: true, challengePhase: "done" }).tab).toBe("sim"));
  it("после всего — карта навыков", () => expect(recommendNext({ ...base, round1Done: true, lessonsRead: 3, round2Done: true, challengePhase: "done", simFinishedRuns: 1 }).tab).toBe("skills"));
  it("если курса нет, начинаем с доступного", () => expect(recommendNext({ ...base, hasCourse: false }).tab).toBe("challenge"));
});

describe("Job Simulator: честный итог", () => {
  it("«просела» только если метрика ниже стартовой", () => {
    expect(summarize({ quality: 9, time: 4, trust: 9 }).text).toMatch(/просела метрика «Запас по срокам» \(4 из 10\)/);
    expect(summarize({ quality: 9, time: 7, trust: 9 }).text).not.toMatch(/просела/);
    expect(summarize({ quality: 9, time: 7, trust: 9 }).text).toMatch(/Самая низкая метрика/);
  });
});
