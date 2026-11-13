// Загрузка фактов о пути пользователя из базы (для страницы «Мой путь» и главной).
import { prisma } from "./db";
import { getProfile } from "./profile";
import { getLatestState } from "./results";
import type { UserResult } from "./catalogContext";
import { professionById } from "@/data/professions";
import { computeJourney, type Journey, type JourneyFacts } from "@/journey/logic";
import { loadTrack } from "./track";

export type JourneyData = {
  facts: JourneyFacts;
  journey: Journey;
  user: UserResult;
  selected: { id: string; title: string; skills: string[] } | null;
  ratings: Record<string, number>; // навык -> оценка 0–2 для выбранной профессии
  recommendations: { id: string; title: string; percent: number; reason: string }[];
  hasProfile: boolean;
};

export async function loadJourney(): Promise<JourneyData> {
  const profile = await getProfile();
  if (!profile) {
    const facts: JourneyFacts = { hasResult: false, selectedProfession: null, skillsTotal: 0, skillsRated: 0, planStarted: false, tasksDone: 0 };
    return { facts, journey: computeJourney(facts), user: { status: "none" }, selected: null, ratings: {}, recommendations: [], hasProfile: false };
  }

  const state = await getLatestState(profile.id);
  const user: UserResult = state.status === "ok"
    ? { status: "ok", version: state.version, result: state.result }
    : state.status === "outdated" ? { status: "outdated", version: state.version } : { status: "none" };

  const selectedProf = profile.selectedProfession ? professionById(profile.selectedProfession) : undefined;
  const selected = selectedProf ? { id: selectedProf.id, title: selectedProf.title, skills: selectedProf.skills } : null;

  let ratings: Record<string, number> = {};
  if (selected) {
    const rows = await prisma.skillCheck.findMany({ where: { profileId: profile.id, professionId: selected.id }, select: { skill: true, rating: true } });
    ratings = Object.fromEntries(rows.map((r) => [r.skill, r.rating]));
  }

  const taskRows = await prisma.taskProgress.count({ where: { profileId: profile.id, done: true } });
  const aiRoadmaps = await prisma.aiRecord.count({ where: { profileId: profile.id, kind: "roadmap" } });

  // Мини-курс и повторная проверка для выбранной профессии (этап 2)
  let lessonsRead = 0;
  let round2Done = false;
  if (selected) {
    const track = await loadTrack(profile.id, selected.id);
    lessonsRead = track.lessonsRead;
    round2Done = track.round2 !== null;
  }

  const facts: JourneyFacts = {
    hasResult: user.status === "ok",
    selectedProfession: selected?.id ?? null,
    skillsTotal: selected?.skills.length ?? 0,
    skillsRated: selected ? selected.skills.filter((s) => ratings[s] !== undefined).length : 0,
    planStarted: taskRows > 0 || aiRoadmaps > 0,
    tasksDone: taskRows,
    lessonsRead,
    round2Done,
  };

  const recommendations = user.status === "ok"
    ? user.result.professions.slice(0, 6).map((m) => ({
        id: m.profession.id,
        title: m.profession.title,
        percent: m.percent,
        reason: m.reasons[0] ?? "",
      }))
    : [];
  return { facts, journey: computeJourney(facts), user, selected, ratings, recommendations, hasProfile: true };
}
