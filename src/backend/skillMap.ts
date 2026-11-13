// Сбор данных для карты навыков выбранной профессии.
import { prisma } from "./db";
import { professionById } from "@/data/professions";
import { CHALLENGES } from "@/data/challenge";
import { TRACK_TASK_SKILLS } from "@/data/skillTags";
import { CYCLES } from "@/data/cycle";
import { buildSkillMap, type SkillAttempt, type SkillMap } from "@/skills/map";

export type SkillMapData = { profession: { id: string; title: string }; map: SkillMap; attemptsTotal: number };

// Подтверждение даёт только то, что человек решил САМ: курс (последняя попытка по заданию) и самостоятельная часть Challenge.
// Ответы «с подсказками ИИ» в подтверждение не идут.
export async function loadSkillMap(profileId: string, professionId: string): Promise<SkillMapData | null> {
  const prof = professionById(professionId);
  if (!prof) return null;

  const checks = await prisma.skillCheck.findMany({ where: { profileId, professionId }, select: { skill: true, rating: true } });
  const ratings = Object.fromEntries(checks.map((c) => [c.skill, c.rating]));

  const attempts: SkillAttempt[] = [];

  const tags = TRACK_TASK_SKILLS[professionId] ?? {};
  const practice = await prisma.practiceAnswer.findMany({ where: { profileId, professionId } });
  const latest = new Map<string, { round: number; correct: boolean }>();
  for (const p of practice) {
    const cur = latest.get(p.taskId);
    if (!cur || p.round > cur.round) latest.set(p.taskId, { round: p.round, correct: p.correct });
  }
  for (const [taskId, v] of latest) {
    const skill = tags[taskId];
    if (skill) attempts.push({ skill, correct: v.correct });
  }

  const set = CHALLENGES[professionId];
  if (set) {
    const solo = await prisma.challengeAnswer.findMany({ where: { profileId, professionId, mode: "solo" } });
    for (const a of solo) {
      const task = set.solo.find((t) => t.id === a.taskId);
      if (task) attempts.push({ skill: task.skill, correct: a.correct });
    }
  }

  // Цикл обучения: на каждый критерий берётся самое поздно выполненное САМОСТОЯТЕЛЬНОЕ задание (повторная проверка важнее диагностики)
  const cyc = CYCLES[professionId];
  if (cyc) {
    const rows = await prisma.cycleAnswer.findMany({ where: { phase: { in: ["diag", "retest"] }, run: { profileId, professionId } } });
    for (const sk of cyc.skills) {
      for (const c of sk.criteria) {
        const r = rows.find((x) => x.taskId === c.retest.id) ?? rows.find((x) => x.taskId === c.diag.id);
        if (r) attempts.push({ skill: sk.skill, correct: r.correct });
      }
    }
  }

  return { profession: { id: prof.id, title: prof.title }, map: buildSkillMap(prof.skills, ratings, attempts), attemptsTotal: attempts.length };
}
