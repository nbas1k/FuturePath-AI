import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import http from "node:http";
import { getAiConfig, isAiEnabled, providerLabel, ANTIGRAVITY_DEFAULT_URL, type AiConfig } from "@/backend/ai/config";
import { askAi, AiError } from "@/backend/ai/provider";
import { runAiFeature } from "@/backend/ai/run";
import { validateAnalysis } from "@/backend/ai/schemas";
import { analysisFallback } from "@/backend/ai/fallback";
import { analysisPrompt } from "@/backend/ai/prompts";
import { calculate, type Answers } from "@/recommendation-engine";
import { CURRENT_TEST_VERSION, QUESTIONS } from "@/data/questions";

afterEach(() => vi.unstubAllGlobals());

const answers: Answers = Object.fromEntries(QUESTIONS.map((q, i) => [q.id, q.options[i % 4].id]));
const result = calculate(answers, CURRENT_TEST_VERSION);

const goodAnalysis = {
  summary: "Вы тянетесь к практическим задачам.",
  strengths: ["Логика", "Внимательность"],
  interests: ["Программы и сайты"],
  skills: ["Алгоритмы", "Работа с данными"],
  missingSkills: ["Основы программирования", "Работа с базами данных"],
  resources: ["Курсы по основам программирования"],
};

describe("переменные Antigravity Tools", () => {
  it("читает ANTIGRAVITY_* и по умолчанию берёт локальный адрес 127.0.0.1:8045", () => {
    const c = getAiConfig({ AI_PROVIDER: "antigravity", ANTIGRAVITY_API_KEY: "k", ANTIGRAVITY_MODEL: "m" } as any);
    expect(c.provider).toBe("antigravity");
    expect(c.baseUrl).toBe(ANTIGRAVITY_DEFAULT_URL);
    expect(c.apiKey).toBe("k");
    expect(isAiEnabled(c)).toBe(true);
  });
  it("ANTIGRAVITY_API_URL переопределяет адрес и убирает последний слеш", () => {
    const c = getAiConfig({ AI_PROVIDER: "antigravity", ANTIGRAVITY_API_URL: "https://example.test/v1/", ANTIGRAVITY_API_KEY: "k", ANTIGRAVITY_MODEL: "m" } as any);
    expect(c.baseUrl).toBe("https://example.test/v1");
  });
  it("без ключа или модели — выключено (резерв)", () => {
    expect(isAiEnabled(getAiConfig({ AI_PROVIDER: "antigravity", ANTIGRAVITY_MODEL: "m" } as any))).toBe(false);
    expect(isAiEnabled(getAiConfig({ AI_PROVIDER: "antigravity", ANTIGRAVITY_API_KEY: "k" } as any))).toBe(false);
  });
  it("переменные AI_* для других провайдеров не мешают antigravity и наоборот", () => {
    const c = getAiConfig({ AI_PROVIDER: "openai", AI_API_KEY: "a", AI_MODEL: "b", ANTIGRAVITY_API_KEY: "x" } as any);
    expect(c.apiKey).toBe("a");
  });
  it("таймаут настраивается и ограничен разумными пределами", () => {
    expect(getAiConfig({ AI_TIMEOUT_MS: "1000" } as any).timeoutMs).toBe(5000);
    expect(getAiConfig({ AI_TIMEOUT_MS: "999999" } as any).timeoutMs).toBe(120000);
    expect(getAiConfig({} as any).timeoutMs).toBe(60000);
  });
  it("в подписи провайдера нет ключа и адреса", () => {
    const c: AiConfig = { provider: "antigravity", apiKey: "SECRET", model: "m", baseUrl: "http://127.0.0.1:8045/v1", rateLimitPerHour: 10, timeoutMs: 60000 };
    expect(providerLabel(c)).toBe("Antigravity Tools");
    expect(providerLabel(c)).not.toContain("SECRET");
  });
});

