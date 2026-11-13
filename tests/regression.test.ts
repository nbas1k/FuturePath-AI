import { describe, it, expect, beforeEach } from "vitest";
import { QUESTIONS } from "@/data/questions";
import { buildPlan, planKeyFor, parsePlanKey, PLAN_VERSION } from "@/data/plan";
import { findProblem, validateAnswers, sanitizeAnswers, type Answers } from "@/recommendation-engine";
import { checkRateLimit, rateLimitKeyCount, resetRateLimit } from "@/backend/rateLimit";
import { profileCookieOptions } from "@/backend/cookies";
import { createSaveQueue } from "@/components/planQueue";
import * as directions from "@/data/directions";

const allAnswers = (opt: string): Answers => Object.fromEntries(QUESTIONS.map((q) => [q.id, opt]));

// Пункт 1: прогресс привязан к версии плана и набору направлений, а не к номеру дня
describe("ключ плана и постоянные id заданий (п.1)", () => {
  it("ключ содержит версию и три направления по порядку", () => {
    expect(planKeyFor(["it", "design", "business"])).toBe(`${PLAN_VERSION}:it+design+business`);
  });

  it("другой набор направлений даёт другой ключ (старые отметки не переносятся)", () => {
    expect(planKeyFor(["it", "design", "business"])).not.toBe(planKeyFor(["medicine", "business", "it"]));
  });

  it("taskId уникальны внутри плана и не зависят от номера дня", () => {
    const plan = buildPlan(["it", "design", "business"]);
    expect(new Set(plan.map((p) => p.taskId)).size).toBe(30);
    // Задание «it-1» есть в плане, где IT на первом месте, и в плане, где IT на втором месте
    const other = buildPlan(["design", "it", "business"]);
    expect(plan.some((p) => p.taskId === "it-1")).toBe(true);
    expect(other.some((p) => p.taskId === "it-1")).toBe(true);
    expect(plan.find((p) => p.taskId === "it-1")!.task).toBe(other.find((p) => p.taskId === "it-1")!.task);
  });

  it("parsePlanKey принимает свой ключ и отвергает подделки", () => {
    expect(parsePlanKey(planKeyFor(["it", "design", "business"]))).toEqual(["it", "design", "business"]);
    expect(parsePlanKey("v0:it+design+business")).toBeNull(); // чужая версия
    expect(parsePlanKey("v1:it+design")).toBeNull(); // мало направлений
    expect(parsePlanKey("v1:it+it+design")).toBeNull(); // повтор
    expect(parsePlanKey("v1:it+design+toString")).toBeNull(); // не направление (защита от прототипа)
    expect(parsePlanKey("v1:it+design+__proto__")).toBeNull();
    expect(parsePlanKey(undefined)).toBeNull();
    expect(parsePlanKey(42)).toBeNull();
  });
});

// Пункт 2: быстрые клики не приводят к откату соседних отметок
describe("очередь сохранения отметок (п.2)", () => {
  // Имитация сервера: записываем значение, с небольшой случайной задержкой
  function fakeServer(failOn: string[] = []) {
    const db = new Map<string, boolean>();
    const send = async (taskId: string, done: boolean) => {
      await new Promise((r) => setTimeout(r, Math.random() * 5));
      if (failOn.includes(taskId)) throw new Error("сеть");
      db.set(taskId, done);
    };
    return { db, send };
  }

  it("быстрые клики по разным заданиям сохраняются все", async () => {
    const { db, send } = fakeServer();
    const idle: boolean[] = [];
    const q = createSaveQueue({ send, onIdle: (e) => idle.push(e) });
    for (const id of ["it-1", "it-2", "it-3", "design-1", "end-2"]) q.set(id, true);
    await waitIdle(q);
    expect([...db.keys()].sort()).toEqual(["design-1", "end-2", "it-1", "it-2", "it-3"]);
    expect(idle).toEqual([false]);
  });

  it("три клика по одному заданию: в итоге уходит последнее значение", async () => {
    const { db, send } = fakeServer();
    const q = createSaveQueue({ send, onIdle: () => {} });
    q.set("it-1", true);
    q.set("it-1", false);
    q.set("it-1", true);
    await waitIdle(q);
    expect(db.get("it-1")).toBe(true);
  });

  it("очередь по одному заданию не шлёт два запроса одновременно", async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const send = async () => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((r) => setTimeout(r, 3));
      inFlight--;
    };
    const q = createSaveQueue({ send, onIdle: () => {} });
    for (let i = 0; i < 6; i++) q.set("it-1", i % 2 === 0);
    await waitIdle(q);
    expect(maxInFlight).toBe(1);
  });

  it("ошибка одного запроса не теряет остальные и сообщает onIdle(true)", async () => {
    const { db, send } = fakeServer(["it-2"]);
    const idle: boolean[] = [];
    const q = createSaveQueue({ send, onIdle: (e) => idle.push(e) });
    q.set("it-1", true);
    q.set("it-2", true);
    q.set("it-3", true);
    await waitIdle(q);
    expect(db.has("it-1")).toBe(true);
    expect(db.has("it-3")).toBe(true);
    expect(db.has("it-2")).toBe(false);
    expect(idle).toEqual([true]);
  });
});

