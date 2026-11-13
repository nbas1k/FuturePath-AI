// Серверная часть учебного маршрута: состояние, отметки уроков, ответы по раундам.
import { prisma } from "./db";
import { TRACKS, type Track } from "@/data/track";
import { gradeRound, roundStatus, type Graded, type GradedItem } from "@/track/logic";

export type TrackState = {
  supported: boolean;
  lessons: { id: string; title: string; text: string[]; read: boolean }[];
  tasks: { id: string; question: string; options: string[] }[]; // БЕЗ правильных ответов
  round1: Graded | null;
  round2: Graded | null;
  lessonsRead: number;
  status: { canRound1: boolean; canRound2: boolean; reason: string };
};

// Ответы из базы превращаем в понятный результат: правильный текст и пояснение берутся из трека на сервере
function rebuild(track: Track, rows: { taskId: string; answer: number; correct: boolean }[]): Graded | null {
  if (rows.length === 0) return null;
  const byId = new Map(rows.map((r) => [r.taskId, r]));
  const items: GradedItem[] = [];
  for (const t of track.tasks) {
    const r = byId.get(t.id);
    if (!r) return null; // раунд не полный — не показываем
    items.push({ taskId: t.id, answer: r.answer, correct: r.correct, explanation: t.explanation, correctText: t.options[t.correct] });
  }
  return { items, score: items.filter((i) => i.correct).length, total: items.length };
}

export async function loadTrack(profileId: string, professionId: string): Promise<TrackState> {
  const track = TRACKS[professionId];
  if (!track) {
    return { supported: false, lessons: [], tasks: [], round1: null, round2: null, lessonsRead: 0, status: { canRound1: false, canRound2: false, reason: "" } };
  }
  const reads = await prisma.lessonRead.findMany({ where: { profileId, professionId }, select: { lessonId: true } });
  const readIds = new Set(reads.map((r) => r.lessonId));
  const answers = await prisma.practiceAnswer.findMany({ where: { profileId, professionId } });
  const round1Rows = answers.filter((a) => a.round === 1).map((a) => ({ taskId: a.taskId, answer: a.answer, correct: a.correct }));
  const round2Rows = answers.filter((a) => a.round === 2).map((a) => ({ taskId: a.taskId, answer: a.answer, correct: a.correct }));
  const round1 = rebuild(track, round1Rows);
  const round2 = rebuild(track, round2Rows);
  const lessonsRead = track.lessons.filter((l) => readIds.has(l.id)).length;
  const status = roundStatus({ round1Done: round1 !== null, round2Done: round2 !== null, lessonsRead, lessonsTotal: track.lessons.length });
  return {
    supported: true,
    lessons: track.lessons.map((l) => ({ id: l.id, title: l.title, text: l.text, read: readIds.has(l.id) })),
    tasks: track.tasks.map((t) => ({ id: t.id, question: t.question, options: t.options })),
    round1,
    round2,
    lessonsRead,
    status,
  };
}

export async function markLesson(profileId: string, professionId: string, lessonId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const track = TRACKS[professionId];
  if (!track) return { ok: false, error: "Для этой профессии курс пока не готов" };
  if (!track.lessons.some((l) => l.id === lessonId)) return { ok: false, error: "Такого урока нет" };
  // Курс открывается только после первой проверки (правило сервера, не только интерфейса)
  const first = await prisma.practiceAnswer.count({ where: { profileId, professionId, round: 1 } });
  if (first === 0) return { ok: false, error: "Сначала пройдите первую проверку" };
  await prisma.lessonRead.upsert({
    where: { profileId_professionId_lessonId: { profileId, professionId, lessonId } },
    update: {},
    create: { profileId, professionId, lessonId },
  });
  return { ok: true };
}

// Принимает ответы на все задания за текущий раунд. Раунд выбирается сервером.
export async function submitRound(
  profileId: string,
  professionId: string,
  answers: Record<string, unknown>,
): Promise<{ ok: true; round: 1 | 2; graded: Graded } | { ok: false; error: string }> {
  const track = TRACKS[professionId];
  if (!track) return { ok: false, error: "Для этой профессии курс пока не готов" };

  const state = await loadTrack(profileId, professionId);
  if (!state.status.canRound1 && !state.status.canRound2) {
    return { ok: false, error: state.status.reason };
  }
  const round: 1 | 2 = state.status.canRound1 ? 1 : 2;

  const graded = gradeRound(track, answers);
  if (!graded.ok) return graded;

  await prisma.$transaction(
    graded.graded.items.map((it) =>
      prisma.practiceAnswer.upsert({
        where: { profileId_professionId_round_taskId: { profileId, professionId, round, taskId: it.taskId } },
        update: { answer: it.answer, correct: it.correct },
        create: { profileId, professionId, round, taskId: it.taskId, answer: it.answer, correct: it.correct },
      }),
    ),
  );
  return { ok: true, round, graded: graded.graded };
}