// Локальный имитатор прокси в формате OpenAI chat/completions. Проверяет путь запроса, заголовки и разбор ответа.
describe("HTTP к локальному имитатору Antigravity (формат OpenAI)", () => {
  let server: http.Server;
  let baseUrl = "";
  let last: { headers: http.IncomingHttpHeaders; body: any; url?: string } = { headers: {}, body: null };
  let reply: { status: number; body: unknown; delayMs?: number } = { status: 200, body: {} };

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      let raw = "";
      req.on("data", (c) => (raw += c));
      req.on("end", () => {
        last = { headers: req.headers, body: raw ? JSON.parse(raw) : null, url: req.url };
        setTimeout(() => {
          res.writeHead(reply.status, { "content-type": "application/json" });
          res.end(JSON.stringify(reply.body));
        }, reply.delayMs ?? 0);
      });
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
    baseUrl = `http://127.0.0.1:${(server.address() as { port: number }).port}/v1`;
  });
  afterAll(() => new Promise<void>((r) => server.close(() => r())));

  const cfg = (over: Partial<AiConfig> = {}): AiConfig => ({
    provider: "antigravity", apiKey: "PROXY-KEY-XYZ", model: "test-model", baseUrl, rateLimitPerHour: 10, timeoutMs: 3000, ...over,
  });

  it("отправляет запрос на /chat/completions с Bearer-ключом и моделью, ключ не попадает в тело", async () => {
    reply = { status: 200, body: { choices: [{ message: { content: JSON.stringify(goodAnalysis) } }] } };
    const out = await runAiFeature({ config: cfg(), prompt: analysisPrompt(result), maxTokens: 800, validate: validateAnalysis, fallback: () => analysisFallback(result) });
    expect(out.mode).toBe("ai");
    expect(last.url).toBe("/v1/chat/completions");
    expect(last.headers.authorization).toBe("Bearer PROXY-KEY-XYZ");
    expect(last.body.model).toBe("test-model");
    expect(last.body.max_tokens).toBe(800);
    expect(JSON.stringify(last.body)).not.toContain("PROXY-KEY-XYZ");
    // Персональные данные: имени и id профиля в запросе нет
    expect(JSON.stringify(last.body)).not.toMatch(/Гость|fp_profile/);
  });

  it("ответ с JSON в блоке ```json``` проходит разбор", async () => {
    reply = { status: 200, body: { choices: [{ message: { content: "Вот анализ:\n```json\n" + JSON.stringify(goodAnalysis) + "\n```" } }] } };
    const out = await askAi(cfg(), { system: "s", user: "u" });
    expect(out).toContain("missingSkills");
  });

  it("ответ модели с выдуманной ссылкой отклоняется и уходит в резерв", async () => {
    const withUrl = { ...goodAnalysis, resources: ["Курс на https://fake.example/course"] };
    reply = { status: 200, body: { choices: [{ message: { content: JSON.stringify(withUrl) } }] } };
    const out = await runAiFeature({ config: cfg(), prompt: analysisPrompt(result), maxTokens: 800, validate: validateAnalysis, fallback: () => analysisFallback(result) });
    expect(out.mode).toBe("fallback");
    if (out.mode === "fallback") expect(out.reason).toMatch(/структуры/);
  });

  it("ошибка 401 от прокси — резерв с понятной причиной, ключ не выводится", async () => {
    reply = { status: 401, body: { error: "bad key PROXY-KEY-XYZ" } };
    const out = await runAiFeature({ config: cfg(), prompt: analysisPrompt(result), maxTokens: 800, validate: validateAnalysis, fallback: () => analysisFallback(result) });
    expect(out.mode).toBe("fallback");
    if (out.mode === "fallback") {
      expect(out.reason).toMatch(/Ключ API/);
      expect(out.reason).not.toContain("PROXY-KEY-XYZ");
    }
  });

  it("429 от прокси — код rate", async () => {
    reply = { status: 429, body: {} };
    await expect(askAi(cfg(), { system: "s", user: "u" })).rejects.toMatchObject({ code: "rate" });
  });

  it("500 от прокси — тело ошибки не попадает в сообщение", async () => {
    reply = { status: 500, body: { secret: "internal-detail" } };
    try {
      await askAi(cfg(), { system: "s", user: "u" });
      throw new Error("должно было упасть");
    } catch (e) {
      expect(e).toBeInstanceOf(AiError);
      expect((e as Error).message).not.toContain("internal-detail");
    }
  });

  it("прокси молчит дольше таймаута — код timeout", async () => {
    reply = { status: 200, body: { choices: [{ message: { content: "{}" } }] }, delayMs: 1500 };
    await expect(askAi(cfg({ timeoutMs: 200 }), { system: "s", user: "u" })).rejects.toMatchObject({ code: "timeout" });
  });

  it("прокси не запущен (нет соединения) — резерв, а не падение сайта", async () => {
    const dead = cfg({ baseUrl: "http://127.0.0.1:1/v1", timeoutMs: 2000 });
    const out = await runAiFeature({ config: dead, prompt: analysisPrompt(result), maxTokens: 800, validate: validateAnalysis, fallback: () => analysisFallback(result) });
    expect(out.mode).toBe("fallback");
    if (out.mode === "fallback") expect(out.reason).toMatch(/Не удалось связаться/);
  });

  it("пустой ответ модели — код empty", async () => {
    reply = { status: 200, body: { choices: [{ message: { content: "   " } }] } };
    await expect(askAi(cfg(), { system: "s", user: "u" })).rejects.toMatchObject({ code: "empty" });
  });
});

describe("резерв без прокси", () => {
  it("резервный анализ содержит недостающие компетенции и ресурсы и проходит проверку", () => {
    const fb = analysisFallback(result);
    expect(fb.missingSkills.length).toBeGreaterThanOrEqual(2);
    expect(fb.resources.length).toBeGreaterThanOrEqual(1);
    expect(() => validateAnalysis(fb)).not.toThrow();
  });
  it("старый анализ без новых полей не проходит новую проверку (ошибка, а не падение)", () => {
    expect(() => validateAnalysis({ summary: "x", strengths: ["a", "b"], interests: ["c"], skills: ["d", "e"] })).toThrow();
  });
});
