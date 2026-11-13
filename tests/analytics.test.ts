import { describe, it, expect } from "vitest";
import { confirmedOverTime, firstLast, achievements } from "../src/analytics/logic";

const ev = (at: number, taskKey: string, skill: string, correct: boolean) => ({ at, taskKey, skill, correct });

describe("Динамика подтверждённых навыков", () => {
  it("навык подтверждается от 75% верных и считается по порядку времени", () => {
    const r = confirmedOverTime([ev(2, "b", "S", true), ev(1, "a", "S", true)]);
    expect(r.map((x) => x.confirmed)).toEqual([1, 1]);
  });
  it("ошибка снимает подтверждение, исправление возвращает его (учитывается последняя попытка)", () => {
    const r = confirmedOverTime([ev(1, "a", "S", true), ev(2, "b", "S", false), ev(3, "b", "S", true)]);
    expect(r.map((x) => x.confirmed)).toEqual([1, 0, 1]);
  });
  it("пустой список даёт пустой график", () => expect(confirmedOverTime([])).toEqual([]));
});

describe("Первая и последняя попытка", () => {
  it("одна попытка — сравнивать нечего", () => expect(firstLast([5])).toBeNull());
  it("рост, спад, без изменений", () => {
    expect(firstLast([10, 14, 18])).toMatchObject({ first: 10, last: 18, delta: 8, word: "выросло", count: 3 });
    expect(firstLast([18, 12])?.word).toBe("снизилось");
    expect(firstLast([7, 9, 7])?.word).toBe("без изменений");
  });
});

describe("Достижения", () => {
  it("выдаются только по фактам", () => {
    const none = achievements({ testDone: false, professionChosen: false, courseDone: false, challengeDone: false, simDone: false, interviewDone: false, confirmedSkills: 0, mentorMessages: 0 });
    expect(none.every((a) => !a.done)).toBe(true);
    const some = achievements({ testDone: true, professionChosen: true, courseDone: false, challengeDone: false, simDone: true, interviewDone: false, confirmedSkills: 2, mentorMessages: 0 });
    expect(some.filter((a) => a.done).map((a) => a.id)).toEqual(["test", "profession", "sim", "skill"]);
  });
});
