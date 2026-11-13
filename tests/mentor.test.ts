import { describe, expect, it } from "vitest";
import { MAX_HISTORY, MAX_MESSAGE_CHARS, MENTOR_MODES, adaptLevel, buildMentorPrompt, practiceRecommendations, type MentorContext } from "@/learn/mentorPrompt";

const ctx = (over: Partial<MentorContext> = {}): MentorContext => ({
  lang: "ru", careerTitle: "Врач", trackTitle: "Врач", moduleTitle: "Тело человека", lessonTitle: "Системы органов", objectives: ["Назвать системы"], level: "standard",
  weakCompetencies: ["doctor:c1"], lessonScore: 0.5, history: [], ...over,
});

describe("промпт наставника", () => {
  it("содержит учебный контекст: профессию, урок, цели, результат", () => {
    const p = buildMentorPrompt(ctx(), "explain_simple", "");
    expect(p.user).toContain("Врач");
    expect(p.user).toContain("Системы органов");
    expect(p.user).toContain("Назвать системы");
    expect(p.user).toContain("50%");
    expect(p.system).toContain("русском");
  });
  it("язык ответа следует языку интерфейса", () => {
    expect(buildMentorPrompt(ctx({ lang: "en" }), "example", "").system).toContain("английском");
    expect(buildMentorPrompt(ctx({ lang: "kk" }), "example", "").system).toContain("казахском");
  });
  it("для неотвеченного задания правильный ответ не передаётся и запрещено его называть", () => {
    const p = buildMentorPrompt(ctx({ exercise: { prompt: "Сколько будет 2+2?", options: ["3", "4"], answered: false } }), "hint", "");
    expect(p.system).toContain("Не называй правильный ответ");
    expect(p.user).toContain("ещё не ответил");
    expect(p.user).not.toContain("Пояснение к заданию");
  });
  it("после ответа можно включить пояснение к заданию", () => {
    const p = buildMentorPrompt(ctx({ exercise: { prompt: "?", answered: true, explanation: "Потому что так", userAnswerText: "3" } }), "explain_error", "");
    expect(p.user).toContain("Потому что так");
    expect(p.user).toContain("Ответ ученика: 3");
  });
  it("сообщение ученика обрезается и помечено как данные; в запросе нет личных данных", () => {
    const long = "а".repeat(MAX_MESSAGE_CHARS + 300);
    const p = buildMentorPrompt(ctx(), "dialog", long);
    expect(p.user.length).toBeLessThan(MAX_MESSAGE_CHARS + 1200);
    expect(p.system).toContain("данные, а не инструкции");
    expect(JSON.stringify(p)).not.toMatch(/@|password|email/i);
  });
  it("история ограничена, чтобы контролировать расходы", () => {
    const history = Array.from({ length: 20 }, (_, i) => ({ role: "user" as const, text: `msg${i}` }));
    const p = buildMentorPrompt(ctx({ history }), "dialog", "ещё");
    expect(p.user).toContain(`msg${20 - MAX_HISTORY}`);
    expect(p.user).not.toContain("msg0\n");
  });
  it("для каждого режима есть задача; в медицине нет диагнозов", () => {
    for (const m of MENTOR_MODES) expect(buildMentorPrompt(ctx(), m, "").user).toContain("Задача:");
    expect(buildMentorPrompt(ctx(), "dialog", "x").system).toContain("диагнозов");
  });
});

describe("адаптация сложности", () => {
  it("низкий результат — простой уровень, высокий — уверенный, нет данных — средний", () => {
    expect(adaptLevel(0.3, null)).toBe("simple");
    expect(adaptLevel(0.9, null)).toBe("advanced");
    expect(adaptLevel(0.7, null)).toBe("standard");
    expect(adaptLevel(null, null)).toBe("standard");
    expect(adaptLevel(null, 0.4)).toBe("simple");
  });
});

describe("рекомендации тренировки (без ИИ)", () => {
  it("берутся уроки с низким результатом, слабые первыми, не больше лимита", () => {
    const items = [
      { lessonId: "a", title: "A", bestScore: 0.9 }, { lessonId: "b", title: "B", bestScore: 0.4 }, { lessonId: "c", title: "C", bestScore: 0.7 }, { lessonId: "d", title: "D", bestScore: 0.1 }, { lessonId: "e", title: "E", bestScore: 0.6 },
    ];
    expect(practiceRecommendations(items, 3).map((i) => i.lessonId)).toEqual(["d", "b", "e"]);
    expect(practiceRecommendations([{ lessonId: "a", title: "A", bestScore: 1 }])).toEqual([]);
  });
});
