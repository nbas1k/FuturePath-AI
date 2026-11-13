import { NextResponse } from "next/server";
import { getProfile } from "@/backend/profile";
import { getLatestState } from "@/backend/results";
import { getAiConfig, isAiEnabled } from "@/backend/ai/config";
import { askAi, AiError } from "@/backend/ai/provider";
import { buildPrompt } from "@/backend/ai/prompt";
import { checkRateLimit } from "@/backend/rateLimit";
import { explainTop } from "@/recommendation-engine";

// Честный резервный режим: если ИИ не подключён или упал, возвращаем текст, который
// собран по правилам из ваших ответов (без ИИ), и явно помечаем mode: "fallback".
export async function POST() {
  const profile = await getProfile();
  if (!profile) return NextResponse.json({ error: "Сначала пройдите тест" }, { status: 400 });
  const latest = await getLatestState(profile.id);
  if (latest.status === "none") return NextResponse.json({ error: "Сначала пройдите тест" }, { status: 400 });
  if (latest.status === "outdated") {
    return NextResponse.json({ error: "Результат устарел: вопросы теста изменились. Пройдите тест заново." }, { status: 400 });
  }

  const config = getAiConfig();
  const prompt = buildPrompt(latest.result);
  const fallback = (reason: string) =>
    NextResponse.json({ mode: "fallback", reason, text: explainTop(latest.result).join("\n\n"), prompt });

  if (!isAiEnabled(config)) return fallback("ИИ не подключён: не задан провайдер, ключ или модель в .env.");

  // Лимит на профиль: сколько запросов к ИИ разрешено в час (AI_RATE_LIMIT_PER_HOUR)
  const limit = checkRateLimit(`ai:${profile.id}`, config.rateLimitPerHour);
  if (!limit.ok) return fallback(`Лимит запросов к ИИ исчерпан. Повторите через ${Math.ceil(limit.retryAfterSec / 60)} мин.`);

  try {
    const text = await askAi(config, prompt);
    return NextResponse.json({ mode: "ai", provider: config.provider, model: config.model, text, prompt });
  } catch (e) {
    const msg = e instanceof AiError ? e.message : "Неизвестная ошибка ИИ";
    return fallback(`${msg}. Показан резервный текст без ИИ.`);
  }
}
