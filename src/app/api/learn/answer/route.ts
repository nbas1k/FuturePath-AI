import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateProfile } from "@/backend/profile";
import { submitAnswer } from "@/backend/learn";
import { checkRateLimit } from "@/backend/rateLimit";
import { getLang } from "@/i18n/server";

export const dynamic = "force-dynamic";
const Body = z.object({ attemptId: z.string().min(1).max(60), exerciseId: z.string().min(1).max(160), answer: z.unknown() }).strict();

export async function POST(req: Request) {
  let json: unknown;
  try { json = await req.json(); } catch { return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 }); }
  const p = Body.safeParse(json);
  if (!p.success || p.data.answer === undefined) return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  const profile = await getOrCreateProfile();
  if (!checkRateLimit(`learn:${profile.id}`, 600).ok) return NextResponse.json({ error: "Слишком много запросов" }, { status: 429 });
  const r = await submitAnswer(profile.id, p.data.attemptId, p.data.exerciseId, p.data.answer, await getLang());
  return r.ok ? NextResponse.json(r) : NextResponse.json({ error: r.error }, { status: r.status });
}
