import { describe, expect, it } from "vitest";
import { ALL_ITEMS, CHALLENGE_ITEMS, CORE_ITEMS, INTEREST_ITEMS, LETTERS, REFINE_ITEMS, SITUATION_ITEMS, isValidAnswer, type ChoiceItem, type Letter, type LikertItem } from "@/assessment/items";
import { MIN_INTEREST_ANSWERS, buildProfile, sanitizeAnswers, scoreAssessment, WEIGHTS, type Answers } from "@/assessment/score";

// Помощник: пользователь, которому нравятся только указанные типы
function interestsFor(liked: Letter[], disliked = 1, likedV = 5): Answers {
  const a: Answers = {};
  for (const it of INTEREST_ITEMS) a[it.id] = liked.includes(it.letter!) ? likedV : disliked;
  return a;
}
const allChallengesCorrect = (): Answers => Object.fromEntries(CHALLENGE_ITEMS.map((c) => [c.id, c.correct!]));

describe("банк вопросов", () => {
  it("25–35 вопросов об интересах, по 5 на каждый тип RIASEC", () => {
    expect(INTEREST_ITEMS.length).toBeGreaterThanOrEqual(25);
    expect(INTEREST_ITEMS.length).toBeLessThanOrEqual(35);
    for (const l of LETTERS) expect(INTEREST_ITEMS.filter((i) => i.letter === l)).toHaveLength(5);
  });
  it("есть условия работы, ситуации, мини-задания, самооценка и пакет уточнения", () => {
    expect(CORE_ITEMS.some((i) => i.block === "condition")).toBe(true);
    expect(SITUATION_ITEMS.length).toBeGreaterThanOrEqual(3);
    expect(CHALLENGE_ITEMS.length).toBeGreaterThanOrEqual(4);
    expect(CORE_ITEMS.some((i) => i.block === "self")).toBe(true);
    expect(REFINE_ITEMS.length).toBeGreaterThan(0);
  });
  it("id уникальны, у каждого задания есть правильный ответ в границах вариантов", () => {
    expect(new Set(ALL_ITEMS.map((i) => i.id)).size).toBe(ALL_ITEMS.length);
    for (const c of CHALLENGE_ITEMS) expect(c.correct!).toBeLessThan(c.options.length);
  });
  it("все тексты есть на ru и en", () => {
    for (const i of ALL_ITEMS) {
      expect(i.text.ru.length).toBeGreaterThan(3);
      expect(i.text.en.length).toBeGreaterThan(3);
      for (const o of (i as ChoiceItem).options ?? []) { expect(o.text.ru).toBeTruthy(); expect(o.text.en).toBeTruthy(); }
    }
  });
});

