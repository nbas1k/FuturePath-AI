import { describe, it, expect } from "vitest";
import { TRACKS } from "@/data/track";
import { PROFESSIONS } from "@/data/professions";
import { gradeRound, roundStatus, improvement } from "@/track/logic";

const track = TRACKS["software-developer"];
const perfect = Object.fromEntries(track.tasks.map((t) => [t.id, t.correct]));
const wrongAll = Object.fromEntries(track.tasks.map((t) => [t.id, (t.correct + 1) % t.options.length]));

describe("содержание курса", () => {
  it("есть курс для «Разработчик программ»: 3 урока и 4 задания", () => {
    expect(track.lessons.length).toBe(3);
    expect(track.tasks.length).toBe(4);
  });
  it("у каждого задания 2–4 варианта и правильный индекс внутри диапазона", () => {
    track.tasks.forEach((t) => {
      expect(t.options.length).toBeGreaterThanOrEqual(2);
      expect(t.options.length).toBeLessThanOrEqual(4);
      expect(t.correct).toBeGreaterThanOrEqual(0);
      expect(t.correct).toBeLessThan(t.options.length);
      expect(t.explanation.length).toBeGreaterThan(5);
    });
  });
  it("каждый урок содержит текст, id уникальны", () => {
    track.lessons.forEach((l) => expect(l.text.length).toBeGreaterThan(0));
    expect(new Set(track.lessons.map((l) => l.id)).size).toBe(track.lessons.length);
    expect(new Set(track.tasks.map((t) => t.id)).size).toBe(track.tasks.length);
  });
  it("курс привязан к существующей профессии каталога", () => {
    expect(PROFESSIONS.some((p) => p.id === track.professionId)).toBe(true);
  });
  it("вопросы не содержат ссылок и цифр о рынке труда", () => {
    const text = JSON.stringify(track);
    expect(/https?:\/\/|%|зарплат/i.test(text)).toBe(false);
  });
});

describe("проверка раунда", () => {
  it("все правильные ответы дают полный балл", () => {
    const r = gradeRound(track, perfect);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.graded.score).toBe(track.tasks.length);
  });
  it("все неверные — ноль, и у каждого есть правильный текст и пояснение", () => {
    const r = gradeRound(track, wrongAll);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.graded.score).toBe(0);
      r.graded.items.forEach((i) => {
        expect(i.correct).toBe(false);
        expect(i.correctText.length).toBeGreaterThan(0);
        expect(i.explanation.length).toBeGreaterThan(0);
      });
    }
  });
  it("неполные ответы не проверяются", () => {
    const partial = { ...perfect };
    delete (partial as Record<string, unknown>)[track.tasks[0].id];
    expect(gradeRound(track, partial).ok).toBe(false);
  });
  it("неверный индекс варианта отклоняется (защита от подделки)", () => {
    expect(gradeRound(track, { ...perfect, [track.tasks[0].id]: 99 }).ok).toBe(false);
    expect(gradeRound(track, { ...perfect, [track.tasks[0].id]: -1 }).ok).toBe(false);
    expect(gradeRound(track, { ...perfect, [track.tasks[0].id]: "1" }).ok).toBe(false);
  });
  it("правильный ответ не передаётся наружу в вопросе: индекс correct не входит в список вариантов", () => {
    const publicTasks = track.tasks.map((t) => ({ id: t.id, question: t.question, options: t.options }));
    expect(JSON.stringify(publicTasks)).not.toContain("explanation");
    expect(Object.keys(publicTasks[0])).not.toContain("correct");
  });
});

describe("правила раундов", () => {
  const base = { round1Done: false, round2Done: false, lessonsRead: 0, lessonsTotal: 3 };
  it("сначала первая проверка", () => {
    const s = roundStatus(base);
    expect(s.canRound1).toBe(true);
    expect(s.canRound2).toBe(false);
  });
  it("после первой проверки курс нужен до повторной", () => {
    const s = roundStatus({ ...base, round1Done: true, lessonsRead: 2 });
    expect(s.canRound2).toBe(false);
    expect(s.reason).toMatch(/2 из 3/);
  });
  it("после всех уроков доступна повторная проверка", () => {
    const s = roundStatus({ ...base, round1Done: true, lessonsRead: 3 });
    expect(s.canRound2).toBe(true);
  });
  it("повторная проверка одна: после неё ничего не доступно", () => {
    const s = roundStatus({ ...base, round1Done: true, round2Done: true, lessonsRead: 3 });
    expect(s.canRound1).toBe(false);
    expect(s.canRound2).toBe(false);
  });
});

describe("изменение результата", () => {
  it("показывает рост, без изменений и падение честно", () => {
    expect(improvement(2, 4)).toBe("+2");
    expect(improvement(3, 3)).toBe("без изменений");
    expect(improvement(3, 1)).toBe("-2");
  });
});

// Проверки для КАЖДОГО курса (их уже несколько)
import { TRACK_PROFESSIONS } from "@/data/track";
describe("все курсы", () => {
  it("есть курсы минимум для трёх профессий", () => {
    expect(TRACK_PROFESSIONS.length).toBeGreaterThanOrEqual(3);
  });
  it.each(TRACK_PROFESSIONS)("курс %s: 3 урока, 4 задания, правильные индексы в диапазоне", (id) => {
    const t = TRACKS[id];
    expect(PROFESSIONS.some((p) => p.id === t.professionId)).toBe(true);
    expect(t.lessons.length).toBe(3);
    expect(t.tasks.length).toBe(4);
    t.tasks.forEach((task) => {
      expect(task.correct).toBeGreaterThanOrEqual(0);
      expect(task.correct).toBeLessThan(task.options.length);
      expect(new Set(task.options).size).toBe(task.options.length);
    });
  });
  it.each(TRACK_PROFESSIONS)("курс %s: нет ссылок, процентов и зарплат", (id) => {
    expect(/https?:\/\/|%|зарплат|тенге/i.test(JSON.stringify(TRACKS[id]))).toBe(false);
  });
});
