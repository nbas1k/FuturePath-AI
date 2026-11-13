import { describe, it, expect } from "vitest";
import { planSwitch } from "../src/career/switch";
import { PROFESSIONS } from "../src/data/professions";

describe("Career Switch Navigator", () => {
  it("находит общие, похожие и недостающие навыки", () => {
    const p = planSwitch(["Логическое мышление", "Анализ данных", "Умение писать тексты"], ["Анализ данных", "Анализ рынка", "Дизайн"], ["Анализ данных"]);
    expect(p.same).toEqual(["Анализ данных"]);
    expect(p.carried).toEqual(["Анализ данных"]);
    expect(p.similar).toEqual([]);
    expect(p.toLearn).toEqual(["Анализ рынка", "Дизайн"]);
  });
  it("разные списки: ничего не теряется", () => {
    const a = PROFESSIONS[0], b = PROFESSIONS[50];
    const p = planSwitch(a.skills, b.skills, []);
    expect(p.same.length + p.similar.length + p.toLearn.length).toBe(b.skills.length);
  });
  it("одинаковые профессии: всё совпадает", () => {
    const a = PROFESSIONS[3];
    const p = planSwitch(a.skills, a.skills, []);
    expect(p.toLearn).toEqual([]);
  });
});
