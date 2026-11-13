import { NextResponse } from "next/server";
import { getOrCreateProfile, getProfile } from "@/backend/profile";
import { completeAssessment, getLatestAssessment, startAssessment } from "@/backend/assessment";
import { sanitizeAnswers } from "@/assessment/score";
import { checkRateLimit } from "@/backend/rateLimit";

export const dynamic = "force-dynamic";

// Состояние последней диагностики: ответы (для продолжения) и статус. Ничего не создаёт.
export async function GET() {
  const profile = await getProfile();
  const a = profile ? await getLatestAssessment(profile.id) : null;
  if (!a) return NextResponse.json({ exists: false, status: "none", answers: {} });
  return NextResponse.json({ exists: true, status: a.status, answers: sanitizeAnswers(a.answers) });
}

// action: "restart" — начать заново (старая диагностика сохраняется), "complete" — посчитать результат на сервере.
export async function POST(req: Request) {
  let body: { action?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 }); }
  const profile = await getOrCreateProfile();
  if (!checkRateLimit(`assess:${profile.id}`, 600).ok) return NextResponse.json({ error: "Слишком много запросов" }, { status: 429 });

  if (body.action === "restart") {
    const a = await startAssessment(profile.id);
    return NextResponse.json({ ok: true, id: a.id });
  }
  if (body.action === "complete") {
    const r = await completeAssessment(profile);
    return r.ok ? NextResponse.json({ ok: true, answered: r.answered }) : NextResponse.json({ error: r.error }, { status: r.status });
  }
  return NextResponse.json({ error: "Неизвестное действие" }, { status: 400 });
}
