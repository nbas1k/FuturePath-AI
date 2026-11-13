import { describe, it, expect, afterEach, beforeAll, afterAll, vi } from "vitest";
import http from "node:http";
import { QUESTIONS } from "@/data/questions";
import { PROFESSIONS } from "@/data/professions";
import { calculate, type Answers } from "@/recommendation-engine";
import { extractJson } from "@/backend/ai/json";
import { AiFormatError, validateAnalysis, validateRoadmap, validateSimulator } from "@/backend/ai/schemas";
import { analysisFallback, roadmapFallback, simulatorFallback } from "@/backend/ai/fallback";
import { analysisPrompt, roadmapPrompt, simulatorPrompt, resultData } from "@/backend/ai/prompts";
import { runAiFeature } from "@/backend/ai/run";
import { getAiConfig, type AiConfig } from "@/backend/ai/config";
import { parseAiPlanKey, aiPlanKey, isRoadmapTaskId } from "@/backend/planKeys";

afterEach(() => vi.unstubAllGlobals());

const answers: Answers = Object.fromEntries(QUESTIONS.map((q, i) => [q.id, q.options[i % 4].id]));
const result = calculate(answers);

const goodAnalysis = {
  summary: "Вы сильнее всего тянетесь к практическим задачам.",
  strengths: ["Логика", "Внимательность"],
  interests: ["Программы и сайты"],
  skills: ["Алгоритмы", "Работа с данными"],
  missingSkills: ["Основы программирования", "Работа с базами данных"],
  resources: ["Курсы по основам программирования"],
};
const goodRoadmap = {
  days: Array.from({ length: 30 }, (_, i) => ({ day: i + 1, title: `День ${i + 1}`, task: "Сделайте короткое задание 20 минут." })),
};
const goodSimulator = {
  summary: "ИИ может ускорить рутинные части работы.",
  automates: ["Черновики кода"],
  humanSkills: ["Проверка результата", "Общение с заказчиком"],
  advice: "Попробуйте мини-проект.",
};

describe("разбор JSON из ответа модели", () => {
  it("чистый JSON", () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
  });
  it("JSON в блоке ```json```", () => {
    expect(extractJson('Вот ответ:\n```json\n{"a":2}\n```')).toEqual({ a: 2 });
  });
  it("JSON с лишним текстом вокруг", () => {
    expect(extractJson('Конечно! {"a":3} Надеюсь, помогло.')).toEqual({ a: 3 });
  });
  it("без JSON или с битым JSON — ошибка формата", () => {
    expect(() => extractJson("просто текст")).toThrow(AiFormatError);
    expect(() => extractJson("{сломано")).toThrow(AiFormatError);
  });
});

describe("проверка структуры ответов", () => {
  it("корректный анализ проходит", () => {
    expect(validateAnalysis(goodAnalysis).strengths).toHaveLength(2);
  });
  it("анализ без нужного поля отклоняется", () => {
    const { summary: _s, ...rest } = goodAnalysis;
    expect(() => validateAnalysis(rest)).toThrow(AiFormatError);
  });
  it("слишком длинный список отклоняется", () => {
    expect(() => validateAnalysis({ ...goodAnalysis, strengths: ["a", "b", "c", "d", "e", "f"] })).toThrow(AiFormatError);
  });
  it("выдуманные цифры и зарплаты отклоняются", () => {
    expect(() => validateAnalysis({ ...goodAnalysis, summary: "Спрос вырастет на 40%" })).toThrow(AiFormatError);
    expect(() => validateSimulator({ ...goodSimulator, summary: "Зарплата 500 000 тенге" })).toThrow(AiFormatError);
  });
  it("дорожная карта: ровно 30 дней по порядку", () => {
    expect(validateRoadmap(goodRoadmap).days).toHaveLength(30);
    expect(() => validateRoadmap({ days: goodRoadmap.days.slice(0, 29) })).toThrow(AiFormatError);
    const shuffled = { days: goodRoadmap.days.map((d) => ({ ...d })) };
    shuffled.days[3].day = 9;
    expect(() => validateRoadmap(shuffled)).toThrow(AiFormatError);
  });
  it("симулятор проходит, пустое поле отклоняется", () => {
    expect(validateSimulator(goodSimulator).automates).toHaveLength(1);
    expect(() => validateSimulator({ ...goodSimulator, advice: "  " })).toThrow(AiFormatError);
  });
  it("длинные строки обрезаются, а не ломают ответ", () => {
    const v = validateAnalysis({ ...goodAnalysis, summary: "а".repeat(2000) });
    expect(v.summary.length).toBe(800);
  });
});

describe("резервный режим проходит ту же проверку структуры", () => {
  it("анализ по правилам корректен", () => {
    expect(() => validateAnalysis(analysisFallback(result))).not.toThrow();
  });
  it("дорожная карта по правилам — 30 дней", () => {
    expect(() => validateRoadmap(roadmapFallback(result.top.map((d) => d.id)))).not.toThrow();
  });
  it("симулятор по правилам корректен для КАЖДОЙ профессии каталога", () => {
    for (const p of PROFESSIONS) expect(() => validateSimulator(simulatorFallback(p))).not.toThrow();
  });
});

describe("что уходит модели", () => {
  it("в запросе есть только данные результата, без имени и id профиля", () => {
    const data = JSON.stringify(resultData(result));
    expect(data).not.toMatch(/Гость|cmw|profile/i);
    expect(analysisPrompt(result).user).toContain("Данные теста");
  });
  it("все три запроса просят вернуть JSON и запрещают выдумывать статистику", () => {
    const p = PROFESSIONS[0];
    for (const pr of [analysisPrompt(result), roadmapPrompt(result), simulatorPrompt(p, ["IT"])]) {
      expect(pr.system).toMatch(/JSON/);
      expect(pr.system).toMatch(/Не придумывай/);
    }
  });
});

