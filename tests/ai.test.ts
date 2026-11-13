import { describe, it, expect, vi, afterEach } from "vitest";
import { getAiConfig, isAiEnabled } from "@/backend/ai/config";
import { checkRateLimit, resetRateLimit } from "@/backend/rateLimit";
import { askAi, AiError } from "@/backend/ai/provider";
import { buildPrompt } from "@/backend/ai/prompt";
import { calculate } from "@/recommendation-engine";
import { QUESTIONS } from "@/data/questions";

afterEach(() => vi.unstubAllGlobals());

const answers = Object.fromEntries(QUESTIONS.map((q) => [q.id, "a"]));

describe("настройки ИИ", () => {
  it("по умолчанию ИИ выключен", () => {
    expect(isAiEnabled(getAiConfig({} as any))).toBe(false);
  });
  it("неизвестный провайдер считается none", () => {
    expect(getAiConfig({ AI_PROVIDER: "abc" } as any).provider).toBe("none");
  });
  it("без ключа или модели ИИ выключен", () => {
    expect(isAiEnabled(getAiConfig({ AI_PROVIDER: "openai", AI_MODEL: "m" } as any))).toBe(false);
    expect(isAiEnabled(getAiConfig({ AI_PROVIDER: "openai", AI_API_KEY: "k" } as any))).toBe(false);
    expect(isAiEnabled(getAiConfig({ AI_PROVIDER: "openai", AI_API_KEY: "k", AI_MODEL: "m" } as any))).toBe(true);
  });
  it("openai-compatible требует адрес", () => {
    expect(isAiEnabled(getAiConfig({ AI_PROVIDER: "openai-compatible", AI_API_KEY: "k", AI_MODEL: "m" } as any))).toBe(false);
  });
});

describe("лимит запросов", () => {
  it("блокирует после лимита и освобождает через час", () => {
    resetRateLimit();
    expect(checkRateLimit("u", 2, 0).ok).toBe(true);
    expect(checkRateLimit("u", 2, 1000).ok).toBe(true);
    const third = checkRateLimit("u", 2, 2000);
    expect(third.ok).toBe(false);
    expect(third.retryAfterSec).toBeGreaterThan(0);
    expect(checkRateLimit("u", 2, 3600_001).ok).toBe(true);
  });
  it("ключи независимы", () => {
    resetRateLimit();
    checkRateLimit("a", 1, 0);
    expect(checkRateLimit("b", 1, 0).ok).toBe(true);
  });
});

describe("запрос к ИИ (fetch подменён, настоящий API НЕ вызывается)", () => {
  const cfg = getAiConfig({ AI_PROVIDER: "anthropic", AI_API_KEY: "test-key", AI_MODEL: "m" } as any);
  const prompt = { system: "s", user: "u" };

  it("при выключенном ИИ бросает disabled", async () => {
    await expect(askAi(getAiConfig({} as any), prompt)).rejects.toMatchObject({ code: "disabled" });
  });
  it("разбирает ответ anthropic и отправляет ключ в заголовке", async () => {
    const f = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ content: [{ type: "text", text: " привет " }] }) });
    vi.stubGlobal("fetch", f);
    expect(await askAi(cfg, prompt)).toBe("привет");
    expect(f.mock.calls[0][1].headers["x-api-key"]).toBe("test-key");
  });
  it("разбирает ответ openai-формата", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: "ok" } }] }) }));
    const c = getAiConfig({ AI_PROVIDER: "openai", AI_API_KEY: "k", AI_MODEL: "m" } as any);
    expect(await askAi(c, prompt)).toBe("ok");
  });
  it.each([[401, "auth"], [429, "rate"], [500, "upstream"]])("статус %i -> %s", async (status, code) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status, json: async () => ({}) }));
    await expect(askAi(cfg, prompt)).rejects.toMatchObject({ code });
  });
  it("сетевая ошибка -> upstream, пустой ответ -> empty", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("net")));
    await expect(askAi(cfg, prompt)).rejects.toBeInstanceOf(AiError);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ content: [] }) }));
    await expect(askAi(cfg, prompt)).rejects.toMatchObject({ code: "empty" });
  });
});

describe("промпт", () => {
  it("содержит баллы и профессии и не содержит личных данных", () => {
    const p = buildPrompt(calculate(answers));
    expect(p.user).toMatch(/баллов/);
    expect(p.user).toMatch(/Подходящие профессии/);
    expect(p.system).toMatch(/Не выдумывай статистику/);
  });
});
