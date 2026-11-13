// Чистая логика прогресса: уровни и достижения. XP — это активность, а не владение навыком (его показывает CompetencyProgress).
export const xpToReach = (level: number) => 25 * level * (level - 1); // 1→0, 2→50, 3→150, 4→300, 5→500

export function levelFor(xp: number): { level: number; into: number; need: number; pct: number } {
  let level = 1;
  while (xpToReach(level + 1) <= xp) level++;
  const base = xpToReach(level), next = xpToReach(level + 1);
  return { level, into: xp - base, need: next - base, pct: Math.round(((xp - base) / (next - base)) * 100) };
}

export type Stats = { xp: number; streak: number; lessonsCompleted: number; perfectLessons: number; simsCompleted: number; introSolved: number; assessmentDone: boolean; competenciesMastered: number };
export type Achievement = { id: string; title: string; description: string; unlocked: (s: Stats) => boolean };

export const ACHIEVEMENTS: Achievement[] = [
  { id: "first-lesson", title: "Первый шаг", description: "Завершить первый урок", unlocked: (s) => s.lessonsCompleted >= 1 },
  { id: "five-lessons", title: "Набираю ход", description: "Завершить 5 уроков", unlocked: (s) => s.lessonsCompleted >= 5 },
  { id: "perfect", title: "Без ошибок", description: "Пройти урок на 100%", unlocked: (s) => s.perfectLessons >= 1 },
  { id: "streak-3", title: "Три дня подряд", description: "Серия занятий 3 дня", unlocked: (s) => s.streak >= 3 },
  { id: "streak-7", title: "Неделя без перерыва", description: "Серия занятий 7 дней", unlocked: (s) => s.streak >= 7 },
  { id: "xp-100", title: "100 XP", description: "Набрать 100 XP", unlocked: (s) => s.xp >= 100 },
  { id: "sim", title: "Один день в профессии", description: "Пройти симуляцию", unlocked: (s) => s.simsCompleted >= 1 },
  { id: "intro", title: "Первое знакомство", description: "Решить вводное задание профессии", unlocked: (s) => s.introSolved >= 1 },
  { id: "assessment", title: "Интересы определены", description: "Пройти диагностику", unlocked: (s) => s.assessmentDone },
  { id: "mastery", title: "Навык освоен", description: "Освоить компетенцию на 80% и выше по 3 заданиям", unlocked: (s) => s.competenciesMastered >= 1 },
];

export function unlockedAchievements(s: Stats) {
  return ACHIEVEMENTS.map((a) => ({ id: a.id, title: a.title, description: a.description, unlocked: a.unlocked(s) }));
}

// Серия, актуальная на сегодня: если вчера не занимались, серия сброшена
export function activeStreak(lastActiveDay: string | null, streak: number, today: string): number {
  if (!lastActiveDay) return 0;
  const diff = Math.round((Date.parse(today) - Date.parse(lastActiveDay)) / 86400000);
  return diff <= 1 ? streak : 0;
}

export function lastNDays(n: number, now = new Date()): string[] {
  return Array.from({ length: n }, (_, i) => new Date(now.getTime() - (n - 1 - i) * 86400000).toISOString().slice(0, 10));
}
