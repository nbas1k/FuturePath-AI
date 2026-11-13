import { NextResponse } from "next/server";
import { prisma } from "@/backend/db";
import { getProfile } from "@/backend/profile";
import { getAiConfig, isAiEnabled } from "@/backend/ai/config";
import { checkRateLimit } from "@/backend/rateLimit";
import { runAiFeature } from "@/backend/ai/run";
import { validateCoach, skillGapPrompt, skillGapFallback } from "@/backend/ai/coach";
import { professionById } from "@/data/professions";

// AI-наставник, шаг 3: какие навыки выбранной профессии стоит развить.
// Данные читаются из базы (выбранная профессия и самооценка), браузер ничего не передаёт.
export async function POST() {
  const profile = await getProfile();
  if (!profile) return NextResponse.json({ error: "Сначала пройдите тест" }, { status: 400 });
  const prof = profile.selectedProfession ? professionById(profile.selectedProfession) : undefined;
  if (!prof) return NextResponse.json({ error: "Сначала выберите профессию" }, { status: 400 });

  const rows = await prisma.skillCheck.findMany({ where: { profileId: profile.id, professionId: prof.id }, select: { skill: true, rating: true } });
  const ratings = new Map(rows.map((r) => [r.skill, r.rating]));
  const data = {
    professionTitle: prof.title,
    skills: prof.skills.map((name) => ({ name, rating: ratings.get(name) ?? null })),
  };

  const config = getAiConfig();
  let blockedReason: string | null = null;
  if (isAiEnabled(config)) {
    const limit = checkRateLimit(`ai:${profile.id}`, config.rateLimitPerHour);
    if (!limit.ok) blockedReason = `Лимит запросов к ИИ исчерпан. Повторите через ${Math.ceil(limit.retryAfterSec / 60)} мин.`;
  }

  const outcome = await runAiFeature({
    config,
    prompt: skillGapPrompt(data),
    maxTokens: 600,
    validate: (raw) => validateCoach(raw, prof.skills),
    fallback: () => skillGapFallback(data),
    blockedReason,
  });
  // Ответ не сохраняется: это разбор «здесь и сейчас»
  return NextResponse.json({ ...outcome, source: outcome.mode === "ai" ? "ai" : "rules" });
}
