import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateProfile } from "@/backend/profile";
import { checkRateLimit } from "@/backend/rateLimit";
import { finishCodeSim, finishSim, startSim, stepSim } from "@/backend/sim";

export const dynamic = "force-dynamic";

// Единый вход: action = start | step | finish | finish_code. Все проверки и подсчёты — на сервере.
const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start"), simId: z.string().min(1).max(80) }).strict(),
  z.object({ action: z.literal("step"), runId: z.string().min(1).max(60), stepId: z.string().min(1).max(40), answer: z.unknown() }).strict(),
  z.object({ action: z.literal("finish"), runId: z.string().min(1).max(60) }).strict(),
  z.object({ action: z.literal("finish_code"), simId: z.string().min(1).max(80), passed: z.number().int(), total: z.number().int() }).strict(),
]);

export async function POST(req: Request) {
  let json: unknown;
  try { json = await req.json(); } catch { return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 }); }
  const p = Body.safeParse(json);
  if (!p.success) return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  const profile = await getOrCreateProfile();
  if (!checkRateLimit(`sim:${profile.id}`, 400).ok) return NextResponse.json({ error: "Слишком много запросов" }, { status: 429 });
  const d = p.data;
  if (d.action === "start") {
    const r = await startSim(profile.id, d.simId);
    return r ? NextResponse.json(r) : NextResponse.json({ error: "Симуляция не найдена" }, { status: 404 });
  }
  if (d.action === "step") {
    if (d.answer === undefined) return NextResponse.json({ error: "Нет ответа" }, { status: 400 });
    const r = await stepSim(profile.id, d.runId, d.stepId, d.answer);
    return r.ok ? NextResponse.json(r.result) : NextResponse.json({ error: r.error }, { status: r.status });
  }
  if (d.action === "finish") {
    const r = await finishSim(profile.id, d.runId);
    return r.ok ? NextResponse.json({ report: r.report, xp: r.xp }) : NextResponse.json({ error: r.error }, { status: r.status });
  }
  const r = await finishCodeSim(profile.id, d.simId, d.passed, d.total);
  return r.ok ? NextResponse.json({ score: r.score, xp: r.xp, verified: false }) : NextResponse.json({ error: r.error }, { status: r.status });
}
