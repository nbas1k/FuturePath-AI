import { NextResponse } from "next/server";
import { prisma } from "@/backend/db";
import { getProfile } from "@/backend/profile";
import { validatePortfolio } from "@/portfolio/logic";

const MAX_ITEMS = 30;

export async function POST(req: Request) {
  const profile = await getProfile();
  if (!profile) return NextResponse.json({ error: "Сначала пройдите тест" }, { status: 404 });
  const v = validatePortfolio(await req.json().catch(() => null));
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
  if ((await prisma.portfolioItem.count({ where: { profileId: profile.id } })) >= MAX_ITEMS) return NextResponse.json({ error: `В портфолио не больше ${MAX_ITEMS} проектов` }, { status: 400 });
  await prisma.portfolioItem.create({ data: { profileId: profile.id, title: v.value.title, description: v.value.description, skills: JSON.stringify(v.value.skills), link: v.value.link } });
  return NextResponse.json({ ok: true });
}

// Удаляется только проект этого профиля
export async function DELETE(req: Request) {
  const profile = await getProfile();
  if (!profile) return NextResponse.json({ error: "Профиль не найден" }, { status: 404 });
  const body = (await req.json().catch(() => null)) as { id?: unknown } | null;
  if (typeof body?.id !== "string") return NextResponse.json({ error: "Не указан проект" }, { status: 400 });
  const r = await prisma.portfolioItem.deleteMany({ where: { id: body.id, profileId: profile.id } });
  if (r.count === 0) return NextResponse.json({ error: "Проект не найден" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
