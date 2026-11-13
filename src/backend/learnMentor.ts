import { prisma } from "./db";
import { ensureContent } from "./learnContent";
import { getAiConfig, isAiEnabled, type AiConfig } from "./ai/config";
import { askAi, AiError, type AiPrompt } from "./ai/provider";
import { checkRateLimit } from "./rateLimit";
import { adaptLevel, buildMentorPrompt, practiceRecommendations, MAX_MESSAGE_CHARS, type MentorContext, type MentorMode, type PracticeItem } from "@/learn/mentorPrompt";
import { getCareer } from "@/catalog/build";
import { pick } from "@/learn/engine";
import type { LText, Lang } from "@/learn/types";

const L = (v: unknown): LText => v as LText;
export const DAILY_CAP = 30; // запросов к наставнику на профиль в сутки (контроль расходов)
export const MAX_TOKENS = 400;

export type MentorResult =
  | { ok: true; reply: string }
  | { ok: false; status: number; error: string; code: "unavailable" | "rate" | "daily" | "failed" | "not_found" };

type Deps = { config: AiConfig; ask: (config: AiConfig, p: AiPrompt, maxTokens: number) => Promise<string>; now: () => number };
const defaultDeps = (): Deps => ({ config: getAiConfig(), ask: askAi, now: () => Date.now() });

async function buildContext(profileId: string, lessonId: string, exerciseId: string | undefined, lang: Lang, history: MentorContext["history"]): Promise<MentorContext | null> {
  await ensureContent();
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, include: { module: true, exercises: { orderBy: { order: "asc" } } } });
  if (!lesson) return null;
  const profile = await prisma.profile.findUnique({ where: { id: profileId }, select: { selectedProfession: true } });
  const careerTitle = profile?.selectedProfession ? getCareer(profile.selectedProfession)?.titles[lang] ?? null : null;

  const attempt = await prisma.lessonAttempt.findFirst({ where: { profileId, lessonId }, orderBy: { startedAt: "desc" }, include: { answers: true } });
  const answers = new Map((attempt?.answers ?? []).map((a) => [a.exerciseId, a]));
  const lessonScore = answers.size ? [...answers.values()].reduce((s, a) => s + a.score, 0) / answers.size : null;

  const comps = (lesson.competencies as unknown as string[]) ?? [];
  const progress = await prisma.competencyProgress.findMany({ where: { profileId, competencyId: { in: comps } } });
  const weakCompetencies = progress.filter((p) => p.score < 0.7).map((p) => p.competencyId);
  const avgComp = progress.length ? progress.reduce((s, p) => s + p.score, 0) / progress.length : null;

  let exercise: MentorContext["exercise"];
  const ex = exerciseId ? lesson.exercises.find((e) => e.id === exerciseId) : undefined;
  if (ex) {
    const done = answers.has(ex.id);
    const data = ex.data as { options?: LText[] };
    exercise = { prompt: pick(L(ex.prompt), lang), options: data.options?.map((o) => pick(o, lang)), answered: done, ...(done ? { explanation: pick(L(ex.explanation), lang) } : {}) };
  }
  const trackTitle = lesson.module.trackId.startsWith("career:") ? getCareer(lesson.module.trackId.slice(7))?.titles[lang] ?? lesson.module.trackId : lesson.module.trackId;
  return {
    lang, careerTitle, trackTitle, moduleTitle: pick(L(lesson.module.title), lang), lessonTitle: pick(L(lesson.title), lang),
    objectives: (lesson.objectives as unknown as LText[]).map((o) => pick(o, lang)), level: adaptLevel(lessonScore, avgComp), weakCompetencies, lessonScore, exercise, history,
  };
}

export async function askMentor(profileId: string, input: { lessonId: string; exerciseId?: string; mode: MentorMode; message: string; lang: Lang }, deps: Deps = defaultDeps()): Promise<MentorResult> {
  const message = input.message.slice(0, MAX_MESSAGE_CHARS);
  // ИИ не подключён: честно говорим об этом и ничего не подставляем
  if (!isAiEnabled(deps.config)) return { ok: false, status: 503, code: "unavailable", error: "ИИ-наставник недоступен: подключение к ИИ не настроено." };

  const rl = checkRateLimit(`mentor:${profileId}`, deps.config.rateLimitPerHour, deps.now());
  if (!rl.ok) return { ok: false, status: 429, code: "rate", error: `Слишком много запросов. Повторите через ${Math.ceil(rl.retryAfterSec / 60)} мин.` };

  const session = await prisma.aiSession.findFirst({ where: { profileId, kind: "mentor", contextId: input.lessonId } });
  const history = ((session?.messages as unknown as { role: "user" | "assistant"; text: string; at: number }[]) ?? []);
  const dayStart = deps.now() - 24 * 3600 * 1000;
  const sentToday = await prisma.aiSession.findMany({ where: { profileId, kind: "mentor", updatedAt: { gte: new Date(dayStart) } }, select: { messages: true } });
  const countToday = sentToday.reduce((n, s) => n + ((s.messages as unknown as { role: string; at: number }[]).filter((m) => m.role === "user" && m.at >= dayStart).length), 0);
  if (countToday >= DAILY_CAP) return { ok: false, status: 429, code: "daily", error: "Дневной лимит вопросов наставнику исчерпан. Продолжите завтра." };

  const ctx = await buildContext(profileId, input.lessonId, input.exerciseId, input.lang, history.map((h) => ({ role: h.role, text: h.text })));
  if (!ctx) return { ok: false, status: 404, code: "not_found", error: "Урок не найден" };
  const prompt = buildMentorPrompt(ctx, input.mode, message);

  let reply: string;
  try {
    reply = (await deps.ask(deps.config, prompt, MAX_TOKENS)).trim();
  } catch (e) {
    const msg = e instanceof AiError ? e.message : "Не удалось получить ответ ИИ";
    return { ok: false, status: 502, code: "failed", error: `${msg}. Повторите попытку позже.` };
  }
  if (!reply) return { ok: false, status: 502, code: "failed", error: "ИИ вернул пустой ответ. Повторите попытку." };

  const at = deps.now();
  const next = [...history, ...(message ? [{ role: "user" as const, text: message, at }] : [{ role: "user" as const, text: `[${input.mode}]`, at }]), { role: "assistant" as const, text: reply, at }].slice(-20);
  if (session) await prisma.aiSession.update({ where: { id: session.id }, data: { messages: next } });
  else await prisma.aiSession.create({ data: { profileId, kind: "mentor", contextId: input.lessonId, messages: next } });
  return { ok: true, reply };
}

// Рекомендация тренировки без ИИ: уроки с низким лучшим результатом.
export async function recommendPracticeFor(profileId: string, lang: Lang): Promise<(PracticeItem)[]> {
  const attempts = await prisma.lessonAttempt.findMany({ where: { profileId, status: "completed", score: { not: null } }, include: { lesson: { select: { id: true, title: true } } } });
  const best = new Map<string, PracticeItem>();
  for (const a of attempts) {
    const s = a.score as number;
    const cur = best.get(a.lessonId);
    if (!cur || s > cur.bestScore) best.set(a.lessonId, { lessonId: a.lessonId, title: pick(L(a.lesson.title), lang), bestScore: s });
  }
  return practiceRecommendations([...best.values()]);
}

export async function mentorHistory(profileId: string, lessonId: string) {
  const s = await prisma.aiSession.findFirst({ where: { profileId, kind: "mentor", contextId: lessonId } });
  return ((s?.messages as unknown as { role: string; text: string }[]) ?? []).map((m) => ({ role: m.role, text: m.text }));
}
