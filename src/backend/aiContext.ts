// Общий контекст для AI-маршрутов и хранение их результатов.
import type { Result } from "@/recommendation-engine";
import { planKeyFor } from "@/data/plan";
import { prisma } from "./db";
import { getProfile } from "./profile";
import { getLatestState } from "./results";
import { getAiConfig, isAiEnabled, type AiConfig } from "./ai/config";
import { checkRateLimit } from "./rateLimit";

export type AiContext =
  | { ok: true; profileId: string; result: Result; basedOn: string; config: AiConfig; blockedReason: string | null }
  | { ok: false; status: number; error: string };

// Загружает профиль и АКТУАЛЬНЫЙ результат теста (из базы, а не из запроса браузера).
// Лимит запросов считается только когда ИИ реально подключён: иначе резервный режим тратил бы лимит впустую.
export async function loadAiContext(): Promise<AiContext> {
  const profile = await getProfile();
  if (!profile) return { ok: false, status: 400, error: "Сначала пройдите тест" };
  const state = await getLatestState(profile.id);
  if (state.status === "none") return { ok: false, status: 400, error: "Сначала пройдите тест" };
  if (state.status === "outdated") return { ok: false, status: 400, error: "Результат устарел: пройдите тест заново." };

  const config = getAiConfig();
  let blockedReason: string | null = null;
  if (isAiEnabled(config)) {
    const limit = checkRateLimit(`ai:${profile.id}`, config.rateLimitPerHour);
    if (!limit.ok) blockedReason = `Лимит запросов к ИИ исчерпан. Повторите через ${Math.ceil(limit.retryAfterSec / 60)} мин.`;
  }
  return {
    ok: true,
    profileId: profile.id,
    result: state.result,
    basedOn: planKeyFor(state.result.top.map((d) => d.id)),
    config,
    blockedReason,
  };
}

// Сохраняет результат AI-функции. Каждая запись имеет свой id: так планы не смешиваются.
export async function saveAiRecord(profileId: string, kind: "analysis" | "roadmap" | "scenarios", basedOn: string, source: string, payload: unknown) {
  return prisma.aiRecord.create({ data: { profileId, kind, basedOn, source, payload: JSON.stringify(payload) } });
}

// Последняя запись нужного вида для текущего результата (если результат сменился — записи не подходят)
export async function latestAiRecord<T>(profileId: string, kind: "analysis" | "roadmap" | "scenarios", basedOn: string) {
  const row = await prisma.aiRecord.findFirst({ where: { profileId, kind, basedOn }, orderBy: { createdAt: "desc" } });
  if (!row) return null;
  try {
    return { id: row.id, source: row.source, createdAt: row.createdAt, data: JSON.parse(row.payload) as T };
  } catch {
    return null;
  }
}