describe("запуск AI-функции и резерв", () => {
  const cfg: AiConfig = { provider: "anthropic", apiKey: "test-key", model: "m", baseUrl: "", rateLimitPerHour: 10, timeoutMs: 5000 };
  const validate = (raw: unknown) => validateAnalysis(raw);
  const fallback = () => analysisFallback(result);
  const prompt = analysisPrompt(result);

  it("без ключа — резерв с понятной причиной, сеть не вызывается", async () => {
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    const out = await runAiFeature({ config: getAiConfig({} as any), prompt, maxTokens: 500, validate, fallback });
    expect(out.mode).toBe("fallback");
    expect(f).not.toHaveBeenCalled();
  });

  it("лимит запросов — резерв без вызова сети", async () => {
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    const out = await runAiFeature({ config: cfg, prompt, maxTokens: 500, validate, fallback, blockedReason: "Лимит исчерпан." });
    expect(out.mode).toBe("fallback");
    expect(f).not.toHaveBeenCalled();
  });

  it("корректный ответ модели (даже с обёрткой) принимается", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ content: [{ type: "text", text: "```json\n" + JSON.stringify(goodAnalysis) + "\n```" }] }) }));
    const out = await runAiFeature({ config: cfg, prompt, maxTokens: 500, validate, fallback });
    expect(out.mode).toBe("ai");
    if (out.mode === "ai") expect(out.data.interests).toEqual(goodAnalysis.interests);
  });

  it("битая структура — резерв с пояснением, а не падение", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ content: [{ type: "text", text: '{"summary":"x"}' }] }) }));
    const out = await runAiFeature({ config: cfg, prompt, maxTokens: 500, validate, fallback });
    expect(out.mode).toBe("fallback");
    if (out.mode === "fallback") expect(out.reason).toMatch(/структуры/);
  });

  it("ошибка ключа (401) — резерв с понятным текстом", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({}) }));
    const out = await runAiFeature({ config: cfg, prompt, maxTokens: 500, validate, fallback });
    expect(out.mode).toBe("fallback");
    if (out.mode === "fallback") expect(out.reason).toMatch(/Ключ API/);
  });
});

// Настоящий HTTP-запрос к локальному серверу, который отвечает в формате Anthropic.
// Это не настоящий провайдер (ключа нет), но проверяет весь путь: заголовки, тело, разбор ответа.
describe("HTTP-запрос к локальному имитатору провайдера", () => {
  let server: http.Server;
  let baseUrl = "";
  let lastHeaders: http.IncomingHttpHeaders = {};
  let lastBody: any = null;
  let replyText = "";

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      let raw = "";
      req.on("data", (c) => (raw += c));
      req.on("end", () => {
        lastHeaders = req.headers;
        lastBody = JSON.parse(raw);
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ content: [{ type: "text", text: replyText }] }));
      });
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
    const addr = server.address() as { port: number };
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });
  afterAll(() => new Promise<void>((r) => server.close(() => r())));

  it("отправляет ключ в заголовке, а не в теле, и разбирает ответ", async () => {
    replyText = JSON.stringify(goodAnalysis);
    const cfg: AiConfig = { provider: "anthropic", apiKey: "SECRET-KEY-123", model: "test-model", baseUrl, rateLimitPerHour: 10, timeoutMs: 5000 };
    const out = await runAiFeature({
      config: cfg,
      prompt: analysisPrompt(result),
      maxTokens: 700,
      validate: validateAnalysis,
      fallback: () => analysisFallback(result),
    });
    expect(out.mode).toBe("ai");
    expect(lastHeaders["x-api-key"]).toBe("SECRET-KEY-123");
    expect(lastBody.model).toBe("test-model");
    expect(lastBody.max_tokens).toBe(700);
    expect(JSON.stringify(lastBody)).not.toContain("SECRET-KEY-123");
  });

  it("ответ не по формату — резерв, сервер не падает", async () => {
    replyText = "Извините, я не могу ответить в JSON.";
    const cfg: AiConfig = { provider: "anthropic", apiKey: "k", model: "m", baseUrl, rateLimitPerHour: 10, timeoutMs: 5000 };
    const out = await runAiFeature({
      config: cfg,
      prompt: roadmapPrompt(result),
      maxTokens: 4000,
      validate: validateRoadmap,
      fallback: () => roadmapFallback(result.top.map((d) => d.id)),
    });
    expect(out.mode).toBe("fallback");
    if (out.mode === "fallback") expect(out.data.days).toHaveLength(30);
  });
});

describe("идентификаторы AI-планов", () => {
  it("ключ AI-карты содержит id записи и обратно разбирается", () => {
    expect(parseAiPlanKey(aiPlanKey("cmw82u1hl0000w4uk610xrr3x"))).toBe("cmw82u1hl0000w4uk610xrr3x");
  });
  it("подделанные ключи отклоняются", () => {
    expect(parseAiPlanKey("ai:../../etc")).toBeNull();
    expect(parseAiPlanKey("ai:")).toBeNull();
    expect(parseAiPlanKey("v1:it+design+business")).toBeNull();
    expect(parseAiPlanKey(undefined)).toBeNull();
  });
  it("задания карты: d1…d30, не d0, не d31, не d01", () => {
    expect(isRoadmapTaskId("d1")).toBe(true);
    expect(isRoadmapTaskId("d30")).toBe(true);
    expect(isRoadmapTaskId("d0")).toBe(false);
    expect(isRoadmapTaskId("d31")).toBe(false);
    expect(isRoadmapTaskId("d01")).toBe(false);
  });
});
