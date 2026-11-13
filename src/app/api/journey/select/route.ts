import { NextResponse } from "next/server";
import { prisma } from "@/backend/db";
import { clientKey, getOrCreateProfile } from "@/backend/profile";
import { checkRateLimit } from "@/backend/rateLimit";
import { professionById } from "@/data/professions";

// Выбор цели (профессии). Тест не нужен: профиль создаётся при первом выборе. Принимаем только id из каталога.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const prof = typeof body?.professionId === "string" ? professionById(body.professionId) : undefined;
  if (!prof) return NextResponse.json({ error: "Выберите профессию из списка" }, { status: 400 });

  // Защита от массового создания профилей: 60 выборов в час с одного адреса
  const limit = checkRateLimit(await clientKey("select"), 60, Date.now(), 60 * 60 * 1000);
  if (!limit.ok) return NextResponse.json({ error: "Слишком много попыток. Попробуйте позже." }, { status: 429 });
  const profile = await getOrCreateProfile();

  await prisma.profile.update({ where: { id: profile.id }, data: { selectedProfession: prof.id } });
  return NextResponse.json({ ok: true, professionId: prof.id });
}