async function waitIdle(q: { isBusy(): boolean }) {
  for (let i = 0; i < 500 && q.isBusy(); i++) await new Promise((r) => setTimeout(r, 2));
  await new Promise((r) => setTimeout(r, 5));
}

// Пункт 4 и 7: устаревшие ответы не ломают расчёт и распознаются
describe("устаревшие ответы (п.4, п.7)", () => {
  it("sanitizeAnswers убирает неизвестные вопросы и варианты", () => {
    const good = QUESTIONS[0];
    const raw = { [good.id]: good.options[0].id, q999: "a", [QUESTIONS[1].id]: "zzz", [QUESTIONS[2].id]: 5 };
    const { answers, dropped } = sanitizeAnswers(raw);
    expect(answers).toEqual({ [good.id]: good.options[0].id });
    expect(dropped).toBe(3);
  });

  it("sanitizeAnswers переживает мусор вместо объекта", () => {
    expect(sanitizeAnswers(null)).toEqual({ answers: {}, dropped: 0 });
    expect(sanitizeAnswers("строка")).toEqual({ answers: {}, dropped: 0 });
    expect(sanitizeAnswers([1, 2])).toEqual({ answers: {}, dropped: 2 });
  });

  it("findProblem указывает вопрос, на котором проблема", () => {
    const answers = allAnswers("a");
    delete answers[QUESTIONS[4].id];
    expect(findProblem(answers)?.questionId).toBe(QUESTIONS[4].id);
    expect(findProblem(allAnswers("a"))).toBeNull();
  });

  it("validateAnswers возвращает текст ошибки (совместимость)", () => {
    expect(validateAnswers(allAnswers("a"))).toBeNull();
    expect(validateAnswers({})).toMatch(/Нет ответа/);
  });
});

// Пункт 5 и 6: ограничение запросов не растёт бесконечно и работает по окну времени
describe("rate limit (п.5, п.6)", () => {
  beforeEach(() => resetRateLimit());

  it("лимит окна работает и разрешает снова после окна", () => {
    const w = 1000;
    expect(checkRateLimit("k", 2, 0, w).ok).toBe(true);
    expect(checkRateLimit("k", 2, 10, w).ok).toBe(true);
    expect(checkRateLimit("k", 2, 20, w).ok).toBe(false);
    expect(checkRateLimit("k", 2, 1001, w).ok).toBe(true);
  });

  it("число ключей ограничено (память не растёт бесконечно)", () => {
    for (let i = 0; i < 10_500; i++) checkRateLimit(`ip-${i}`, 5, 0, 60_000);
    expect(rateLimitKeyCount()).toBeLessThanOrEqual(10_000);
  });

  it("устаревшие записи удаляются", () => {
    for (let i = 0; i < 100; i++) checkRateLimit(`old-${i}`, 5, 0, 1000);
    // Много вызовов позже: окно прошло, старые ключи должны исчезнуть
    for (let i = 0; i < 1000; i++) checkRateLimit("fresh", 5, 1_000_000, 1000);
    expect(rateLimitKeyCount()).toBeLessThan(50);
  });
});

// Пункт 3: cookie защищён
describe("cookie профиля (п.3)", () => {
  it("httpOnly, sameSite lax, путь /, срок один год", () => {
    const o = profileCookieOptions({ NODE_ENV: "development" } as any);
    expect(o.httpOnly).toBe(true);
    expect(o.sameSite).toBe("lax");
    expect(o.path).toBe("/");
    expect(o.maxAge).toBe(60 * 60 * 24 * 365);
  });

  it("secure включён в production", () => {
    expect(profileCookieOptions({ NODE_ENV: "production" } as any).secure).toBe(true);
    expect(profileCookieOptions({ NODE_ENV: "development" } as any).secure).toBe(false);
  });

  it("COOKIE_SECURE=false отключает secure (для http без HTTPS)", () => {
    expect(profileCookieOptions({ NODE_ENV: "production", COOKIE_SECURE: "false" } as any).secure).toBe(false);
  });

  it("срок 0 для удаления cookie", () => {
    expect(profileCookieOptions({ NODE_ENV: "development" } as any, 0).maxAge).toBe(0);
  });
});

// Пункт 10: мёртвый код удалён
describe("лишние экспорты (п.10)", () => {
  it("directionName удалён", () => {
    expect((directions as Record<string, unknown>).directionName).toBeUndefined();
  });
});
