// Human + AI Challenge: просим ИИ решить задания. ИИ НЕ знает правильных ответов:
// мы сравним его выбор с проверенным ответом сами. ИИ может ошибаться, и это часть задания.
import { AiFormatError, asObject, text } from "./schemas";
import type { AiPrompt } from "./provider";
import type { ChallengeTask } from "@/data/challenge";

export type AiHelpItem = { taskId: string; choice: number; why: string };

export function challengePrompt(tasks: ChallengeTask[]): AiPrompt {
  const body = tasks
    .map((t) => `Задание ${t.id}: ${t.question}\n` + t.options.map((o, i) => `  ${i}. ${o}`).join("\n"))
    .join("\n\n");
  return {
    system:
      "Ты решаешь короткие учебные задания. Для каждого задания выбери ОДИН вариант и коротко объясни выбор (до 200 символов). " +
      "Не придумывай статистику, ссылки и цифры, которых нет в задании. " +
      'Ответ верни ТОЛЬКО как JSON: {"answers":[{"taskId":"id задания","choice":номер варианта начиная с 0,"why":"краткое объяснение"}]}.',
    user: body,
  };
}

// Проверка ответа ИИ: ровно по одному ответу на каждое задание, номер варианта в диапазоне
export function validateAiHelp(raw: unknown, tasks: ChallengeTask[]): AiHelpItem[] {
  const o = asObject(raw, "ответы ИИ");
  if (!Array.isArray(o.answers)) throw new AiFormatError("answers: ожидался список");
  if (o.answers.length !== tasks.length) throw new AiFormatError(`answers: нужно ${tasks.length} ответов`);
  const result: AiHelpItem[] = [];
  for (const t of tasks) {
    const item = o.answers.find((a: unknown) => a && typeof a === "object" && (a as Record<string, unknown>).taskId === t.id);
    if (!item) throw new AiFormatError(`нет ответа на задание ${t.id}`);
    const rec = item as Record<string, unknown>;
    if (!Number.isInteger(rec.choice) || (rec.choice as number) < 0 || (rec.choice as number) >= t.options.length) {
      throw new AiFormatError(`задание ${t.id}: неверный номер варианта`);
    }
    result.push({ taskId: t.id, choice: rec.choice as number, why: text(rec.why, `задание ${t.id}: why`, 250) });
  }
  return result;
}
