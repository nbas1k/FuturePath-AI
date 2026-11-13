// Общая проверка для API обучения: профиль есть, профессия выбрана этим профилем.
import { NextResponse } from "next/server";
import { getProfile } from "./profile";

export type Guard = { ok: true; profileId: string; professionId: string; body: Record<string, unknown> } | { ok: false; res: NextResponse };

export async function guardSelected(req: Request): Promise<Guard> {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const profile = await getProfile();
  if (!profile) return { ok: false, res: NextResponse.json({ error: "Сначала пройдите тест" }, { status: 404 }) };
  if (!profile.selectedProfession || profile.selectedProfession !== body?.professionId) {
    return { ok: false, res: NextResponse.json({ error: "Сначала выберите эту профессию" }, { status: 400 }) };
  }
  return { ok: true, profileId: profile.id, professionId: profile.selectedProfession, body: body ?? {} };
}
