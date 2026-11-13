import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateProfile } from "@/backend/profile";
import { startAttempt } from "@/backend/learn";
import { checkRateLimit } from "@/backend/rateLimit";

export const dynamic = "force-dynamic";
const Body = z.object({ lessonId: z.string().min(1).max(120) }).strict();

export async function POST(req: Request) {
  let json: unknown;
  try { json = await req.json(); } catch { return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 }); }
  const p = Body.safeParse(json);
  if (!p.success) return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  const profile = await getOrCreateProfile();
  if (!checkRateLimit(`learn:${profile.id}`, 600).ok) return NextResponse.json({ error: "Слишком много запросов" }, { status: 429 });
  const r = await startAttempt(profile.id, p.data.lessonId);
  return r.ok ? NextResponse.json(r) : NextResponse.json({ error: r.error }, { status: r.status });
}
