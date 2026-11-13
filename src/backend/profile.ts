import { cookies, headers } from "next/headers";
import { prisma } from "./db";
import { PROFILE_COOKIE, profileCookieOptions } from "./cookies";

// Текущий профиль из cookie или null. Ничего не создаёт — можно вызывать при обычном чтении.
export async function getProfile() {
  const id = (await cookies()).get(PROFILE_COOKIE)?.value;
  if (!id) return null;
  return prisma.profile.findUnique({ where: { id } });
}

// Создаёт профиль и cookie. Вызывать ТОЛЬКО когда профиль действительно нужен (сохранение результата).
export async function createProfile() {
  const profile = await prisma.profile.create({ data: {} });
  (await cookies()).set(PROFILE_COOKIE, profile.id, profileCookieOptions());
  return profile;
}

export async function getOrCreateProfile() {
  return (await getProfile()) ?? createProfile();
}

// Удаляет cookie (срок действия в прошлом)
export async function clearProfileCookie() {
  (await cookies()).set(PROFILE_COOKIE, "", profileCookieOptions(process.env, 0));
}

// Ключ для rate limit: IP из заголовка прокси (если есть), иначе общий ключ.
// Внимание: заголовок x-forwarded-for можно подделать, если сайт открыт напрямую без прокси.
export async function clientKey(scope: string): Promise<string> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
  return `${scope}:${ip}`;
}
