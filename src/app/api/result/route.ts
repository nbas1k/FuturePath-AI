import { NextResponse } from "next/server";
import { prisma } from "@/backend/db";
import { clientKey, getOrCreateProfile } from "@/backend/profile";
import { checkRateLimit } from "@/backend/rateLimit";
import { calculate, findProblem, type Answers } from "@/recommendation-engine";
import { CURRENT_TEST_VERSION, questionsFor } from "@/data/questions";

const HOUR = 60 * 60 * 1000;

// Сохраняет ответы текущей версии теста. Баллы считает СЕРВЕР: данные от браузера не доверенные.
export async function POST(req: Request) {
  // Защита от массового создания профилей и результатов: 30 сохранений в час с одного адреса
  const limit = checkRateLimit(await clientKey("result"), 30, Date.now(), HOUR);
  if (!limit.ok) {
    return NextResponse.json({ error: "Слишком много попыток. Попробуйте позже." }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } });
  }

  const body = await req.json().catch(() => null);
  const raw = body?.answers;
  if (!raw || typeof raw !== "object") return NextResponse.json({ error: "Нужны ответы" }, { status: 400 });

  // Сохраняем только ответы на вопросы текущей версии теста (лишние поля отбрасываем)
  const questions = questionsFor(CURRENT_TEST_VERSION) ?? [];
  const answers: Answers = Object.fromEntries(questions.map((q) => [q.id, (raw as Record<string, unknown>)[q.id]])) as Answers;
  const problem = findProblem(answers, questions);
  if (problem) return NextResponse.json({ error: problem.message, questionId: problem.questionId }, { status: 400 });

  const profile = await getOrCreateProfile();
  await prisma.testResult.create({
    data: { profileId: profile.id, answers: JSON.stringify(answers), version: CURRENT_TEST_VERSION },
  });
  return NextResponse.json({ ok: true, version: CURRENT_TEST_VERSION, top: calculate(answers, CURRENT_TEST_VERSION).top.map((d) => d.id) });
}
