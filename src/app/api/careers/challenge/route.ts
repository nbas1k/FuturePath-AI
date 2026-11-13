import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/backend/db";
import { getOrCreateProfile } from "@/backend/profile";
import { checkRateLimit } from "@/backend/rateLimit";
import { checkChallenge } from "@/catalog/build";

export const dynamic = "force-dynamic";

const Body = z.object({ careerId: z.string().min(1).max(80), choice: z.number().int() }).strict();

// Проверка вводного задания профессии. Верный ответ известен только серверу.
export async function POST(req: Request) {
  let json: unknown;
  try { json = await req.json(); } catch { return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 }); }
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  const { careerId, choice } = parsed.data;

  const check = checkChallenge(careerId, choice);
  if (!check.ok) return NextResponse.json({ error: "Неизвестное задание или вариант" }, { status: 400 });

  const profile = await getOrCreateProfile();
  if (!checkRateLimit(`intro:${profile.id}`, 200).ok) return NextResponse.json({ error: "Слишком много запросов" }, { status: 429 });

  const prev = await prisma.introAttempt.findUnique({ where: { profileId_careerId: { profileId: profile.id, careerId } } });
  await prisma.introAttempt.upsert({
    where: { profileId_careerId: { profileId: profile.id, careerId } },
    create: { profileId: profile.id, careerId, choice, correct: check.correct, solvedAt: check.correct ? new Date() : null },
    update: { choice, correct: check.correct, attempts: { increment: 1 }, ...(check.correct && !prev?.solvedAt ? { solvedAt: new Date() } : {}) },
  });
  return NextResponse.json({ ok: true, correct: check.correct, correctIndex: check.correctIndex, why: check.why });
}
