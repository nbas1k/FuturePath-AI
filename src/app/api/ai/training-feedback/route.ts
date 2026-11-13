import { NextResponse } from "next/server";
import { getProfile } from "@/backend/profile";
import { getAiConfig, isAiEnabled } from "@/backend/ai/config";
import { checkRateLimit } from "@/backend/rateLimit";
import { runAiFeature } from "@/backend/ai/run";
import { validateCoach, trainingPrompt, trainingFallback, type TrainingData } from "@/backend/ai/coach";
import { loadTrack } from "@/backend/track";
import { TRACKS } from "@/data/track";
import { professionById } from "@/data/professions";

type Kind = "round1" | "round2" | "progress";

// AI-наставник после курса: разбор ошибок первой/повторной проверки и итог прогресса.
// Все данные берутся из базы и из описания курса на сервере; из запроса берётся только вид разбора.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const kind: Kind | null = body?.kind === "round1" || body?.kind === "round2" || body?.kind === "progress" ? body.kind : null;
  if (!kind) return NextResponse.json({ error: "Укажите, какой разбор нужен" }, { status: 400 });

  const profile = await getProfile();
  if (!profile) return NextResponse.json({ error: "Сначала пройдите тест" }, { status: 400 });
  const prof = profile.selectedProfession ? professionById(profile.selectedProfession) : undefined;
  const track = profile.selectedProfession ? TRACKS[profile.selectedProfession] : undefined;
  if (!prof || !track) return NextResponse.json({ error: "Для этой профессии курс пока не готов" }, { status: 400 });

  const state = await loadTrack(profile.id, track.professionId);
  // Для разбора нужен соответствующий раунд (или хотя бы первый для прогресса)
  const source = kind === "round1" ? state.round1 : kind === "round2" ? state.round2 : (state.round2 ?? state.round1);
  if (!source) return NextResponse.json({ error: "Сначала пройдите проверку, чтобы получить разбор" }, { status: 400 });

  const wrong = source.items
    .filter((it) => !it.correct)
    .map((it) => {
      const t = track.tasks.find((x) => x.id === it.taskId)!;
      return { question: t.question, chosen: t.options[it.answer], correct: it.correctText, explanation: it.explanation };
    });

  const data: TrainingData = {
    professionTitle: prof.title,
    kind,
    score: source.score,
    total: source.total,
    scoreBefore: kind === "progress" && state.round1 ? state.round1.score : null,
    wrong,
  };

  const config = getAiConfig();
  let blockedReason: string | null = null;
  if (isAiEnabled(config)) {
    const limit = checkRateLimit(`ai:${profile.id}`, config.rateLimitPerHour);
    if (!limit.ok) blockedReason = `Лимит запросов к ИИ исчерпан. Повторите через ${Math.ceil(limit.retryAfterSec / 60)} мин.`;
  }

  const outcome = await runAiFeature({
    config,
    prompt: trainingPrompt(data),
    maxTokens: 600,
    validate: (raw) => validateCoach(raw),
    fallback: () => trainingFallback(data),
    blockedReason,
  });
  return NextResponse.json({ ...outcome, source: outcome.mode === "ai" ? "ai" : "rules" });
}
