import { NextResponse } from "next/server";
import { prisma } from "@/backend/db";
import { clientKey, clearProfileCookie, getProfile } from "@/backend/profile";
import { checkRateLimit } from "@/backend/rateLimit";

// Переименовать профиль (не создаёт новый профиль: нужен уже существующий)
export async function PATCH(req: Request) {
  const limit = checkRateLimit(await clientKey("profile"), 20, Date.now(), 60 * 60 * 1000);
  if (!limit.ok) return NextResponse.json({ error: "Слишком много попыток. Попробуйте позже." }, { status: 429 });

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 40) : "";
  if (!name) return NextResponse.json({ error: "Введите имя" }, { status: 400 });
  const p = await getProfile();
  if (!p) return NextResponse.json({ error: "Сначала пройдите тест" }, { status: 404 });
  await prisma.profile.update({ where: { id: p.id }, data: { name } });
  return NextResponse.json({ ok: true });
}

// Удалить профиль со всеми данными
export async function DELETE() {
  const p = await getProfile();
  if (p) await prisma.profile.delete({ where: { id: p.id } });
  await clearProfileCookie();
  return NextResponse.json({ ok: true });
}
