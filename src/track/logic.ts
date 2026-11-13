// Проверка заданий и правила раундов учебного маршрута. Чистые функции, без базы.
import type { Track } from "@/data/track";

export type GradedItem = { taskId: string; answer: number; correct: boolean; explanation: string; correctText: string };
export type Graded = { items: GradedItem[]; score: number; total: number };

// Проверяет ответы на ВСЕ задания трека. Ошибка, если нет ответа или индекс неверный.
export function gradeRound(track: Track, answers: Record<string, unknown>): { ok: true; graded: Graded } | { ok: false; error: string } {
  const items: GradedItem[] = [];
  for (const t of track.tasks) {
    const a = answers[t.id];
    if (!Number.isInteger(a) || (a as number) < 0 || (a as number) >= t.options.length) {
      return { ok: false, error: "Ответьте на все вопросы, прежде чем проверять" };
    }
    const answer = a as number;
    items.push({
      taskId: t.id,
      answer,
      correct: answer === t.correct,
      explanation: t.explanation,
      correctText: t.options[t.correct],
    });
  }
  return { ok: true, graded: { items, score: items.filter((i) => i.correct).length, total: items.length } };
}

export type RoundFacts = {
  round1Done: boolean;
  round2Done: boolean;
  lessonsRead: number;
  lessonsTotal: number;
};

// Какой раунд доступен сейчас и почему. Второй раунд — только после курса и первой проверки.
export function roundStatus(f: RoundFacts): { canRound1: boolean; canRound2: boolean; reason: string } {
  if (!f.round1Done) return { canRound1: true, canRound2: false, reason: "Сначала пройдите первую проверку." };
  if (f.round2Done) return { canRound1: false, canRound2: false, reason: "Повторная проверка уже пройдена." };
  if (f.lessonsRead < f.lessonsTotal) {
    return { canRound1: false, canRound2: false, reason: `Сначала прочитайте мини-курс: ${f.lessonsRead} из ${f.lessonsTotal}.` };
  }
  return { canRound1: false, canRound2: true, reason: "Курс прочитан. Пройдите повторную проверку." };
}

// Изменение после курса: положительное число — стало лучше
export function improvement(round1: number, round2: number): string {
  const d = round2 - round1;
  if (d > 0) return `+${d}`;
  if (d === 0) return "без изменений";
  return `${d}`;
}
