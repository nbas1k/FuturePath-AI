import { NextResponse } from "next/server";
import { loadAiContext } from "@/backend/aiContext";
import { runAiFeature } from "@/backend/ai/run";
import { simulatorPrompt } from "@/backend/ai/prompts";
import { simulatorFallback } from "@/backend/ai/fallback";
import { validateSimulator } from "@/backend/ai/schemas";
import { DIRECTIONS } from "@/data/directions";
import { PROFESSIONS } from "@/data/professions";

// 3. AI Future Simulator: как ИИ может изменить выбранную профессию.
// Профессия выбирается по id из каталога (любой другой id отклоняется).
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const profession = PROFESSIONS.find((p) => p.id === body?.professionId);
  if (!profession) return NextResponse.json({ error: "Выберите профессию из каталога" }, { status: 400 });

  const ctx = await loadAiContext();
  if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const topNames = ctx.result.top.map((d) => DIRECTIONS.find((x) => x.id === d.id)?.name ?? d.name);
  const outcome = await runAiFeature({
    config: ctx.config,
    prompt: simulatorPrompt(profession, topNames),
    maxTokens: 1200,
    validate: validateSimulator,
    fallback: () => simulatorFallback(profession),
    blockedReason: ctx.blockedReason,
  });

  // Симулятор не сохраняется: это разовый разбор профессии
  return NextResponse.json({ ...outcome, source: outcome.mode === "ai" ? "ai" : "rules", professionTitle: profession.title });
}
