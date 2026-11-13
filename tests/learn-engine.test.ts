import { describe, expect, it } from "vitest";
import { PASS_SCORE, REVIEW_SCORE, competencyScores, gradeExercise, lessonScore, lessonStates, norm, pick, seededShuffle, xpFor } from "@/learn/engine";
import { toRow } from "@/learn/convert";
import type { ExerciseDef } from "@/learn/types";

const grade = (def: ExerciseDef, answer: unknown) => {
  const row = toRow(def, "t/e1", ["c1"]);
  return gradeExercise(row.type as any, row.data, row.answerKey, answer);
};

describe("проверка упражнений", () => {
  it("choice: верный, неверный, некорректный", () => {
    const d: ExerciseDef = { type: "choice", prompt: "?", options: ["a", "b", "c"], correct: 1, explain: "e" };
    expect(grade(d, 1)).toEqual({ correct: true, score: 1 });
    expect(grade(d, 0)).toEqual({ correct: false, score: 0 });
    expect(grade(d, 9)).toBeNull();
    expect(grade(d, "1")).toBeNull();
    expect(grade(d, 1.5)).toBeNull();
  });
  it("multi: точное совпадение, частичный балл со штрафом, дубли отклоняются", () => {
    const d: ExerciseDef = { type: "multi", prompt: "?", options: ["a", "b", "c", "d"], correct: [0, 2], explain: "e" };
    expect(grade(d, [0, 2])).toEqual({ correct: true, score: 1 });
    expect(grade(d, [2, 0])).toEqual({ correct: true, score: 1 });
    expect(grade(d, [0])).toEqual({ correct: false, score: 0.5 });
    expect(grade(d, [0, 1])).toEqual({ correct: false, score: 0 }); // 1 верный − 1 лишний
    expect(grade(d, [0, 0])).toBeNull();
    expect(grade(d, [7])).toBeNull();
  });
  it("match: пары сопоставляются по смыслу, а не по позиции на экране", () => {
    const d: ExerciseDef = { type: "match", prompt: "?", pairs: [["A", "1"], ["B", "2"], ["C", "3"]], explain: "e" };
    const row = toRow(d, "t/e1", []);
    const right = row.data.right as { ru: string }[];
    const correct = ["1", "2", "3"].map((t) => right.findIndex((r) => r.ru === t));
    expect(gradeExercise("match", row.data, row.answerKey, correct)).toEqual({ correct: true, score: 1 });
    const swapped = [correct[1], correct[0], correct[2]];
    const g = gradeExercise("match", row.data, row.answerKey, swapped)!;
    expect(g.correct).toBe(false);
    expect(g.score).toBeCloseTo(1 / 3, 5);
    expect(gradeExercise("match", row.data, row.answerKey, [0, 0, 0])).toBeNull(); // одно и то же дважды
  });
  it("order: верный порядок, частичный балл, исходный порядок на экране не верный", () => {
    const d: ExerciseDef = { type: "order", prompt: "?", items: ["1", "2", "3", "4"], explain: "e" };
    const row = toRow(d, "t/e1", []);
    const items = row.data.items as { ru: string }[];
    expect(items.map((i) => i.ru).join()).not.toBe("1,2,3,4");
    const correct = ["1", "2", "3", "4"].map((t) => items.findIndex((i) => i.ru === t));
    expect(gradeExercise("order", row.data, row.answerKey, correct)).toEqual({ correct: true, score: 1 });
    const g = gradeExercise("order", row.data, row.answerKey, [correct[1], correct[0], correct[2], correct[3]])!;
    expect(g.correct).toBe(false);
    expect(g.score).toBe(0.5);
  });
  it("fill: регистр, ё/е, пробелы и несколько допустимых вариантов", () => {
    const d: ExerciseDef = { type: "fill", prompt: "___ и ___", blanks: [["Ёж", "ежик"], ["лес"]], explain: "e" };
    expect(grade(d, ["еж", " ЛЕС "])).toEqual({ correct: true, score: 1 });
    expect(grade(d, ["ежик", "поле"])).toEqual({ correct: false, score: 0.5 });
    expect(grade(d, ["еж"])).toBeNull();
  });
  it("text: ключевые группы считаются по основам слов, нужен минимум групп", () => {
    const d: ExerciseDef = { type: "text", prompt: "?", groups: [["безопасн"], ["пациент"], ["конфиденц", "тайн"]], min: 2, explain: "e" };
    expect(grade(d, "Важно думать о безопасности и пациенте.")).toEqual({ correct: true, score: 1 });
    const part = grade(d, "Главное — безопасность")!;
    expect(part.correct).toBe(false);
    expect(part.score).toBe(0.5);
    expect(grade(d, "ничего")).toEqual({ correct: false, score: 0 });
    expect(grade(d, 5)).toBeNull();
  });
  it("project: самоотчёт не считается проверенным", () => {
    const d: ExerciseDef = { type: "project", prompt: "?", checklist: ["a", "b"], explain: "e" };
    expect(toRow(d, "t/e1", []).verified).toBe(false);
    expect(grade(d, { checked: [true, false] })).toEqual({ correct: false, score: 0.5 });
    expect(grade(d, { checked: [true] })).toBeNull();
  });
  it("перемешивание детерминировано", () => {
    expect(seededShuffle([1, 2, 3, 4, 5, 6], "x")).toEqual(seededShuffle([1, 2, 3, 4, 5, 6], "x"));
    expect(seededShuffle([1, 2, 3, 4, 5, 6], "x")).not.toEqual(seededShuffle([1, 2, 3, 4, 5, 6], "y"));
  });
  it("правильные ответы не попадают в data, которую видит ученик", () => {
    const row = toRow({ type: "choice", prompt: "?", options: ["a", "b"], correct: 1, explain: "e" }, "t/e1", []);
    expect(JSON.stringify(row.data)).not.toContain("correct");
    expect(row.answerKey).toEqual({ correct: 1 });
  });
});

