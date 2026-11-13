// Карта навыков и разбор пробелов. Чистые функции, без базы и без ИИ.
// Самооценка (что человек сам отметил) и подтверждение (результаты решённых заданий) — разные вещи.
// Подтверждённый навык = минимум 75% верных ответов по заданиям, решённым САМОСТОЯТЕЛЬНО.

export const CONFIRM_THRESHOLD = 75; // процент верных ответов для подтверждения

export type SkillAttempt = { skill: string; correct: boolean };
export type SkillStatus = "confirmed" | "gap" | "overestimated" | "unchecked";

export type SkillRow = {
  skill: string;
  self: number | null; // 0 — пока нет, 1 — немного, 2 — уверенно, null — не отмечено
  tasks: number; // сколько заданий проверяли навык
  verifiedPct: number | null; // процент верных ответов по ним
  status: SkillStatus;
};

export type SkillMap = {
  rows: SkillRow[];
  confirmed: number;
  gaps: number; // gap + overestimated
  unchecked: number;
  nextSkill: string | null; // с какого навыка лучше начать
};

export function buildSkillMap(skills: string[], ratings: Record<string, number>, attempts: SkillAttempt[]): SkillMap {
  const rows: SkillRow[] = skills.map((skill) => {
    const own = attempts.filter((a) => a.skill === skill);
    const n = own.length;
    const pct = n ? Math.round((own.filter((a) => a.correct).length / n) * 100) : null;
    const self = ratings[skill] ?? null;
    let status: SkillStatus;
    if (pct === null) status = "unchecked";
    else if (pct >= CONFIRM_THRESHOLD) status = "confirmed";
    else if (self === 2) status = "overestimated"; // самооценка выше результата заданий
    else status = "gap";
    return { skill, self, tasks: n, verifiedPct: pct, status };
  });

  // Порядок рекомендаций: сначала переоценка (самое важное), затем пробелы, потом непроверенные
  const order: SkillStatus[] = ["overestimated", "gap", "unchecked"];
  let nextSkill: string | null = null;
  for (const st of order) {
    const hit = rows.find((r) => r.status === st);
    if (hit) { nextSkill = hit.skill; break; }
  }
  return {
    rows,
    confirmed: rows.filter((r) => r.status === "confirmed").length,
    gaps: rows.filter((r) => r.status === "gap" || r.status === "overestimated").length,
    unchecked: rows.filter((r) => r.status === "unchecked").length,
    nextSkill,
  };
}

export const STATUS_LABEL: Record<SkillStatus, string> = {
  confirmed: "Подтверждён заданиями",
  gap: "Нужно развивать",
  overestimated: "Самооценка выше результата",
  unchecked: "Нет заданий для проверки",
};
