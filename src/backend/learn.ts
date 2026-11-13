// Сервис обучения. Все проверки и начисления — здесь, на сервере; клиент ничего не решает.
import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { ensureContent } from "./learnContent";
import { PASS_SCORE, competencyScores, gradeExercise, lessonScore, lessonStates, lText, pick, xpFor, type AttemptInfo, type LessonState } from "@/learn/engine";
import { awardXp } from "./xp";
import type { ExerciseType, Lang, LText } from "@/learn/types";

const L = (v: unknown): LText => v as LText;

export type TrackView = {
  trackId: string;
  modules: { id: string; title: string; summary: string; expertReviewed: boolean; lessons: { id: string; title: string; minutes: number; state: LessonState; bestScore: number | null }[] }[];
};

async function statesFor(profileId: string | null, lessonIds: string[]) {
  const attempts: Record<string, AttemptInfo[]> = {};
  if (profileId) {
    const rows = await prisma.lessonAttempt.findMany({ where: { profileId, lessonId: { in: lessonIds } }, select: { lessonId: true, status: true, score: true } });
    for (const r of rows) (attempts[r.lessonId] ??= []).push({ status: r.status as AttemptInfo["status"], score: r.score });
  }
  return { attempts, states: lessonStates(lessonIds, attempts) };
}

export async function getTrack(trackId: string, profileId: string | null, lang: Lang): Promise<TrackView | null> {
  await ensureContent();
  const modules = await prisma.learnModule.findMany({ where: { trackId, status: "published" }, orderBy: { order: "asc" }, include: { lessons: { where: { status: "published" }, orderBy: { order: "asc" } } } });
  if (modules.length === 0) return null;
  const ids = modules.flatMap((m) => m.lessons.map((l) => l.id));
  const { attempts, states } = await statesFor(profileId, ids);
  const best = (id: string) => { const s = (attempts[id] ?? []).filter((a) => a.status === "completed" && a.score !== null).map((a) => a.score as number); return s.length ? Math.max(...s) : null; };
  return {
    trackId,
    modules: modules.map((m) => ({ id: m.id, title: pick(L(m.title), lang), summary: pick(m.summary ? L(m.summary) : undefined, lang), expertReviewed: m.expertReviewed, lessons: m.lessons.map((l) => ({ id: l.id, title: pick(L(l.title), lang), minutes: l.minutes, state: states[l.id], bestScore: best(l.id) })) })),
  };
}

export async function listTracks(): Promise<{ trackId: string; kind: string; moduleCount: number; lessonCount: number }[]> {
  await ensureContent();
  const mods = await prisma.learnModule.findMany({ where: { status: "published" }, include: { _count: { select: { lessons: true } } } });
  const by = new Map<string, { moduleCount: number; lessonCount: number }>();
  for (const m of mods) { const t = by.get(m.trackId) ?? { moduleCount: 0, lessonCount: 0 }; t.moduleCount++; t.lessonCount += m._count.lessons; by.set(m.trackId, t); }
  return [...by].map(([trackId, v]) => ({ trackId, kind: trackId.split(":")[0], ...v }));
}

// ---------- Урок для прохождения ----------
export type PlayExercise = { id: string; type: ExerciseType; phase: string; prompt: string; data: unknown };
export type PlayLesson = { id: string; title: string; minutes: number; objectives: string[]; theory: { kind: string; text: string }[]; exercises: PlayExercise[]; trackId: string };

// Локализует все LText внутри data на сервере. Правильные ответы сюда не попадают: их нет в data.
function localize(v: any, lang: Lang): any {
  if (Array.isArray(v)) return v.map((x) => localize(x, lang));
  if (v && typeof v === "object") {
    if (typeof v.ru === "string") return pick(v as LText, lang);
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, localize(x, lang)]));
  }
  return v;
}

