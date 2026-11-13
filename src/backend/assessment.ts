import { prisma } from "./db";
import { ASSESSMENT_VERSION, ITEM_BY_ID, isValidAnswer } from "@/assessment/items";
import { sanitizeAnswers, scoreAssessment, type Answers } from "@/assessment/score";
import { parseInterests } from "@/onboarding/schema";

// Последняя диагностика профиля (или null). Только чтение.
export async function getLatestAssessment(profileId: string) {
  return prisma.assessment.findFirst({ where: { profileId }, orderBy: { createdAt: "desc" } });
}

export async function startAssessment(profileId: string) {
  return prisma.assessment.create({ data: { profileId, version: ASSESSMENT_VERSION } });
}

export async function currentOrNew(profileId: string) {
  const latest = await getLatestAssessment(profileId);
  return latest ?? startAssessment(profileId);
}

export type SaveResult = { ok: true } | { ok: false; status: number; error: string };

// Один ответ. Запись атомарная (jsonb ||), чтобы быстрые подряд ответы не затирали друг друга.
// Завершённую диагностику можно дополнять только вопросами пакета «уточнить»; основные ответы — только после перезапуска.
export async function saveAnswer(profileId: string, itemId: string, value: number): Promise<SaveResult> {
  const item = ITEM_BY_ID.get(itemId);
  if (!item || !isValidAnswer(item, value)) return { ok: false, status: 400, error: "Некорректный ответ" };
  const a = await currentOrNew(profileId);
  if (a.status === "completed" && item.pack === "core") return { ok: false, status: 409, error: "Диагностика уже завершена. Начните заново, чтобы изменить ответы." };
  const patch = JSON.stringify({ [itemId]: value });
  const n = await prisma.$executeRaw`UPDATE "Assessment" SET "answers" = "answers" || ${patch}::jsonb, "updatedAt" = now() WHERE "id" = ${a.id} AND "profileId" = ${profileId}`;
  return n === 1 ? { ok: true } : { ok: false, status: 404, error: "Не найдено" };
}

export type CompleteResult = { ok: true; answered: number } | { ok: false; status: number; error: string };

// Считает результат на сервере и сохраняет его. Мало ответов — честный отказ, а не выдуманный результат.
export async function completeAssessment(profile: { id: string; interests: string }): Promise<CompleteResult> {
  const a = await getLatestAssessment(profile.id);
  if (!a) return { ok: false, status: 404, error: "Диагностика не начата" };
  const answers: Answers = sanitizeAnswers(a.answers);
  const r = scoreAssessment(answers, { areas: parseInterests(profile.interests), version: a.version });
  if (r.confidence === "insufficient") return { ok: false, status: 422, error: "Слишком мало ответов. Ответьте хотя бы на 12 вопросов об интересах." };
  await prisma.assessment.update({
    where: { id: a.id },
    data: {
      status: "completed",
      completedAt: new Date(),
      result: { version: r.version, confidence: r.confidence, answered: r.answered, total: r.total, code: r.profile.code, top: r.top.map((m) => ({ id: m.professionId, percent: m.percent })) },
    },
  });
  return { ok: true, answered: r.answered };
}
