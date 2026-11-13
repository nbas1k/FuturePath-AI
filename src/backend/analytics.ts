// Данные для Progress Analytics и Skills Passport по выбранной профессии. Всё берётся из базы, ничего не выдумывается.
import { prisma } from "./db";
import { professionById } from "@/data/professions";
import { TRACKS } from "@/data/track";
import { CHALLENGES } from "@/data/challenge";
import { SIMS } from "@/data/simulator";
import { TRACK_TASK_SKILLS } from "@/data/skillTags";
import { loadSkillMap } from "./skillMap";
import { loadCycle } from "./cycle";
import { getLatestState } from "./results";
import { metricsFromChoices, summarize } from "@/simulator/logic";
import { summarizeInterview, type Evaluation } from "@/interview/logic";
import { achievements, confirmedOverTime, firstLast, type SkillEvent, type Trend } from "@/analytics/logic";

export type ProgressData = {
  profession: { id: string; title: string };
  course: { exists: boolean; lessonsRead: number; lessonsTotal: number; round1: number | null; round2: number | null; total: number; done: boolean };
  challenge: { exists: boolean; solo: number | null; withAi: number | null; ai: number | null; total: number };
  sims: { date: string; total: number; metrics: { quality: number; time: number; trust: number }; verdict: string }[];
  interviews: { date: string; total: number; max: number; percent: number }[];
  skillsOverTime: { step: number; confirmed: number }[];
  confirmedSkills: string[];
  trends: { sim: Trend | null; interview: Trend | null; course: Trend | null };
  history: { at: number; date: string; text: string }[];
  mentorMessages: number;
  cycles: { skill: string; before: number; after: number; total: number; date: string }[];
  testDone: boolean;
  achievements: { id: string; title: string; done: boolean }[];
};

const day = (d: Date) => d.toISOString().slice(0, 10);

