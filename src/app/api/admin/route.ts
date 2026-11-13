import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/backend/db";
import { ensureContent } from "@/backend/learnContent";
import { ADMIN_COOKIE, canTransition, checkSecret, isAdmin, setAdminCookie, STATUSES } from "@/backend/admin";
import { cookies } from "next/headers";
import { CAREER_BY_ID } from "@/catalog/build";

export const dynamic = "force-dynamic";
const deny = () => NextResponse.json({ error: "Нет доступа" }, { status: 403 });

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("login"), secret: z.string().min(1).max(200) }).strict(),
  z.object({ action: z.literal("logout") }).strict(),
  z.object({ action: z.literal("set_module"), id: z.string().max(160), status: z.enum(STATUSES).optional(), expertReviewed: z.boolean().optional() }).strict(),
  z.object({ action: z.literal("set_lesson"), id: z.string().max(200), status: z.enum(STATUSES) }).strict(),
  z.object({ action: z.literal("set_exercise"), id: z.string().max(240), prompt: z.string().max(1000).optional(), explanation: z.string().max(2000).optional(), answerKey: z.string().max(4000).optional() }).strict(),
  z.object({ action: z.literal("set_career"), careerId: z.string().max(80), status: z.enum(STATUSES), titleKk: z.string().max(120).optional(), titleEn: z.string().max(120).optional() }).strict(),
]);

export async function GET(req: Request) {
  if (!(await isAdmin())) return deny();
  await ensureContent();
  const lessonId = new URL(req.url).searchParams.get("lessonId");
  if (lessonId) return NextResponse.json({ exercises: await prisma.exercise.findMany({ where: { lessonId }, orderBy: { order: "asc" }, select: { id: true, type: true, prompt: true, explanation: true, answerKey: true } }) });
  const modules = await prisma.learnModule.findMany({ orderBy: [{ trackId: "asc" }, { order: "asc" }], include: { lessons: { orderBy: { order: "asc" }, select: { id: true, title: true, status: true, _count: { select: { exercises: true } } } } } });
  const overrides = await prisma.careerOverride.findMany();
  return NextResponse.json({ modules, overrides });
}

export async function POST(req: Request) {
  let json: unknown;
  try { json = await req.json(); } catch { return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 }); }
  const p = Body.safeParse(json);
  if (!p.success) return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  const d = p.data;
  if (d.action === "login") {
    if (!checkSecret(d.secret)) return NextResponse.json({ error: "Неверный секрет или админка отключена" }, { status: 401 });
    await setAdminCookie();
    return NextResponse.json({ ok: true });
  }
  if (d.action === "logout") { (await cookies()).set(ADMIN_COOKIE, "", { path: "/", maxAge: 0 }); return NextResponse.json({ ok: true }); }
  if (!(await isAdmin())) return deny();

  if (d.action === "set_module") {
    const m = await prisma.learnModule.findUnique({ where: { id: d.id } });
    if (!m) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
    if (d.status && !canTransition(m.status, d.status)) return NextResponse.json({ error: "Публикация только после проверки: сначала переведите в «на проверке»." }, { status: 409 });
    await prisma.learnModule.update({ where: { id: d.id }, data: { ...(d.status ? { status: d.status } : {}), ...(d.expertReviewed !== undefined ? { expertReviewed: d.expertReviewed } : {}), source: "admin" } });
  } else if (d.action === "set_lesson") {
    const l = await prisma.lesson.findUnique({ where: { id: d.id } });
    if (!l) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
    if (!canTransition(l.status, d.status)) return NextResponse.json({ error: "Публикация только после проверки: сначала переведите в «на проверке»." }, { status: 409 });
    await prisma.lesson.update({ where: { id: d.id }, data: { status: d.status, source: "admin" } });
  } else if (d.action === "set_exercise") {
    const e = await prisma.exercise.findUnique({ where: { id: d.id } });
    if (!e) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
    let key: object | undefined;
    if (d.answerKey !== undefined) { try { key = JSON.parse(d.answerKey); } catch { return NextResponse.json({ error: "Ключ ответа: некорректный JSON" }, { status: 400 }); } if (!key || typeof key !== "object") return NextResponse.json({ error: "Ключ ответа должен быть объектом" }, { status: 400 }); }
    await prisma.exercise.update({ where: { id: d.id }, data: { ...(d.prompt !== undefined ? { prompt: { ...(e.prompt as object), ru: d.prompt } } : {}), ...(d.explanation !== undefined ? { explanation: { ...(e.explanation as object), ru: d.explanation } } : {}), ...(key ? { answerKey: key } : {}), source: "admin" } });
  } else {
    if (!CAREER_BY_ID.has(d.careerId)) return NextResponse.json({ error: "Профессия не найдена" }, { status: 404 });
    const prev = await prisma.careerOverride.findUnique({ where: { careerId: d.careerId } });
    if (!canTransition(prev?.status ?? "published", d.status)) return NextResponse.json({ error: "Публикация только после проверки." }, { status: 409 });
    await prisma.careerOverride.upsert({ where: { careerId: d.careerId }, create: { careerId: d.careerId, status: d.status, titleKk: d.titleKk, titleEn: d.titleEn }, update: { status: d.status, titleKk: d.titleKk, titleEn: d.titleEn } });
  }
  return NextResponse.json({ ok: true });
}
