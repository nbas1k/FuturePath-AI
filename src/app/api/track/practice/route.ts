import { NextResponse } from "next/server";
import { getProfile } from "@/backend/profile";
import { submitRound } from "@/backend/track";

// Проверка ответов на задания. Правильные ответы сервер не отдаёт до проверки; результат приходит с пояснениями.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const profile = await getProfile();
  if (!profile) return NextResponse.json({ error: "Сначала пройдите тест" }, { status: 404 });
  if (!profile.selectedProfession || profile.selectedProfession !== body?.professionId) {
    return NextResponse.json({ error: "Сначала выберите эту профессию" }, { status: 400 });
  }
  if (!body?.answers || typeof body.answers !== "object") {
    return NextResponse.json({ error: "Нужны ответы на задания" }, { status: 400 });
  }
  const res = await submitRound(profile.id, profile.selectedProfession, body.answers as Record<string, unknown>);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
  return NextResponse.json({ ok: true, round: res.round, score: res.graded.score, total: res.graded.total });
}
