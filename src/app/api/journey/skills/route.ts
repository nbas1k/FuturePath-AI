import { NextResponse } from "next/server";
import { prisma } from "@/backend/db";
import { getProfile } from "@/backend/profile";
import { professionById } from "@/data/professions";

// Сохраняет самооценку навыков (шаг 3). Оценки: 0 — пока не умею, 1 — немного, 2 — уверенно.
// Это самооценка пользователя, а не проверенный уровень навыка.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const prof = typeof body?.professionId === "string" ? professionById(body.professionId) : undefined;
  const ratings = body?.ratings;
  if (!prof || !ratings || typeof ratings !== "object") {
    return NextResponse.json({ error: "Нужна профессия и оценки навыков" }, { status: 400 });
  }

  const profile = await getProfile();
  if (!profile) return NextResponse.json({ error: "Сначала пройдите тест" }, { status: 404 });
  if (profile.selectedProfession !== prof.id) {
    return NextResponse.json({ error: "Сначала выберите эту профессию" }, { status: 400 });
  }

  // Принимаем только навыки этой профессии и только целые оценки 0–2
  const entries = Object.entries(ratings as Record<string, unknown>);
  for (const [skill, value] of entries) {
    if (!prof.skills.includes(skill)) return NextResponse.json({ error: "Такого навыка нет в профессии" }, { status: 400 });
    if (!Number.isInteger(value) || (value as number) < 0 || (value as number) > 2) {
      return NextResponse.json({ error: "Оценка должна быть 0, 1 или 2" }, { status: 400 });
    }
  }

  await prisma.$transaction(
    entries.map(([skill, value]) =>
      prisma.skillCheck.upsert({
        where: { profileId_professionId_skill: { profileId: profile.id, professionId: prof.id, skill } },
        update: { rating: value as number },
        create: { profileId: profile.id, professionId: prof.id, skill, rating: value as number },
      }),
    ),
  );
  return NextResponse.json({ ok: true, saved: entries.length });
}
