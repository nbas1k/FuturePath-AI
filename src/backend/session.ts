import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "./db";

export const SESSION_COOKIE = "fp_session";
const DAYS = 30;
const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

// Создаёт сессию и выставляет httpOnly cookie. Вызывать только из route handler.
export async function startSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  await prisma.authSession.create({ data: { id: hashToken(token), userId, expiresAt: new Date(Date.now() + DAYS * 86400000) } });
  (await cookies()).set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production" && process.env.COOKIE_SECURE !== "false", maxAge: DAYS * 86400 });
}

export async function endSession() {
  const c = await cookies();
  const token = c.get(SESSION_COOKIE)?.value;
  if (token) await prisma.authSession.deleteMany({ where: { id: hashToken(token) } });
  c.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
}

// Пользователь по cookie сессии (null, если нет, истекла или подделана).
export async function currentUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || token.length > 200) return null;
  const s = await prisma.authSession.findUnique({ where: { id: hashToken(token) }, include: { user: { include: { profile: true } } } });
  if (!s || s.expiresAt.getTime() < Date.now()) return null;
  return s.user;
}
