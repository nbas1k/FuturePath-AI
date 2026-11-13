import { NextResponse } from "next/server";
import { loadAiContext, saveAiRecord } from "@/backend/aiContext";
import { runAiFeature } from "@/backend/ai/run";
import { analysisPrompt } from "@/backend/ai/prompts";
import { analysisFallback } from "@/backend/ai/fallback";
import { validateAnalysis } from "@/backend/ai/schemas";

// 1. AI Career Analysis: анализ сильных сторон, интересов и навыков по результату теста
export async function POST() {
  const ctx = await loadAiContext();
  if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const outcome = await runAiFeature({
    config: ctx.config,
    prompt: analysisPrompt(ctx.result),
    maxTokens: 1000,
    validate: validateAnalysis,
    fallback: () => analysisFallback(ctx.result),
    blockedReason: ctx.blockedReason,
  });

  const source = outcome.mode === "ai" ? "ai" : "rules";
  await saveAiRecord(ctx.profileId, "analysis", ctx.basedOn, source, outcome.data);
  return NextResponse.json({ ...outcome, source });
}
