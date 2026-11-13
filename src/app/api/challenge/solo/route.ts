import { NextResponse } from "next/server";
import { guardSelected } from "@/backend/learnGuard";
import { submitSolo } from "@/backend/challenge";

// Human + AI Challenge, часть 1: пользователь решает сам.
export async function POST(req: Request) {
  const g = await guardSelected(req);
  if (!g.ok) return g.res;
  if (!g.body.answers || typeof g.body.answers !== "object") return NextResponse.json({ error: "Нужны ответы" }, { status: 400 });
  const r = await submitSolo(g.profileId, g.professionId, g.body.answers as Record<string, unknown>);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
  return NextResponse.json({ ok: true, score: r.graded.score, total: r.graded.total });
}