describe("итог урока и XP", () => {
  it("средний балл и XP только за пройденный урок", () => {
    expect(lessonScore([1, 1, 0, 0])).toBe(0.5);
    expect(lessonScore([])).toBe(0);
    expect(xpFor(20, 1)).toBe(20);
    expect(xpFor(20, 0.8)).toBe(16);
    expect(xpFor(20, PASS_SCORE - 0.01)).toBe(0);
  });
});

describe("состояния уроков", () => {
  const ids = ["l1", "l2", "l3", "l4"];
  it("первый доступен, остальные закрыты", () => {
    expect(lessonStates(ids, {})).toEqual({ l1: "available", l2: "locked", l3: "locked", l4: "locked" });
  });
  it("в процессе, завершён, открывается следующий", () => {
    expect(lessonStates(ids, { l1: [{ status: "in_progress", score: null }] }).l1).toBe("in_progress");
    const s = lessonStates(ids, { l1: [{ status: "completed", score: 0.9 }] });
    expect(s).toMatchObject({ l1: "completed", l2: "available", l3: "locked" });
  });
  it("пройден слабо — требует повторения, но следующий открыт", () => {
    const s = lessonStates(ids, { l1: [{ status: "completed", score: REVIEW_SCORE - 0.05 }] });
    expect(s).toMatchObject({ l1: "needs_review", l2: "available" });
  });
  it("не пройден (ниже порога) — следующий закрыт, урок снова доступен", () => {
    const s = lessonStates(ids, { l1: [{ status: "completed", score: 0.3 }] });
    expect(s).toMatchObject({ l1: "available", l2: "locked" });
  });
  it("учитывается лучшая попытка", () => {
    const s = lessonStates(ids, { l1: [{ status: "completed", score: 0.3 }, { status: "completed", score: 0.95 }] });
    expect(s.l1).toBe("completed");
  });
});

describe("освоение компетенций", () => {
  it("берётся лучший результат каждого задания, а не число попыток", () => {
    const comps = [{ id: "c1", weight: 1 }];
    const r = competencyScores([
      { exerciseId: "e1", score: 0, comps, verified: true },
      { exerciseId: "e1", score: 1, comps, verified: true },
      { exerciseId: "e1", score: 1, comps, verified: true },
      { exerciseId: "e2", score: 0.5, comps, verified: true },
    ]);
    expect(r.c1).toEqual({ score: 0.75, evidence: 2 });
  });
  it("непроверенные задания (самоотчёт) не дают баллов", () => {
    expect(competencyScores([{ exerciseId: "p", score: 1, comps: [{ id: "c1", weight: 1 }], verified: false }])).toEqual({});
  });
  it("один урок развивает несколько компетенций по отдельным результатам", () => {
    const r = competencyScores([
      { exerciseId: "e1", score: 1, comps: [{ id: "a", weight: 1 }, { id: "b", weight: 1 }], verified: true },
      { exerciseId: "e2", score: 0, comps: [{ id: "b", weight: 1 }], verified: true },
    ]);
    expect(r.a.score).toBe(1);
    expect(r.b.score).toBe(0.5);
  });
});

describe("локализация текста", () => {
  it("fallback на русский при отсутствии перевода", () => {
    expect(pick({ ru: "да", en: "yes" }, "en")).toBe("yes");
    expect(pick({ ru: "да", en: "yes" }, "kk")).toBe("да");
    expect(norm("  Ёлка, ЁЖ! ")).toBe("елка еж");
  });
});
