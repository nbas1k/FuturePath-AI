import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { cookies } from "next/headers";
import { prisma } from "@/backend/db";
import { PROFILE_COOKIE } from "@/backend/cookies";
import { clientKey } from "@/backend/profile";
import { checkRateLimit } from "@/backend/rateLimit";
import { currentUser, endSession, startSession } from "@/backend/session";
import { Credentials, hashPassword, normalizeEmail, verifyPassword } from "@/auth/password";

export const dynamic = "force-dynamic";

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("register"), email: z.string().max(254), password: z.string().max(128) }).strict(),
  z.object({ action: z.literal("login"), email: z.string().max(254), password: z.string().max(128) }).strict(),
  z.object({ action: z.literal("logout") }).strict(),
]);

const DUMMY_HASH = hashPassword("dummy-password-for-timing"); // одинаковое время ответа для несуществующего email

export async function GET() {
  const u = await currentUser();
  return NextResponse.json(u ? { loggedIn: true, email: u.email } : { loggedIn: false });
}

export async function POST(req: Request) {
  let json: unknown;
  try { json = await req.json(); } catch { return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 }); }
  const p = Body.safeParse(json);
  if (!p.success) return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  const d = p.data;

  if (d.action === "logout") { await endSession(); return NextResponse.json({ ok: true }); }

  // Защита от перебора паролей: 10 попыток за 15 минут на пару «адрес клиента + email»
  const rl = checkRateLimit(await clientKey(`auth:${normalizeEmail(d.email)}`), 10, Date.now(), 15 * 60 * 1000);
  if (!rl.ok) return NextResponse.json({ error: `Слишком много попыток. Повторите через ${Math.ceil(rl.retryAfterSec / 60)} мин.` }, { status: 429 });

  const cred = Credentials.safeParse({ email: d.email, password: d.password });
  if (!cred.success) return NextResponse.json({ error: cred.error.issues[0]?.path[0] === "email" ? "Введите корректный email" : "Пароль не короче 8 символов" }, { status: 400 });
  const { email, password } = cred.data;

  if (d.action === "register") {
    const anonId = (await cookies()).get(PROFILE_COOKIE)?.value;
    const passwordHash = hashPassword(password);
    let userId: string;
    try {
      userId = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({ data: { email, passwordHash } });
        // Only claim a still-anonymous profile, even if two requests arrive together.
        const claimed = anonId
          ? await tx.profile.updateMany({ where: { id: anonId, userId: null }, data: { userId: user.id } })
          : { count: 0 };
        if (!claimed.count) await tx.profile.create({ data: { userId: user.id } });
        return user.id;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return NextResponse.json({ error: "Этот email уже зарегистрирован. Войдите." }, { status: 409 });
      }
      throw error;
    }
    await startSession(userId);
    return NextResponse.json({ ok: true, email });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  const ok = verifyPassword(password, user?.passwordHash ?? DUMMY_HASH) && !!user;
  if (!user || !ok) return NextResponse.json({ error: "Неверный email или пароль" }, { status: 401 });
  await startSession(user.id);
  return NextResponse.json({ ok: true, email });
}