describe("детерминированность", () => {
  it("одинаковые ответы дают идентичный результат", () => {
    const answers = { ...interestsFor(["I", "A"]), ...allChallengesCorrect(), "c-people": 4 };
    const a = scoreAssessment(answers, { areas: ["it"] });
    const b = scoreAssessment({ ...answers }, { areas: ["it"] });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
  it("порядок ключей в ответах не влияет на результат", () => {
    const answers = interestsFor(["S", "E"]);
    const reversed = Object.fromEntries(Object.entries(answers).reverse());
    expect(JSON.stringify(scoreAssessment(answers))).toBe(JSON.stringify(scoreAssessment(reversed)));
  });
  it("результат не меняется при повторных вызовах (нет случайности)", () => {
    const answers = interestsFor(["R"]);
    const runs = Array.from({ length: 5 }, () => scoreAssessment(answers).top.map((m) => m.professionId).join());
    expect(new Set(runs).size).toBe(1);
  });
});

describe("противоположные профили", () => {
  it("«технарь» и «помогающий» получают разные рекомендации и разные ведущие типы", () => {
    const tech = scoreAssessment(interestsFor(["I", "R"]));
    const care = scoreAssessment(interestsFor(["S", "A"]));
    expect(tech.profile.code).not.toBe(care.profile.code);
    const techCats = new Set(tech.top.map((m) => m.category));
    const careCats = new Set(care.top.map((m) => m.category));
    expect([...techCats].filter((c) => careCats.has(c))).toHaveLength(0);
  });
  it("высокий интерес к I даёт в топе IT/науку/инженерию, а не социальные профессии", () => {
    const r = scoreAssessment(interestsFor(["I"]));
    const cats = r.top.map((m) => m.category);
    expect(cats.some((c) => ["it", "ai_data", "cyber", "engineering", "ecology", "medicine"].includes(c))).toBe(true);
    expect(cats).not.toContain("social");
  });
  it("высокий S даёт образование/медицину/социальную сферу", () => {
    const r = scoreAssessment(interestsFor(["S"]));
    expect(r.top.some((m) => ["education", "medicine", "social", "tourism"].includes(m.category))).toBe(true);
  });
  it("не более двух профессий одной категории в топ-5", () => {
    const r = scoreAssessment(interestsFor(["I"]));
    const counts = new Map<string, number>();
    for (const m of r.top) counts.set(m.category, (counts.get(m.category) ?? 0) + 1);
    for (const n of counts.values()) expect(n).toBeLessThanOrEqual(2);
    expect(r.top).toHaveLength(5);
  });
});

describe("пропущенные ответы", () => {
  it("меньше порога — рекомендаций нет, а не выдуманный результат", () => {
    const few: Answers = {};
    for (const it of INTEREST_ITEMS.slice(0, MIN_INTEREST_ANSWERS - 1)) few[it.id] = 5;
    const r = scoreAssessment(few);
    expect(r.confidence).toBe("insufficient");
    expect(r.top).toEqual([]);
  });
  it("пустые ответы не падают", () => {
    expect(scoreAssessment({}).confidence).toBe("insufficient");
    expect(scoreAssessment(null as never).top).toEqual([]);
  });
  it("пропуск задания не считается ошибкой", () => {
    const p = buildProfile({ "t-num1": 1 }); // верно; второе числовое пропущено
    expect(p.demonstrated.numeric).toEqual({ correct: 1, total: 1 });
    expect(p.skillLevel.numeric).toBe(1);
  });
  it("с частично пропущенными блоками уверенность ниже, но рекомендации есть", () => {
    const r = scoreAssessment(interestsFor(["I"]));
    expect(r.confidence).not.toBe("insufficient");
    expect(["low", "medium"]).toContain(r.confidence);
    expect(r.top.length).toBeGreaterThan(0);
  });
  it("полный набор ответов даёт высокую уверенность", () => {
    const answers: Answers = {};
    for (const it of CORE_ITEMS) answers[it.id] = it.block === "situation" || it.block === "challenge" ? (it as ChoiceItem).correct ?? 0 : 3;
    expect(scoreAssessment(answers).confidence).toBe("high");
  });
});

describe("пограничные результаты", () => {
  it("все ответы «5» (нравится всё) — профиль плоский, это отмечено, топ не выдаёт крайних процентов", () => {
    const answers: Answers = {};
    for (const it of INTEREST_ITEMS) answers[it.id] = 5;
    const r = scoreAssessment(answers);
    expect(r.profile.undifferentiated).toBe(true);
    for (const m of r.ranked) expect(m.parts.interest).toBe(50);
  });
  it("все ответы «1» тоже дают плоский профиль, а не случайный выбор", () => {
    const answers: Answers = {};
    for (const it of INTEREST_ITEMS) answers[it.id] = 1;
    expect(scoreAssessment(answers).profile.undifferentiated).toBe(true);
  });
  it("проценты в диапазоне 0..100, при равенстве порядок стабилен по id", () => {
    const r = scoreAssessment(interestsFor(["E"]));
    for (const m of r.ranked) { expect(m.percent).toBeGreaterThanOrEqual(0); expect(m.percent).toBeLessThanOrEqual(100); }
    for (let i = 1; i < r.ranked.length; i++) {
      const a = r.ranked[i - 1], b = r.ranked[i];
      expect(a.percent > b.percent || (a.percent === b.percent && a.professionId.localeCompare(b.professionId) <= 0)).toBe(true);
    }
  });
  it("мусорные ответы отбрасываются", () => {
    const clean = sanitizeAnswers({ "i-R1": 9, "i-R2": 3.5, nope: 2, "i-R3": 4, "t-num1": 7, "s-1": 3, "s-2": -1 });
    expect(clean).toEqual({ "i-R3": 4, "s-1": 3 });
  });
  it("вес итогового совпадения в сумме равен 1", () => {
    expect(Object.values(WEIGHTS).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 5);
  });
});

describe("интересы, самооценка и показанные навыки разделены", () => {
  it("самооценка не превращается в показанный навык", () => {
    const p = buildProfile({ "a-numeric": 5 });
    expect(p.demonstrated.numeric.total).toBe(0);
    expect(p.self.numeric).toBe(1);
  });
  it("показанный навык весит больше самооценки", () => {
    const high = buildProfile({ "a-numeric": 5, "t-num1": 0, "t-num2": 1 }); // самооценка высокая, задания неверны
    expect(high.skillLevel.numeric).toBeCloseTo(0.4, 5);
    const lowSelf = buildProfile({ "a-numeric": 1, "t-num1": 1, "t-num2": 0 }); // самооценка низкая, задания верны
    expect(lowSelf.skillLevel.numeric).toBeCloseTo(0.6, 5);
  });
  it("мини-задания влияют на пробелы в навыках, но не на интересы", () => {
    const base = interestsFor(["I"]);
    const weak = scoreAssessment({ ...base, "t-num1": 0, "t-num2": 1, "t-log1": 0, "t-log2": 0 });
    const strong = scoreAssessment({ ...base, ...allChallengesCorrect() });
    expect(weak.profile.letters).toEqual(strong.profile.letters);
    const ai = (r: typeof weak) => r.ranked.find((m) => m.category === "ai_data")!;
    expect(ai(strong).parts.skills!).toBeGreaterThan(ai(weak).parts.skills!);
  });
  it("выбранные области из онбординга поднимают соответствующие категории", () => {
    const base = interestsFor(["I", "S"]);
    const withArea = scoreAssessment(base, { areas: ["med"] });
    const none = scoreAssessment(base);
    const med = (r: typeof none) => r.ranked.find((m) => m.category === "medicine")!;
    expect(med(withArea).percent).toBeGreaterThanOrEqual(med(none).percent);
  });
  it("ситуации влияют на интересы", () => {
    const a = buildProfile({ ...interestsFor([]), "s-1": 0 }); // R
    const b = buildProfile({ ...interestsFor([]), "s-1": 1 }); // A
    expect((a.letters.R as number)).toBeGreaterThan(b.letters.R as number);
    expect((b.letters.A as number)).toBeGreaterThan(a.letters.A as number);
  });
});

describe("уточнение рекомендаций", () => {
  it("дополнительные ответы подмешиваются в тот же алгоритм и меняют профиль детерминированно", () => {
    const base = interestsFor(["I", "A"]);
    const refine: Answers = Object.fromEntries(REFINE_ITEMS.map((i) => [i.id, (i as LikertItem).letter === "A" ? 5 : 1]));
    const r1 = scoreAssessment({ ...base, ...refine });
    const r2 = scoreAssessment({ ...base, ...refine });
    expect(JSON.stringify(r1)).toBe(JSON.stringify(r2));
    expect(r1.profile.interestAnswered).toBe(INTEREST_ITEMS.length + REFINE_ITEMS.length);
    expect(isValidAnswer(REFINE_ITEMS[0], 5)).toBe(true);
  });
});
