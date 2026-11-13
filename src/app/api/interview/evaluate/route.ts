import { NextResponse } from "next/server";
import { guardSelected } from "@/backend/learnGuard";
import { evaluateInterview } from "@/backend/interview";

// Разбор делает настоящий ИИ. Если он недоступен, ответы остаются сохранёнными.
export async function POST(req: Request) {
  const g = await guardSelected(req);
  if (!g.ok) return g.res;
  const r = await evaluateInterview(g.profileId, g.professionId);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
