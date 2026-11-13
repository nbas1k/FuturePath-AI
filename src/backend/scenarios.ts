// Future Career Scenarios: загрузка сохранённых сценариев и запрос к настоящему ИИ.
import { professionById } from "@/data/professions";
import { latestAiRecord, saveAiRecord } from "./aiContext";
import { getAiConfig, isAiEnabled } from "./ai/config";
import { runAiFeature } from "./ai/run";
import { checkRateLimit } from "./rateLimit";
import { scenariosPrompt, validateScenarios, type ScenariosOutput } from "./ai/scenariosAi";

export type ScenariosState = { aiAvailable: boolean; saved: { data: ScenariosOutput; date: string } | null };

export async function loadScenarios(profileId: string, professionId: string): Promise<ScenariosState> {
  const rec = await latestAiRecord<ScenariosOutput>(profileId, "scenarios", professionId);
  return { aiAvailable: isAiEnabled(getAiConfig()), saved: rec ? { data: rec.data, date: rec.createdAt.toISOString().slice(0, 10) } : null };
}

export async function generateScenarios(profileId: string, professionId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const prof = professionById(professionId);
  if (!prof) return { ok: false, error: "Профессия не найдена" };
  const config = getAiConfig();
  if (!isAiEnabled(config)) return { ok: false, error: "ИИ сейчас не подключён, поэтому сценарии построить нельзя. Они не подделываются." };
  const limit = checkRateLimit(`ai:${profileId}`, config.rateLimitPerHour);
  if (!limit.ok) return { ok: false, error: `Лимит запросов к ИИ исчерпан. Повторите через ${Math.ceil(limit.retryAfterSec / 60)} мин.` };
  const out = await runAiFeature<ScenariosOutput | null>({ config, prompt: scenariosPrompt(prof), maxTokens: 3500, validate: validateScenarios, fallback: () => null });
  if (out.mode !== "ai" || !out.data) return { ok: false, error: `Не удалось построить сценарии: ${out.mode === "fallback" ? out.reason : "ошибка"}` };
  await saveAiRecord(profileId, "scenarios", professionId, `ai:${out.model}`, out.data);
  return { ok: true };
}
