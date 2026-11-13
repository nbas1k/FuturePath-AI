import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/backend/db";
import { getOrCreateProfile, getProfile } from "@/backend/profile";
import { LANG_COOKIE } from "@/i18n";
import { OnboardingInput, parseInterests } from "@/onboarding/schema";

export const dynamic = "force-dynamic";

// Текущее состояние онбординга. Ничего не создаёт.
export async function GET() {
  const p = await getProfile();
  if (!p) return NextResponse.json({ exists: false, done: false });
  return NextResponse.json({
    exists: true,
    done: p.onboardedAt !== null,
    lang: p.lang,
    ageGroup: p.ageGroup,
    education: p.education,
    goal: p.goal,
    interests: parseInterests(p.interests),
  });
}

// Сохраняет один шаг или весь онбординг. Проверка на сервере: клиенту не доверяем.
export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 }); }
  const parsed = OnboardingInput.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  const d = parsed.data;

  const profile = await getOrCreateProfile();
  const updated = await prisma.profile.update({
    where: { id: profile.id },
    data: {
      ...(d.lang ? { lang: d.lang } : {}),
      ...(d.ageGroup ? { ageGroup: d.ageGroup } : {}),
      ...(d.education ? { education: d.education } : {}),
      ...(d.goal ? { goal: d.goal } : {}),
      ...(d.interests ? { interests: Array.from(new Set(d.interests)).join(",") } : {}),
      ...(d.complete && !profile.onboardedAt ? { onboardedAt: new Date() } : {}),
    },
  });
  if (d.lang) {
    (await cookies()).set(LANG_COOKIE, d.lang, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
  }
  return NextResponse.json({ ok: true, done: updated.onboardedAt !== null });
}
