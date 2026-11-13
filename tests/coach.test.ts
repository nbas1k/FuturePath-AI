import { describe, it, expect, vi, afterEach } from "vitest";
import { validateCoach, skillGapPrompt, skillGapFallback, trainingPrompt, trainingFallback, type TrainingData } from "@/backend/ai/coach";
import { AiFormatError } from "@/backend/ai/schemas";
import { runAiFeature } from "@/backend/ai/run";
import { getAiConfig } from "@/backend/ai/config";
import { PROFESSIONS, professionById } from "@/data/professions";
import { TRACKS } from "@/data/track";

afterEach(() => vi.unstubAllGlobals());

const dev = professionById("software-developer")!;
const skillData = {
  professionTitle: dev.title,
  skills: dev.skills.map((name, i) => ({ name, rating: i % 3 === 0 ? 0 : i % 3 === 1 ? 1 : 2 })),
};

describe("проверка ответа наставника", () => {
  const good = {
    summary: "Вы уже уверенно работаете с логикой.",
    focus: [dev.skills[0]],
    nextStep: "Сделайте одно маленькое задание.",
  };
  it("корректный ответ принимается", () => {
    expect(validateCoach(good, dev.skills).focus).toEqual([dev.skills[0]]);
  });
  it("навык вне каталога отклоняется (модель не может придумать навык)", () => {
    expect(() => validateCoach({ ...good, focus: ["Управление кораблём"] }, dev.skills)).toThrow(AiFormatError);
  });
  it("больше трёх пунктов в focus — ошибка", () => {
    expect(() => validateCoach({ ...good, focus: dev.skills.slice(0, 4) }, dev.skills)).toThrow(AiFormatError);
  });
  it("проценты и зарплаты в тексте запрещены", () => {
    expect(() => validateCoach({ ...good, summary: "Спрос вырастет на 30%" }, dev.skills)).toThrow(AiFormatError);
    expect(() => validateCoach({ ...good, nextStep: "Зарплата в тенге" }, dev.skills)).toThrow(AiFormatError);
  });
  it("ссылки запрещены", () => {
    expect(() => validateCoach({ ...good, nextStep: "Смотрите https://example.test" }, dev.skills)).toThrow(AiFormatError);
  });
  it("пустое поле — ошибка", () => {
    expect(() => validateCoach({ ...good, nextStep: "   " }, dev.skills)).toThrow(AiFormatError);
  });
});

describe("резерв без ИИ проходит проверку", () => {
  it("навыки: резерв называет только навыки каталога", () => {
    const fb = skillGapFallback(skillData);
    expect(() => validateCoach(fb, dev.skills)).not.toThrow();
    fb.focus.forEach((f) => expect(dev.skills).toContain(f));
  });
  it("навыки: сначала отмеченные «пока нет»", () => {
    const fb = skillGapFallback(skillData);
    expect(fb.focus[0]).toBe(skillData.skills.find((s) => s.rating === 0)!.name);
  });
  it("навыки: без отметок резерв всё равно даёт один навык", () => {
    const fb = skillGapFallback({ professionTitle: dev.title, skills: dev.skills.map((name) => ({ name, rating: null })) });
    expect(fb.focus.length).toBeGreaterThanOrEqual(1);
  });
  it("курс: резерв для каждого раунда проходит проверку", () => {
    const wrong = [{ question: "Вопрос один?", chosen: "А", correct: "Б", explanation: "Пояснение." }];
    const data: TrainingData = { professionTitle: dev.title, kind: "round1", score: 3, total: 4, scoreBefore: null, wrong };
    expect(() => validateCoach(trainingFallback(data))).not.toThrow();
    const perfect: TrainingData = { ...data, score: 4, wrong: [] };
    expect(() => validateCoach(trainingFallback(perfect))).not.toThrow();
  });
  it("резерв честно называется правилами сайта", () => {
    const data: TrainingData = { professionTitle: dev.title, kind: "round1", score: 1, total: 4, scoreBefore: null, wrong: [{ question: "Q?", chosen: "A", correct: "B", explanation: "E." }] };
    expect(trainingFallback(data).summary).toMatch(/правило сайта, а не ответ ИИ/);
    expect(skillGapFallback(skillData).summary).toMatch(/правило сайта, а не ответ ИИ/);
  });
});

describe("что уходит модели", () => {
  it("разбор навыков: только название профессии, навыки и самооценка", () => {
    const p = skillGapPrompt(skillData);
    expect(p.user).toContain(dev.title);
    expect(p.user).toMatch(/самооценк|не отмечено|пока нет|немного|уверенно/);
    expect(p.system).toMatch(/САМООЦЕНКА/);
    expect(p.user).not.toMatch(/профиль|cookie|fp_/i);
  });
  it("разбор курса: только ошибки, без правильных ответов, которые пользователь уже видел, и без имени", () => {
    const data: TrainingData = { professionTitle: dev.title, kind: "round2", score: 2, total: 4, scoreBefore: 1, wrong: [{ question: "Q?", chosen: "A", correct: "B", explanation: "E." }] };
    const p = trainingPrompt(data);
    expect(p.user).toContain("Вопрос: Q?");
    expect(p.user).toContain("Ошибки:");
    expect(p.system).toMatch(/не спорь с ними/);
  });
  it("без ошибок промпт честно пишет, что ошибок нет", () => {
    const p = trainingPrompt({ professionTitle: dev.title, kind: "progress", score: 4, total: 4, scoreBefore: 2, wrong: [] });
    expect(p.user).toContain("Ошибок нет.");
  });
});

describe("сквозной запуск с резервом", () => {
  it("без ключа наставник сразу возвращает резерв, сеть не вызывается", async () => {
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    const out = await runAiFeature({
      config: getAiConfig({} as any),
      prompt: skillGapPrompt(skillData),
      maxTokens: 600,
      validate: (raw) => validateCoach(raw, dev.skills),
      fallback: () => skillGapFallback(skillData),
    });
    expect(out.mode).toBe("fallback");
    expect(f).not.toHaveBeenCalled();
  });
  it("ответ модели с выдуманным навыком уходит в резерв, а не попадает в интерфейс", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: async () => ({ choices: [{ message: { content: JSON.stringify({ summary: "x", focus: ["Пилотирование"], nextStep: "y" }) } }] }),
    }));
    const cfg = { provider: "antigravity" as const, apiKey: "k", model: "m", baseUrl: "http://127.0.0.1:1/v1", rateLimitPerHour: 10, timeoutMs: 2000 };
    const out = await runAiFeature({
      config: cfg,
      prompt: skillGapPrompt(skillData),
      maxTokens: 600,
      validate: (raw) => validateCoach(raw, dev.skills),
      fallback: () => skillGapFallback(skillData),
    });
    expect(out.mode).toBe("fallback");
    if (out.mode === "fallback") expect(out.reason).toMatch(/структуры/);
  });
});

describe("курс и профессии", () => {
  it("курс для «Разработчик программ» использует навыки из каталога", () => {
    expect(PROFESSIONS.some((p) => p.id === TRACKS["software-developer"].professionId)).toBe(true);
  });
});
