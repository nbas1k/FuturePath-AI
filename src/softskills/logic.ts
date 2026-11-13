// Soft Skills Lab и Adaptive Difficulty: чистая логика выбора следующей ситуации и итога.
import { SOFT_LABELS, SOFT_ROUNDS, SOFT_SITUATIONS, type SoftSituation, type SoftSkill } from "@/data/softSkills";

export type Played = { id: string; option: number };

// Адаптивная сложность: 2 балла за ответ — следующая ситуация сложнее, 0 — проще, 1 — тот же уровень
export function nextLevel(level: 1 | 2 | 3, points: number): 1 | 2 | 3 {
  if (points >= 2) return Math.min(3, level + 1) as 1 | 2 | 3;
  if (points <= 0) return Math.max(1, level - 1) as 1 | 2 | 3;
  return level;
}

const byId = (id: string) => SOFT_SITUATIONS.find((s) => s.id === id);

// Проверка списка пройденных: id существуют, без повторов, номер варианта верный. null — запись повреждена.
export function pointsOf(p: Played): number | null {
  const s = byId(p.id);
  const o = s?.options[p.option];
  return s && o && Number.isInteger(p.option) ? o.points : null;
}

// Следующая ситуация выбирается по результатам предыдущей: уровень адаптивный, навыки чередуются
export function pickNext(played: Played[]): SoftSituation | null {
  if (played.length >= SOFT_ROUNDS) return null;
  let level: 1 | 2 | 3 = 1;
  for (const p of played) {
    const s = byId(p.id);
    const pts = pointsOf(p);
    if (!s || pts === null) return null;
    level = nextLevel(s.level, pts);
  }
  const used = new Set(played.map((p) => p.id));
  const count = (k: SoftSkill) => played.filter((p) => byId(p.id)?.skill === k).length;
  const free = SOFT_SITUATIONS.filter((s) => !used.has(s.id));
  if (free.length === 0) return null;
  // Ближайший доступный уровень, затем навык, который реже встречался
  free.sort((a, b) => Math.abs(a.level - level) - Math.abs(b.level - level) || count(a.skill) - count(b.skill));
  return free[0];
}

export type SoftSummary = {
  total: number;
  max: number;
  bySkill: { skill: SoftSkill; label: string; points: number; max: number }[];
  highestLevel: number;
  weakest: SoftSkill | null;
  text: string;
};

export function summarizeSoft(played: Played[]): SoftSummary {
  const rows = new Map<SoftSkill, { points: number; max: number }>();
  let total = 0;
  let highest = 1;
  for (const p of played) {
    const s = byId(p.id);
    const pts = pointsOf(p);
    if (!s || pts === null) continue;
    const r = rows.get(s.skill) ?? { points: 0, max: 0 };
    r.points += pts;
    r.max += 2;
    rows.set(s.skill, r);
    total += pts;
    highest = Math.max(highest, s.level);
  }
  const bySkill = [...rows.entries()].map(([skill, v]) => ({ skill, label: SOFT_LABELS[skill], ...v }));
  const max = bySkill.reduce((a, b) => a + b.max, 0);
  const sorted = [...bySkill].sort((a, b) => a.points / a.max - b.points / b.max);
  const share = max ? total / max : 0;
  const text =
    share >= 0.75 ? "Ваши решения в основном спокойные и ведут к результату. Ситуации становились сложнее."
    : share >= 0.5 ? "Хорошая основа: часть решений можно усилить. Посмотрите разбор вариантов."
    : "Несколько решений были рискованными. Это не оценка вас как человека, а повод разобрать варианты.";
  return { total, max, bySkill, highestLevel: highest, weakest: sorted[0]?.skill ?? null, text };
}
