// Human + AI Challenge: проверка и сравнение. Чистые функции, без базы и без ИИ.
import type { ChallengeTask } from "@/data/challenge";

export type GradedTask = { taskId: string; answer: number; correct: boolean; explanation: string; correctText: string };
export type GradedSet = { items: GradedTask[]; score: number; total: number };

// Проверяет ответы на ВСЕ задания набора. Подделанный индекс или пропуск — ошибка.
export function gradeSet(tasks: ChallengeTask[], answers: Record<string, unknown>): { ok: true; graded: GradedSet } | { ok: false; error: string } {
  const items: GradedTask[] = [];
  for (const t of tasks) {
    const a = answers[t.id];
    if (!Number.isInteger(a) || (a as number) < 0 || (a as number) >= t.options.length) {
      return { ok: false, error: "Ответьте на все вопросы, прежде чем проверять" };
    }
    const answer = a as number;
    items.push({ taskId: t.id, answer, correct: answer === t.correct, explanation: t.explanation, correctText: t.options[t.correct] });
  }
  return { ok: true, graded: { items, score: items.filter((i) => i.correct).length, total: items.length } };
}

// Выбор ИИ и совпал ли он с проверенным правильным ответом
export type AiChoice = { taskId: string; choice: number; why: string; correct: boolean };

export type Comparison = {
  soloScore: number;
  withAiScore: number;
  total: number;
  aiScore: number; // сколько заданий ИИ решил верно
  // как пользователь обошёлся с подсказками ИИ
  followedRightAi: number; // принял верную подсказку
  followedWrongAi: number; // принял неверную подсказку (доверился ИИ зря)
  ignoredRightAi: number; // отверг верную подсказку
  correctedWrongAi: number; // поймал ошибку ИИ
  verdict: string;
};

// Сравнивает три результата: сам, с подсказками ИИ и сам ИИ.
export function compareChallenge(solo: GradedSet, withAi: GradedSet, ai: AiChoice[]): Comparison {
  const aiById = new Map(ai.map((a) => [a.taskId, a]));
  let followedRightAi = 0, followedWrongAi = 0, ignoredRightAi = 0, correctedWrongAi = 0;
  for (const it of withAi.items) {
    const hint = aiById.get(it.taskId);
    if (!hint) continue;
    const followed = it.answer === hint.choice;
    if (hint.correct) {
      if (followed) followedRightAi++; else ignoredRightAi++;
    } else if (followed) followedWrongAi++; else correctedWrongAi++;
  }
  const aiScore = ai.filter((a) => a.correct).length;
  return {
    soloScore: solo.score,
    withAiScore: withAi.score,
    total: withAi.total,
    aiScore,
    followedRightAi,
    followedWrongAi,
    ignoredRightAi,
    correctedWrongAi,
    verdict: verdictText(solo.score, withAi.score, followedWrongAi, correctedWrongAi, ignoredRightAi),
  };
}

// Короткое честное объяснение по правилам (без ИИ). Не оценивает способности человека.
function verdictText(solo: number, withAi: number, followedWrong: number, correctedWrong: number, ignoredRight: number): string {
  const parts: string[] = [];
  if (withAi > solo) parts.push("С подсказками ИИ результат получился лучше, чем самостоятельно.");
  else if (withAi === solo) parts.push("С подсказками ИИ результат такой же, как самостоятельно.");
  else parts.push("С подсказками ИИ результат получился хуже, чем самостоятельно.");
  if (followedWrong > 0) parts.push(`Вы приняли неверных подсказок ИИ: ${followedWrong}. ИИ может ошибаться, поэтому ответ нужно проверять.`);
  if (correctedWrong > 0) parts.push(`Вы заметили ошибок ИИ: ${correctedWrong}. Это полезный навык: не принимать ответ на веру.`);
  if (ignoredRight > 0) parts.push(`Вы отвергли верных подсказок: ${ignoredRight}. Иногда ИИ прав, и стоит прислушиваться к аргументам.`);
  return parts.join(" ");
}
