import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateProfile } from "@/backend/profile";
import { saveAnswer } from "@/backend/assessment";
import { checkRateLimit } from "@/backend/rateLimit";

export const dynamic = "force-dynamic";

const Body = z.object({ id: z.string().min(1).max(40), value: z.number().int() }).strict();

export async function POST(req: Request) {
  let json: unknown;
  try { json = await req.json(); } catch { return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 }); }
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  const profile = await getOrCreateProfile();
  if (!checkRateLimit(`assess:${profile.id}`, 600).ok) return NextResponse.json({ error: "Слишком много запросов" }, { status: 429 });
  const r = await saveAnswer(profile.id, parsed.data.id, parsed.data.value);
  return r.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: r.error }, { status: r.status });
}