export async function getLessonForPlay(lessonId: string, lang: Lang): Promise<PlayLesson | null> {
  await ensureContent();
  const l = await prisma.lesson.findUnique({ where: { id: lessonId }, include: { module: true, exercises: { orderBy: { order: "asc" } } } });
  if (!l || l.status !== "published" || l.module.status !== "published") return null;
  return {
    id: l.id, trackId: l.module.trackId, title: pick(L(l.title), lang), minutes: l.minutes,
    objectives: (l.objectives as unknown as LText[]).map((o) => pick(o, lang)),
    theory: (l.theory as unknown as { kind: string; text: LText }[]).map((b) => ({ kind: b.kind, text: pick(b.text, lang) })),
    exercises: l.exercises.map((e) => ({ id: e.id, type: e.type as ExerciseType, phase: e.phase, prompt: pick(L(e.prompt), lang), data: localize(e.data, lang) })),
  };
}

// ---------- Попытки ----------
export type StartResult = { ok: true; attemptId: string; answered: Record<string, { correct: boolean; score: number }> } | { ok: false; status: number; error: string };

export async function startAttempt(profileId: string, lessonId: string): Promise<StartResult> {
  await ensureContent();
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, include: { module: true } });
  if (!lesson || lesson.status !== "published" || lesson.module.status !== "published") return { ok: false, status: 404, error: "Урок не найден" };
  // Порядок: урок должен быть открыт (предыдущий пройден)
  const siblings = await prisma.lesson.findMany({ where: { status: "published", module: { trackId: lesson.module.trackId, status: "published" } }, orderBy: [{ module: { order: "asc" } }, { order: "asc" }], select: { id: true } });
  const { states } = await statesFor(profileId, siblings.map((s) => s.id));
  if (states[lessonId] === "locked") return { ok: false, status: 403, error: "Сначала пройдите предыдущий урок" };

  let attempt = await prisma.lessonAttempt.findFirst({ where: { profileId, lessonId, status: "in_progress" }, orderBy: { startedAt: "desc" }, include: { answers: true } });
  if (!attempt) attempt = await prisma.lessonAttempt.create({ data: { profileId, lessonId }, include: { answers: true } });
  return { ok: true, attemptId: attempt.id, answered: Object.fromEntries(attempt.answers.map((a) => [a.exerciseId, { correct: a.correct, score: a.score }])) };
}

export type AnswerResult =
  | { ok: true; correct: boolean; score: number; explanation: string; reveal: unknown; optionFeedback?: string; unverified: boolean }
  | { ok: false; status: number; error: string };

function revealFor(type: string, key: any): unknown {
  switch (type) {
    case "choice": case "case": return { correct: key.correct };
    case "multi": return { correct: key.correct };
    case "match": return { map: key.map };
    case "order": return { order: key.order };
    case "fill": return { blanks: key.blanks.map((b: string[]) => b[0]) };
    default: return null;
  }
}

export async function submitAnswer(profileId: string, attemptId: string, exerciseId: string, answer: unknown, lang: Lang): Promise<AnswerResult> {
  const attempt = await prisma.lessonAttempt.findFirst({ where: { id: attemptId, profileId } }); // чужие попытки недоступны
  if (!attempt) return { ok: false, status: 404, error: "Попытка не найдена" };
  if (attempt.status !== "in_progress") return { ok: false, status: 409, error: "Урок уже завершён" };
  const ex = await prisma.exercise.findFirst({ where: { id: exerciseId, lessonId: attempt.lessonId } });
  if (!ex) return { ok: false, status: 404, error: "Задание не найдено" };

  const build = (correct: boolean, score: number): AnswerResult => {
    const fb = ex.type === "case" && typeof answer === "number" ? (ex.data as any).optionFeedback?.[answer] : undefined;
    return { ok: true, correct, score, explanation: pick(L(ex.explanation), lang), reveal: revealFor(ex.type, ex.answerKey), ...(fb ? { optionFeedback: pick(fb, lang) } : {}), unverified: !ex.verified };
  };
  const prev = await prisma.exerciseAnswer.findUnique({ where: { attemptId_exerciseId: { attemptId, exerciseId } } });
  if (prev) return build(prev.correct, prev.score); // повторная отправка не меняет результат

  const g = gradeExercise(ex.type as ExerciseType, ex.data, ex.answerKey, answer);
  if (!g) return { ok: false, status: 400, error: "Некорректный ответ" };
  try {
    await prisma.exerciseAnswer.create({ data: { attemptId, exerciseId, answer: answer as Prisma.InputJsonValue, correct: g.correct, score: g.score } });
  } catch (e) {
    if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e; // гонка двух запросов: результат уже записан
    const again = await prisma.exerciseAnswer.findUnique({ where: { attemptId_exerciseId: { attemptId, exerciseId } } });
    if (again) return build(again.correct, again.score);
  }
  return build(g.correct, g.score);
}

