// Пробное собеседование: чистая логика оценки (без базы и без ИИ).
import { CRITERIA, type CriterionId } from "@/data/interview";

export const MIN_ANSWER = 20; // слишком короткий ответ оценивать нечем
export const MAX_ANSWER = 1200;

export type QuestionScore = { questionId: string; scores: Record<CriterionId, number>; comment: string; tip: string };
export type Evaluation = { items: QuestionScore[]; strengths: string[]; weaknesses: string[]; prep: string[] };

export function validateAnswerText(v: unknown): { ok: true; text: string } | { ok: false; error: string } {
  if (typeof v !== "string") return { ok: false, error: "Ответ должен быть текстом" };
  const t = v.trim();
  if (t.length < MIN_ANSWER) return { ok: false, error: `Ответ слишком короткий: напишите хотя бы ${MIN_ANSWER} символов` };
  if (t.length > MAX_ANSWER) return { ok: false, error: `Ответ слишком длинный: не больше ${MAX_ANSWER} символов` };
  return { ok: true, text: t };
}

export type Summary = {
  total: number; // сумма баллов
  max: number;
  percentLabel: string; // «14 из 18»
  level: "strong" | "ok" | "weak";
  byCriterion: { id: CriterionId; label: string; avg: number }[]; // средний балл 0–3
  weakest: CriterionId;
  strongest: CriterionId;
  levelText: string;
};

// Итог считается по правилам из оценок ИИ. Это учебная обратная связь, а не решение о найме.
export function summarizeInterview(items: QuestionScore[]): Summary {
  const n = Math.max(1, items.length);
  const byCriterion = CRITERIA.map((c) => ({ id: c.id, label: c.label, avg: Math.round((items.reduce((s, i) => s + i.scores[c.id], 0) / n) * 10) / 10 }));
  const total = items.reduce((s, i) => s + CRITERIA.reduce((a, c) => a + i.scores[c.id], 0), 0);
  const max = items.length * CRITERIA.length * 3;
  const share = max ? total / max : 0;
  const level: Summary["level"] = share >= 0.75 ? "strong" : share >= 0.5 ? "ok" : "weak";
  const sorted = [...byCriterion].sort((a, b) => a.avg - b.avg);
  const levelText =
    level === "strong" ? "Ответы в целом уверенные: чаще всего по сути, с примерами и понятно."
    : level === "ok" ? "Неплохая база, но часть ответов можно усилить примерами и структурой."
    : "Ответы пока короткие или общие. Это нормально для первой тренировки: разберите советы ниже.";
  return { total, max, percentLabel: `${total} из ${max}`, level, byCriterion, weakest: sorted[0].id, strongest: sorted[sorted.length - 1].id, levelText };
}
