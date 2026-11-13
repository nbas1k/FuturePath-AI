import { prisma } from "./db";
import { calculate, validateAnswers, type Answers, type Result } from "@/recommendation-engine";
import { questionsFor } from "@/data/questions";

// Состояние последнего результата профиля:
//  none     — тест ещё не проходили
//  outdated — ответы не подходят своей версии теста (повреждены или версия неизвестна)
//  ok       — результат действителен; version — по какой версии теста его проходили
// Старые результаты (версия 1) остаются действительными: они считаются по 18 вопросам версии 1.
export type LatestState =
  | { status: "none" }
  | { status: "outdated"; createdAt: Date; version: number }
  | { status: "ok"; createdAt: Date; version: number; answers: Answers; result: Result };

// Баллы в базе не хранятся: они пересчитываются из сохранённых ответов и версии теста.
export async function getLatestState(profileId: string): Promise<LatestState> {
  const row = await prisma.testResult.findFirst({ where: { profileId }, orderBy: { createdAt: "desc" } });
  if (!row) return { status: "none" };

  let answers: Answers | null = null;
  try {
    answers = JSON.parse(row.answers);
  } catch {
    answers = null;
  }
  const questions = questionsFor(row.version);
  if (!answers || typeof answers !== "object" || !questions || validateAnswers(answers, questions)) {
    return { status: "outdated", createdAt: row.createdAt, version: row.version };
  }
  return { status: "ok", createdAt: row.createdAt, version: row.version, answers, result: calculate(answers, row.version) };
}
