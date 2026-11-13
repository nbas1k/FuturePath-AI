import { NextResponse } from "next/server";
import { loadAiContext, saveAiRecord } from "@/backend/aiContext";
import { runAiFeature } from "@/backend/ai/run";
import { roadmapPrompt } from "@/backend/ai/prompts";
import { roadmapFallback } from "@/backend/ai/fallback";
import { validateRoadmap } from "@/backend/ai/schemas";

// 2. AI Learning Roadmap: персональный план на 30 дней.
// Каждый созданный план получает свой id (recordId). Прогресс привязан к нему (planKey = "ai:<id>"),
// поэтому после повторного теста или нового плана старые отметки не переносятся.
export async function POST() {
  const ctx = await loadAiContext();
  if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const outcome = await runAiFeature({
    config: ctx.config,
    prompt: roadmapPrompt(ctx.result),
    maxTokens: 4000, // 30 заданий — длинный ответ
    validate: validateRoadmap,
    fallback: () => roadmapFallback(ctx.result.top.map((d) => d.id)),
    blockedReason: ctx.blockedReason,
  });

  const source = outcome.mode === "ai" ? "ai" : "rules";
  const record = await saveAiRecord(ctx.profileId, "roadmap", ctx.basedOn, source, outcome.data);
  return NextResponse.json({ ...outcome, source, recordId: record.id, planKey: `ai:${record.id}` });
}
