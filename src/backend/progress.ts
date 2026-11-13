import { prisma } from "./db";
import { ACHIEVEMENTS, activeStreak, lastNDays, levelFor, unlockedAchievements, type Stats } from "@/progress/logic";
import { dayKey } from "@/learn/streak";
import { getCareer, UNIVERSAL_SKILLS } from "@/catalog/build";
import { pick } from "@/learn/engine";
import type { LText, Lang } from "@/learn/types";

export async function loadProgress(profileId: string, lang: Lang) {
  const profile = await prisma.profile.findUniqueOrThrow({ where: { id: profileId } });
  const today = dayKey(new Date());
  const week = lastNDays(7);
  const [xpTx, attempts, sims, intro, assessment, comps, wrong] = await Promise.all([
    prisma.xpTransaction.findMany({ where: { profileId, createdAt: { gte: new Date(Date.now() - 8 * 86400000) } } }),
    prisma.lessonAttempt.findMany({ where: { profileId, status: "completed" }, select: { lessonId: true, score: true } }),
    prisma.simulationRun.count({ where: { profileId, status: "completed" } }),
    prisma.introAttempt.count({ where: { profileId, solvedAt: { not: null } } }),
    prisma.assessment.count({ where: { profileId, status: "completed" } }),
    prisma.competencyProgress.findMany({ where: { profileId } }),
    prisma.exerciseAnswer.findMany({ where: { attempt: { profileId, status: "completed" }, correct: false }, include: { exercise: { select: { id: true, lessonId: true, prompt: true, lesson: { select: { title: true } } } } }, orderBy: { createdAt: "desc" }, take: 30 }),
  ]);
  const solvedLater = new Set((await prisma.exerciseAnswer.findMany({ where: { attempt: { profileId, status: "completed" }, correct: true }, select: { exerciseId: true } })).map((a) => a.exerciseId));

  const byDay = Object.fromEntries(week.map((d) => [d, 0]));
  for (const x of xpTx) { const d = dayKey(x.createdAt); if (d in byDay) byDay[d] += x.amount; }
  const lessons = new Set(attempts.map((a) => a.lessonId));
  const stats: Stats = {
    xp: profile.xp, streak: activeStreak(profile.lastActiveDay, profile.streakDays, today), lessonsCompleted: lessons.size,
    perfectLessons: attempts.filter((a) => (a.score ?? 0) >= 0.999).length, simsCompleted: sims, introSolved: intro, assessmentDone: assessment > 0,
    competenciesMastered: comps.filter((c) => c.score >= 0.8 && c.evidence >= 3).length,
  };

  const career = profile.selectedProfession ? getCareer(profile.selectedProfession) : null;
  const nameOf = (id: string): string => {
    if (id.startsWith("us:")) return `us.${id.slice(3)}`;
    const [cid] = id.split(":"); const c = getCareer(cid);
    return c?.competencies.find((k) => k.id === id)?.name ?? id;
  };
  const mistakes = wrong.filter((w) => !solvedLater.has(w.exerciseId)).slice(0, 8).map((w) => ({ lessonId: w.exercise.lessonId, lesson: pick(w.exercise.lesson.title as unknown as LText, lang), prompt: pick(w.exercise.prompt as unknown as LText, lang) }));

  return {
    xp: profile.xp, level: levelFor(profile.xp), streak: stats.streak, dailyGoal: profile.dailyGoalXp, todayXp: byDay[today] ?? 0,
    week: week.map((d) => ({ day: d, xp: byDay[d] })),
    competencies: comps.map((c) => ({ id: c.competencyId, name: nameOf(c.competencyId), score: c.score, evidence: c.evidence, universal: c.competencyId.startsWith("us:") })),
    achievements: unlockedAchievements(stats), mistakes, careerTitle: career?.titles[lang] ?? null, universalCount: UNIVERSAL_SKILLS.length, achievementsTotal: ACHIEVEMENTS.length,
  };
}
