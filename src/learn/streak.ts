// Серия занятий по календарным дням (UTC — часовой пояс пользователя пока не хранится, это ограничение).
export const dayKey = (d: Date): string => d.toISOString().slice(0, 10);

export function nextStreak(lastActiveDay: string | null, today: string, current: number): number {
  if (lastActiveDay === today) return Math.max(1, current);
  if (lastActiveDay) {
    const diff = Math.round((Date.parse(today) - Date.parse(lastActiveDay)) / 86400000);
    if (diff === 1) return current + 1;
  }
  return 1;
}
