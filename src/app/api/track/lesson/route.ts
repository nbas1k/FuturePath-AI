import { NextResponse } from "next/server";
import { getProfile } from "@/backend/profile";
import { markLesson } from "@/backend/track";

// Отметить урок прочитанным. Профессия должна быть выбранной у этого профиля.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const profile = await getProfile();
  if (!profile) return NextResponse.json({ error: "Сначала пройдите тест" }, { status: 404 });
  if (!profile.selectedProfession || profile.selectedProfession !== body?.professionId) {
    return NextResponse.json({ error: "Сначала выберите эту профессию" }, { status: 400 });
  }
  const res = await markLesson(profile.id, profile.selectedProfession, String(body?.lessonId ?? ""));
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
