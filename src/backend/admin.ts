import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "fp_admin";
export const STATUSES = ["draft", "review", "published"] as const;
export type Status = (typeof STATUSES)[number];

const secret = () => (process.env.ADMIN_SECRET ?? "").trim();
export const adminEnabled = () => secret().length >= 12;
const token = () => createHmac("sha256", secret()).update("fp-admin-session").digest("hex");

export function checkSecret(input: string): boolean {
  if (!adminEnabled()) return false;
  const a = Buffer.from(input), b = Buffer.from(secret());
  return a.length === b.length && timingSafeEqual(a, b);
}
export async function setAdminCookie() {
  (await cookies()).set(ADMIN_COOKIE, token(), { httpOnly: true, sameSite: "strict", path: "/", secure: process.env.NODE_ENV === "production" && process.env.COOKIE_SECURE !== "false", maxAge: 60 * 60 * 8 });
}
export async function isAdmin(): Promise<boolean> {
  if (!adminEnabled()) return false;
  const v = (await cookies()).get(ADMIN_COOKIE)?.value ?? "";
  const a = Buffer.from(v), b = Buffer.from(token());
  return a.length === b.length && timingSafeEqual(a, b);
}

// Публикация только через проверку: из «черновика» сразу в «опубликовано» нельзя. ИИ статусы не меняет.
export function canTransition(from: string, to: string): boolean {
  if (!(STATUSES as readonly string[]).includes(to)) return false;
  if (to === "published" && from === "draft") return false;
  return true;
}
