// Пробное собеседование: состояние, ответы по порядку, оценка настоящим ИИ. Порядок проверяется на сервере.
import { prisma } from "./db";
import { INTERVIEWS } from "@/data/interview";
import { professionById } from "@/data/professions";
import { validateAnswerText, summarizeInterview, type Evaluation, type Summary } from "@/interview/logic";
import { getAiConfig, isAiEnabled } from "./ai/config";
import { runAiFeature } from "./ai/run";
import { checkRateLimit } from "./rateLimit";
import { interviewPrompt, validateEvaluation } from "./ai/interviewAi";

export type InterviewState = {
  supported: boolean;
  phase: "none" | "answering" | "need-eval" | "done";
  questions: { id: string; skill: string; question: string }[]; // без подсказок для оценщика
  answers: string[];
  evaluation: Evaluation | null;
  summary: Summary | null;
  history: { id: string; date: string; label: string }[]; // прошлые завершённые попытки
};

const empty: InterviewState = { supported: false, phase: "none", questions: [], answers: [], evaluation: null, summary: null, history: [] };

function parse<T>(s: string | null, fallback: T): T {
  if (!s) return fallback;
  try { return JSON.parse(s) as T; } catch { return fallback; }
}

export async function loadInterview(profileId: string, professionId: string): Promise<InterviewState> {
  const qs = INTERVIEWS[professionId];
  if (!qs) return empty;
  const runs = await prisma.interviewRun.findMany({ where: { profileId, professionId }, orderBy: { createdAt: "desc" } });
  const history = runs
    .filter((r) => r.evaluation)
    .map((r) => {
      const ev = parse<Evaluation | null>(r.evaluation, null);
      return { id: r.id, date: r.createdAt.toISOString().slice(0, 10), label: ev ? summarizeInterview(ev.items).percentLabel : "—" };
    });
  const questions = qs.map((q) => ({ id: q.id, skill: q.skill, question: q.question }));
  const run = runs[0];
  if (!run) return { ...empty, supported: true, questions, history };
  const answers = parse<string[]>(run.answers, []);
  const evaluation = parse<Evaluation | null>(run.evaluation, null);
  const phase = evaluation ? "done" : answers.length >= qs.length ? "need-eval" : "answering";
  return { supported: true, phase, questions, answers, evaluation, summary: evaluation ? summarizeInterview(evaluation.items) : null, history };
}

// Начать новое собеседование. Незавершённое продолжается, а не дублируется.
export async function startInterview(profileId: string, professionId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!INTERVIEWS[professionId]) return { ok: false, error: "Для этой профессии собеседование пока не готово" };
  const s = await loadInterview(profileId, professionId);
  if (s.phase === "answering" || s.phase === "need-eval") return { ok: true };
  await prisma.interviewRun.create({ data: { profileId, professionId } });
  return { ok: true };
}

export async function submitInterviewAnswer(profileId: string, professionId: string, index: unknown, answer: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  const qs = INTERVIEWS[professionId];
  if (!qs) return { ok: false, error: "Для этой профессии собеседование пока не готово" };
  const t = validateAnswerText(answer);
  if (!t.ok) return t;
  const run = await prisma.interviewRun.findFirst({ where: { profileId, professionId }, orderBy: { createdAt: "desc" } });
  if (!run || run.evaluation) return { ok: false, error: "Сначала начните собеседование" };
  const answers = parse<string[]>(run.answers, []);
  if (answers.length >= qs.length) return { ok: false, error: "На все вопросы уже есть ответы. Получите разбор." };
  if (index !== answers.length) return { ok: false, error: "Вопросы идут по порядку: этот вопрос сейчас недоступен" };
  answers.push(t.text);
  await prisma.interviewRun.update({ where: { id: run.id }, data: { answers: JSON.stringify(answers) } });
  return { ok: true };
}

// Оценка всех ответов одним запросом к ИИ. Если ИИ недоступен — ответы сохранены, оценку можно запросить позже.
export async function evaluateInterview(profileId: string, professionId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const qs = INTERVIEWS[professionId];
  if (!qs) return { ok: false, error: "Для этой профессии собеседование пока не готово" };
  const run = await prisma.interviewRun.findFirst({ where: { profileId, professionId }, orderBy: { createdAt: "desc" } });
  if (!run) return { ok: false, error: "Сначала начните собеседование" };
  if (run.evaluation) return { ok: true };
  const answers = parse<string[]>(run.answers, []);
  if (answers.length < qs.length) return { ok: false, error: "Сначала ответьте на все вопросы" };

  const config = getAiConfig();
  if (!isAiEnabled(config)) return { ok: false, error: "ИИ сейчас не подключён, поэтому разбор получить нельзя. Ваши ответы сохранены, вернитесь позже. Оценка не подделывается." };
  const limit = checkRateLimit(`ai:${profileId}`, config.rateLimitPerHour);
  if (!limit.ok) return { ok: false, error: `Лимит запросов к ИИ исчерпан. Повторите через ${Math.ceil(limit.retryAfterSec / 60)} мин. Ваши ответы сохранены.` };

  const title = professionById(professionId)?.title ?? professionId;
  const out = await runAiFeature<Evaluation | null>({
    config,
    prompt: interviewPrompt(title, qs, answers),
    maxTokens: 2200,
    validate: (raw) => validateEvaluation(raw, qs),
    fallback: () => null,
  });
  if (out.mode !== "ai" || !out.data) return { ok: false, error: `Не удалось получить разбор: ${out.mode === "fallback" ? out.reason : "ошибка"} Ваши ответы сохранены, попробуйте ещё раз.` };
  await prisma.interviewRun.update({ where: { id: run.id }, data: { evaluation: JSON.stringify(out.data) } });
  return { ok: true };
}