export async function loadProgress(profileId: string, professionId: string): Promise<ProgressData | null> {
  const prof = professionById(professionId);
  if (!prof) return null;
  const history: ProgressData["history"] = [];
  const add = (d: Date, text: string) => history.push({ at: d.getTime(), date: day(d), text });

  const test = await getLatestState(profileId);
  const tracks = TRACKS[professionId];
  const practice = await prisma.practiceAnswer.findMany({ where: { profileId, professionId } });
  const reads = await prisma.lessonRead.findMany({ where: { profileId, professionId } });
  const tags = TRACK_TASK_SKILLS[professionId] ?? {};
  const skillEvents: SkillEvent[] = [];

  const round = (n: number) => practice.filter((p) => p.round === n);
  const complete = (n: number) => !!tracks && round(n).length === tracks.tasks.length;
  const score = (n: number) => (complete(n) ? round(n).filter((p) => p.correct).length : null);
  for (const p of practice) if (tags[p.taskId]) skillEvents.push({ at: p.createdAt.getTime(), taskKey: `t:${p.taskId}`, skill: tags[p.taskId], correct: p.correct });
  for (const r of reads) add(r.createdAt, "Прочитан урок мини-курса");
  for (const n of [1, 2]) if (complete(n)) add(new Date(Math.max(...round(n).map((p) => p.createdAt.getTime()))), n === 1 ? `Первая проверка курса: ${score(1)} из ${tracks!.tasks.length}` : `Повторная проверка курса: ${score(2)} из ${tracks!.tasks.length}`);

  const set = CHALLENGES[professionId];
  const cAnswers = set ? await prisma.challengeAnswer.findMany({ where: { profileId, professionId } }) : [];
  const helps = set ? await prisma.challengeAiHelp.findMany({ where: { profileId, professionId } }) : [];
  const cScore = (mode: string) => (set && cAnswers.filter((a) => a.mode === mode).length === set.solo.length ? cAnswers.filter((a) => a.mode === mode && a.correct).length : null);
  const soloScore = cScore("solo");
  const withAiScore = cScore("ai");
  const aiScore = set && helps.length === set.ai.length ? helps.filter((h) => h.correct).length : null;
  for (const a of cAnswers.filter((x) => x.mode === "solo")) {
    const t = set!.solo.find((x) => x.id === a.taskId);
    if (t) skillEvents.push({ at: a.createdAt.getTime(), taskKey: `c:${a.taskId}`, skill: t.skill, correct: a.correct });
  }
  if (soloScore !== null) add(new Date(Math.max(...cAnswers.filter((a) => a.mode === "solo").map((a) => a.createdAt.getTime()))), `Challenge, сам: ${soloScore} из ${set!.solo.length}`);
  if (withAiScore !== null) add(new Date(Math.max(...cAnswers.filter((a) => a.mode === "ai").map((a) => a.createdAt.getTime()))), `Challenge, с подсказками ИИ: ${withAiScore} из ${set!.ai.length}`);

  const simRows = (await prisma.simRun.findMany({ where: { profileId, professionId, finished: true }, orderBy: { createdAt: "asc" } }));
  const sims: ProgressData["sims"] = [];
  for (const r of simRows) {
    const sc = SIMS[professionId];
    let choices: number[] = [];
    try { choices = JSON.parse(r.choices); } catch { /* повреждённая запись пропускается */ }
    const m = sc ? metricsFromChoices(sc, choices) : null;
    if (!m || !m.ok) continue;
    const total = m.metrics.quality + m.metrics.time + m.metrics.trust;
    sims.push({ date: day(r.updatedAt), total, metrics: m.metrics, verdict: summarize(m.metrics).text });
    add(r.updatedAt, `Рабочий день в симуляторе: ${total} из 30`);
  }

  const intRows = await prisma.interviewRun.findMany({ where: { profileId, professionId, evaluation: { not: null } }, orderBy: { createdAt: "asc" } });
  const interviews: ProgressData["interviews"] = [];
  for (const r of intRows) {
    try {
      const s = summarizeInterview((JSON.parse(r.evaluation!) as Evaluation).items);
      interviews.push({ date: day(r.updatedAt), total: s.total, max: s.max, percent: Math.round((s.total / s.max) * 100) });
      add(r.updatedAt, `Пробное собеседование: ${s.total} из ${s.max}`);
    } catch { /* повреждённая запись пропускается */ }
  }

  const mentorMessages = await prisma.mentorMessage.count({ where: { profileId, professionId, role: "user" } });
  if (mentorMessages > 0) add(new Date(), `Вопросов наставнику: ${mentorMessages}`);

  const map = await loadSkillMap(profileId, professionId);
  const confirmedSkills = map?.map.rows.filter((r) => r.status === "confirmed").map((r) => r.skill) ?? [];
  const course = {
    exists: !!tracks,
    lessonsRead: reads.length,
    lessonsTotal: tracks?.lessons.length ?? 0,
    round1: score(1),
    round2: score(2),
    total: tracks?.tasks.length ?? 0,
    done: !!tracks && complete(2) && reads.length >= tracks.lessons.length,
  };
  const challenge = { exists: !!set, solo: soloScore, withAi: withAiScore, ai: aiScore, total: set?.solo.length ?? 0 };

  return {
    profession: { id: prof.id, title: prof.title },
    course,
    challenge,
    sims,
    interviews,
    skillsOverTime: confirmedOverTime(skillEvents).map((p, i) => ({ step: i + 1, confirmed: p.confirmed })),
    confirmedSkills,
    trends: {
      sim: firstLast(sims.map((s) => s.total)),
      interview: firstLast(interviews.map((i) => i.percent)),
      course: course.round1 !== null && course.round2 !== null ? firstLast([course.round1, course.round2]) : null,
    },
    cycles: (await loadCycle(profileId, professionId)).history,
    history: history.sort((a, b) => b.at - a.at),
    mentorMessages,
    testDone: test.status === "ok",
    achievements: achievements({
      testDone: test.status === "ok",
      professionChosen: true,
      courseDone: course.done,
      challengeDone: soloScore !== null && withAiScore !== null,
      simDone: sims.length > 0,
      interviewDone: interviews.length > 0,
      confirmedSkills: confirmedSkills.length,
      mentorMessages,
    }),
  };
}