export type CompleteResult =
  | { ok: true; score: number; passed: boolean; xp: number; mistakes: { exerciseId: string; prompt: string; explanation: string }[]; nextLessonId: string | null; unverifiedCount: number }
  | { ok: false; status: number; error: string };

export async function completeAttempt(profileId: string, attemptId: string, lang: Lang): Promise<CompleteResult> {
  const attempt = await prisma.lessonAttempt.findFirst({ where: { id: attemptId, profileId }, include: { answers: true, lesson: { include: { exercises: { orderBy: { order: "asc" } }, module: true } } } });
  if (!attempt) return { ok: false, status: 404, error: "Попытка не найдена" };
  const lesson = attempt.lesson;
  const answered = new Map(attempt.answers.map((a) => [a.exerciseId, a]));
  if (lesson.exercises.some((e) => !answered.has(e.id))) return { ok: false, status: 409, error: "Ответьте на все задания" };

  const score = lessonScore(lesson.exercises.map((e) => answered.get(e.id)!.score));
  const passed = score >= PASS_SCORE;
  let xp = 0;

  if (attempt.status === "in_progress") {
    await prisma.$transaction(async (tx) => {
      await tx.lessonAttempt.update({ where: { id: attemptId }, data: { status: "completed", score, completedAt: new Date() } });
      // За один урок XP начисляется один раз (уникальный источник), повторное прохождение XP не даёт.
      const amount = await awardXp(tx, profileId, xpFor(lesson.maxXp, score), "lesson", lesson.id);
      if (amount > 0) {
        await tx.lessonAttempt.update({ where: { id: attemptId }, data: { xpAwarded: amount } });
        xp = amount;
      }    });
    await recomputeCompetencies(profileId);
  } else {
    xp = attempt.xpAwarded;
  }

  const mistakes = lesson.exercises.filter((e) => !answered.get(e.id)!.correct).map((e) => ({ exerciseId: e.id, prompt: pick(L(e.prompt), lang), explanation: pick(L(e.explanation), lang) }));
  const unverifiedCount = lesson.exercises.filter((e) => !e.verified).length;

  const order = await prisma.lesson.findMany({ where: { status: "published", module: { trackId: lesson.module.trackId, status: "published" } }, orderBy: [{ module: { order: "asc" } }, { order: "asc" }], select: { id: true } });
  const idx = order.findIndex((o) => o.id === lesson.id);
  const nextLessonId = passed && idx >= 0 && idx < order.length - 1 ? order[idx + 1].id : null;
  return { ok: true, score, passed, xp, mistakes, nextLessonId, unverifiedCount };
}

// Пересчёт освоения компетенций по ВСЕМ завершённым ответам профиля (лучший результат каждого задания).
// Считаем по всем урокам сразу, чтобы компетенция, которую развивают несколько уроков, не затиралась одним из них.
async function recomputeCompetencies(profileId: string) {
  const answers = await prisma.exerciseAnswer.findMany({ where: { attempt: { profileId, status: "completed" } }, include: { exercise: { select: { competencies: true, verified: true } } } });
  const evidence = answers.map((a) => ({ exerciseId: a.exerciseId, score: a.score, comps: a.exercise.competencies as { id: string; weight: number }[], verified: a.exercise.verified }));
  const result = competencyScores(evidence);
  for (const [competencyId, v] of Object.entries(result)) {
    await prisma.competencyProgress.upsert({ where: { profileId_competencyId: { profileId, competencyId } }, create: { profileId, competencyId, score: v.score, evidence: v.evidence }, update: { score: v.score, evidence: v.evidence } });
  }
}

void lText;
