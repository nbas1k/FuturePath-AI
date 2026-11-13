import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/backend/db";
import { DAILY_CAP, askMentor } from "@/backend/learnMentor";
import { ensureContent } from "@/backend/learnContent";
import type { AiConfig } from "@/backend/ai/config";
import { AiError } from "@/backend/ai/provider";

const LESSON = "skill:communication/m1/l1";
const on: AiConfig = { provider: "openai", apiKey: "test-key", model: "m", baseUrl: "http://example.invalid", rateLimitPerHour: 3, timeoutMs: 1000 };
const off: AiConfig = { ...on, provider: "none" };
const ids: string[] = [];
const mk = async () => { const p = await prisma.profile.create({ data: {} }); ids.push(p.id); return p.id; };
const base = { lessonId: LESSON, mode: "explain_simple" as const, message: "", lang: "ru" as const };

beforeAll(async () => { await ensureContent(); });
afterAll(async () => { await prisma.profile.deleteMany({ where: { id: { in: ids } } }); });

describe("сервис ИИ-наставника (с подставным провайдером)", () => {
  it("ИИ не подключён: честная ошибка 503 и никакого выдуманного ответа", async () => {
    const id = await mk();
    const r = await askMentor(id, base, { config: off, ask: async () => "не должно вызваться", now: () => Date.now() });
    expect(r).toMatchObject({ ok: false, status: 503, code: "unavailable" });
    expect(await prisma.aiSession.count({ where: { profileId: id } })).toBe(0);
  });
  it("успешный ответ сохраняется в ai_sessions, в запрос уходит учебный контекст", async () => {
    const id = await mk();
    let seen = "";
    const r = await askMentor(id, { ...base, message: "Объясни про перефразирование" }, { config: on, ask: async (_c, p) => { seen = p.system + "\n" + p.user; return "Перефразирование — это пересказ своими словами."; }, now: () => Date.now() });
    expect(r).toEqual({ ok: true, reply: "Перефразирование — это пересказ своими словами." });
    expect(seen).toContain("Активное слушание");
    expect(seen).not.toContain("test-key"); // ключ в запрос не попадает
    const s = await prisma.aiSession.findFirst({ where: { profileId: id } });
    expect((s!.messages as unknown[]).length).toBe(2);
  });
  it("правильные ответы к неотвеченному заданию не попадают в запрос", async () => {
    const id = await mk();
    let seen = "";
    await askMentor(id, { ...base, mode: "hint", exerciseId: `${LESSON}/e1` }, { config: on, ask: async (_c, p) => { seen = p.user; return "Подсказка"; }, now: () => Date.now() });
    expect(seen).toContain("ещё не ответил");
    expect(seen).not.toContain("Перефразирование и уточнения показывают"); // пояснение к ответу
  });
  it("ошибка провайдера: понятное сообщение и код 502, запись не создаётся", async () => {
    const id = await mk();
    const r = await askMentor(id, base, { config: on, ask: async () => { throw new AiError("timeout", "Провайдер ИИ не ответил вовремя"); }, now: () => Date.now() });
    expect(r).toMatchObject({ ok: false, status: 502, code: "failed" });
    expect(await prisma.aiSession.count({ where: { profileId: id } })).toBe(0);
  });
  it("пустой ответ модели не выдаётся за результат", async () => {
    const id = await mk();
    const r = await askMentor(id, base, { config: on, ask: async () => "   ", now: () => Date.now() });
    expect(r).toMatchObject({ ok: false, status: 502 });
  });
  it("ограничение запросов в час", async () => {
    const id = await mk();
    const deps = { config: on, ask: async () => "ok", now: () => Date.now() };
    for (let i = 0; i < 3; i++) expect((await askMentor(id, base, deps)).ok).toBe(true);
    expect(await askMentor(id, base, deps)).toMatchObject({ ok: false, status: 429, code: "rate" });
  });
  it("дневной лимит ограничивает расходы", async () => {
    const id = await mk();
    const now = Date.now();
    await prisma.aiSession.create({ data: { profileId: id, kind: "mentor", contextId: LESSON, messages: Array.from({ length: DAILY_CAP }, () => ({ role: "user", text: "x", at: now })) } });
    expect(await askMentor(id, base, { config: { ...on, rateLimitPerHour: 1000 }, ask: async () => "ok", now: () => now })).toMatchObject({ ok: false, status: 429, code: "daily" });
  });
  it("неизвестный урок: 404", async () => {
    const id = await mk();
    expect(await askMentor(id, { ...base, lessonId: "нет" }, { config: on, ask: async () => "ok", now: () => Date.now() })).toMatchObject({ ok: false, status: 404 });
  });
});
