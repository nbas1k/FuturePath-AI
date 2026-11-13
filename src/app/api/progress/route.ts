import { NextResponse } from "next/server";
import { prisma } from "@/backend/db";
import { clientKey, getProfile } from "@/backend/profile";
import { checkRateLimit } from "@/backend/rateLimit";
import { parseAiPlanKey, isRoadmapTaskId } from "@/backend/planKeys";
import { buildPlan, parsePlanKey } from "@/data/plan";

// Может ли этот профиль работать с планом (обычный план — всегда, AI-карта — только своя)
async function planBelongsTo(profileId: string, planKey: string): Promise<boolean> {
  const recordId = parseAiPlanKey(planKey);
  if (!recordId) return true;
  const rec = await prisma.aiRecord.findFirst({ where: { id: recordId, profileId, kind: "roadmap" }, select: { id: true } });
  return rec !== null;
}

// Проверяем, что план настоящий и задание есть в этом плане.
// Без этого можно было бы записать произвольные строки в базу.
async function checkTarget(profileId: string | null, planKey: unknown, taskId: unknown): Promise<string | null> {
  const recordId = parseAiPlanKey(planKey);
  if (recordId) {
    if (!profileId) return "Сначала пройдите тест";
    if (!isRoadmapTaskId(taskId)) return "Неверное задание";
    return (await planBelongsTo(profileId, planKey as string)) ? null : "Неверный план";
  }
  const dirs = parsePlanKey(planKey);
  if (!dirs) return "Неверный план";
  if (typeof taskId !== "string" || !buildPlan(dirs).some((p) => p.taskId === taskId)) return "Неверное задание";
  return null;
}

// Список выполненных заданий для плана текущего профиля
export async function GET(req: Request) {
  const planKey = new URL(req.url).searchParams.get("planKey");
  if (!parsePlanKey(planKey) && !parseAiPlanKey(planKey)) return NextResponse.json({ error: "Неверный план" }, { status: 400 });
  const profile = await getProfile(); // ничего не создаём при чтении
  if (!profile || !(await planBelongsTo(profile.id, planKey!))) return NextResponse.json({ done: [] });
  const rows = await prisma.taskProgress.findMany({ where: { profileId: profile.id, planKey: planKey!, done: true }, select: { taskId: true } });
  return NextResponse.json({ done: rows.map((r) => r.taskId) });
}

// Отметить задание выполненным / невыполненным
export async function POST(req: Request) {
  // Лимит щедрый (300 отметок за 10 минут), но не даёт заспамить базу
  const limit = checkRateLimit(await clientKey("progress"), 300, Date.now(), 10 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json({ error: "Слишком много запросов. Подождите немного." }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } });
  }

  const body = await req.json().catch(() => null);
  const planKey = body?.planKey;
  const taskId = body?.taskId;
  const done = body?.done;
  if (typeof done !== "boolean") return NextResponse.json({ error: "Нужен признак done: true/false" }, { status: 400 });

  // Профиль должен существовать (его создаёт сохранение результата). Здесь он не создаётся.
  const profile = await getProfile();
  if (!profile) return NextResponse.json({ error: "Сначала пройдите тест" }, { status: 404 });
  const problem = await checkTarget(profile.id, planKey, taskId);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  await prisma.taskProgress.upsert({
    where: { profileId_planKey_taskId: { profileId: profile.id, planKey: planKey as string, taskId: taskId as string } },
    update: { done },
    create: { profileId: profile.id, planKey: planKey as string, taskId: taskId as string, done },
  });
  return NextResponse.json({ ok: true, done });
}
