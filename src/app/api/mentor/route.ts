import { NextResponse } from "next/server";
import { guardSelected } from "@/backend/learnGuard";
import { sendMentorMessage } from "@/backend/mentor";

// AI Mentor: сообщение пользователя → ответ настоящего ИИ (или правило защиты заданий).
export async function POST(req: Request) {
  const g = await guardSelected(req);
  if (!g.ok) return g.res;
  const r = await sendMentorMessage(g.profileId, g.professionId, g.body.message);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
  return NextResponse.json({ ok: true, kind: r.kind });
}
