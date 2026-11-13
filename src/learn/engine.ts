// Чистая логика движка уроков: проверка ответов, состояния уроков, итог урока, освоение компетенций.
// Без базы и без ИИ — всё детерминированно и покрыто тестами (tests/learn-engine.test.ts).
import type { ExerciseType, L, LText, Lang } from "./types";

export const PASS_SCORE = 0.6; // урок считается пройденным
export const REVIEW_SCORE = 0.7; // ниже — «требует повторения»

export const lText = (l: L): LText => (typeof l === "string" ? { ru: l } : l);
// Явный fallback: нет перевода — берём русский.
export const pick = (l: LText | undefined, lang: Lang): string => (l ? l[lang] ?? l.ru : "");

// ---------- Проверка ответов ----------
export type Grade = { correct: boolean; score: number };
const BAD: Grade = { correct: false, score: 0 };

export function norm(s: string): string {
  return s.toLowerCase().replace(/ё/g, "е").replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
}

const isIntArray = (a: unknown, len?: number): a is number[] => Array.isArray(a) && a.every((x) => Number.isInteger(x)) && (len === undefined || a.length === len);

// key — то, что хранится только на сервере. data — то, что видел ученик.
export function gradeExercise(type: ExerciseType, data: any, key: any, answer: unknown): Grade | null {
  switch (type) {
    case "choice":
    case "case": {
      if (!Number.isInteger(answer) || (answer as number) < 0 || (answer as number) >= data.options.length) return null;
      const ok = answer === key.correct;
      return { correct: ok, score: ok ? 1 : 0 };
    }
    case "multi": {
      if (!isIntArray(answer) || new Set(answer).size !== answer.length || answer.some((x) => x < 0 || x >= data.options.length)) return null;
      const right = new Set<number>(key.correct);
      const hits = answer.filter((x) => right.has(x)).length;
      const wrong = answer.length - hits;
      const score = Math.max(0, (hits - wrong) / right.size);
      return { correct: hits === right.size && wrong === 0, score };
    }
    case "match": {
      const n = data.left.length;
      if (!isIntArray(answer, n) || answer.some((x) => x < 0 || x >= data.right.length) || new Set(answer).size !== n) return null;
      const hits = answer.filter((r, i) => r === key.map[i]).length;
      return { correct: hits === n, score: hits / n };
    }
    case "order": {
      const n = data.items.length;
      if (!isIntArray(answer, n) || new Set(answer).size !== n || answer.some((x) => x < 0 || x >= n)) return null;
      const hits = answer.filter((v, i) => v === key.order[i]).length;
      return { correct: hits === n, score: hits / n };
    }
    case "fill": {
      const blanks: string[][] = key.blanks;
      if (!Array.isArray(answer) || answer.length !== blanks.length || answer.some((x) => typeof x !== "string" || x.length > 200)) return null;
      const hits = blanks.filter((acc, i) => acc.some((a) => norm(a) === norm(answer[i] as string))).length;
      return { correct: hits === blanks.length, score: hits / blanks.length };
    }
    case "text": {
      if (typeof answer !== "string" || answer.length > 4000) return null;
      const text = norm(answer);
      const groups: string[][] = key.groups;
      const hits = groups.filter((g) => g.some((k) => text.includes(norm(k)))).length;
      const min: number = key.min;
      return { correct: hits >= min, score: Math.min(1, hits / min) };
    }
    case "project": {
      const checked = (answer as { checked?: unknown })?.checked;
      if (!Array.isArray(checked) || checked.length !== key.n || checked.some((x) => typeof x !== "boolean")) return null;
      const done = checked.filter(Boolean).length;
      // Самоотчёт: помечается как непроверенный (verified=false) и не даёт баллов компетенции.
      return { correct: done === key.n, score: done / key.n };
    }
    default:
      return BAD;
  }
}

// ---------- Итог урока ----------
export function lessonScore(scores: number[]): number {
  return scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
}
export const xpFor = (maxXp: number, score: number): number => (score >= PASS_SCORE ? Math.round(maxXp * score) : 0);

// ---------- Состояния уроков ----------
export type LessonState = "locked" | "available" | "in_progress" | "completed" | "needs_review";
export type AttemptInfo = { status: "in_progress" | "completed"; score: number | null };

// lessons — по порядку трека. attempts — попытки пользователя по урокам.
// Урок открыт, если предыдущий пройден (score ≥ PASS_SCORE). «Требует повторения» — пройден, но лучший результат ниже REVIEW_SCORE.
export function lessonStates(lessonIds: string[], attempts: Record<string, AttemptInfo[]>): Record<string, LessonState> {
  const out: Record<string, LessonState> = {};
  let prevPassed = true;
  for (const id of lessonIds) {
    const list = attempts[id] ?? [];
    const done = list.filter((a) => a.status === "completed" && a.score !== null);
    const best = done.length ? Math.max(...done.map((a) => a.score as number)) : null;
    const passed = best !== null && best >= PASS_SCORE;
    if (!prevPassed) out[id] = "locked";
    else if (passed) out[id] = best! < REVIEW_SCORE ? "needs_review" : "completed";
    else if (list.some((a) => a.status === "in_progress")) out[id] = "in_progress";
    else out[id] = "available";
    prevPassed = passed;
  }
  return out;
}

// ---------- Освоение компетенций ----------
// Для каждой компетенции: среднее по ЛУЧШИМ результатам различных проверенных заданий. Число нажатий не влияет.
export type Evidence = { exerciseId: string; score: number; comps: { id: string; weight: number }[]; verified: boolean };
export function competencyScores(evidence: Evidence[]): Record<string, { score: number; evidence: number }> {
  const bestByExercise = new Map<string, Evidence>();
  for (const e of evidence) {
    if (!e.verified) continue;
    const prev = bestByExercise.get(e.exerciseId);
    if (!prev || e.score > prev.score) bestByExercise.set(e.exerciseId, e);
  }
  const acc = new Map<string, { sum: number; w: number; n: number }>();
  for (const e of bestByExercise.values()) {
    for (const c of e.comps) {
      const a = acc.get(c.id) ?? { sum: 0, w: 0, n: 0 };
      a.sum += e.score * c.weight; a.w += c.weight; a.n += 1;
      acc.set(c.id, a);
    }
  }
  return Object.fromEntries([...acc].map(([id, a]) => [id, { score: a.w ? a.sum / a.w : 0, evidence: a.n }]));
}

// Детерминированное перемешивание (стабильное для одного id), чтобы порядок не менялся между запросами.
export function seededShuffle<T>(items: T[], seed: string): T[] {
  let h = 2166136261;
  for (const ch of seed) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  const rnd = () => { h ^= h << 13; h >>>= 0; h ^= h >>> 17; h ^= h << 5; h >>>= 0; return h / 4294967296; };
  const a = items.map((v, i) => [v, i] as const);
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a.map((x) => x[0]);
}
