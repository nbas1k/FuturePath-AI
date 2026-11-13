import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { z } from "zod";

// Пароли: scrypt с индивидуальной солью, сравнение за постоянное время. Сторонних зависимостей нет.
const KEYLEN = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, KEYLEN);
  return `s1$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [v, saltHex, hashHex] = stored.split("$");
  if (v !== "s1" || !saltHex || !hashHex) return false;
  try {
    const expected = Buffer.from(hashHex, "hex");
    const salt = Buffer.from(saltHex, "hex");
    if (expected.length !== KEYLEN || salt.length === 0) return false; // повреждённая запись
    const actual = scryptSync(password, salt, expected.length);
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export const normalizeEmail = (e: string) => e.trim().toLowerCase();

export const Credentials = z.object({
  email: z.string().trim().max(254).email().transform(normalizeEmail),
  password: z.string().min(8, "Пароль не короче 8 символов").max(128),
}).strict();
