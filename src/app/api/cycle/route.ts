import { NextResponse } from "next/server";
import { guardSelected } from "@/backend/learnGuard";
import { markFuture, requestCycleAi, skipCycleAi, startCycle, submitPhase, submitPractice } from "@/backend/cycle";

// Единый цикл обучения: одно действие за запрос. Порядок шагов проверяется в backend/cycle.ts.
export async function POST(req: Request) {
  const g = await guardSelected(req);
  if (!g.ok) return g.res;
  const { profileId, professionId, body } = g;
  let r: { ok: true } | { ok: false; error: string };
  switch (body.action) {
    case "start": r = await startCycle(profileId, professionId, body.skill); break;
    case "future": r = await markFuture(profileId, professionId); break;
    case "diag": r = await submitPhase(profileId, professionId, "diag", body.answers); break;
    case "practice": r = await submitPractice(profileId, professionId, body.taskId, body.answer); break;
    case "ai-help": r = await requestCycleAi(profileId, professionId); break;
    case "ai": r = await submitPhase(profileId, professionId, "ai", body.answers, body.reflection); break;
    case "ai-skip": r = await skipCycleAi(profileId, professionId); break;
    case "retest": r = await submitPhase(profileId, professionId, "retest", body.answers); break;
    default: r = { ok: false, error: "Неизвестное действие" };
  }
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
