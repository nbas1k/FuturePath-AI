import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateProfile } from "@/backend/profile";
import { completeAttempt } from "@/backend/learn";
import { getLang } from "@/i18n/server";

export const dynamic = "force-dynamic";
const Body = z.object({ attemptId: z.string().min(1).max(60) }).strict();

export async function POST(req: Request) {
  let json: unknown;
  try { json = await req.json(); } catch { return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 }); }
  const p = Body.safeParse(json);
  if (!p.success) return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  const profile = await getOrCreateProfile();
  const r = await completeAttempt(profile.id, p.data.attemptId, await getLang());
  return r.ok ? NextResponse.json(r) : NextResponse.json({ error: r.error }, { status: r.status });
}
