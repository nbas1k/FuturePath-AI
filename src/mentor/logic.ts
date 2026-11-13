// AI Mentor: правила без ИИ. Защита активных заданий и проверка сообщения.

export const MAX_MESSAGE = 600;

const norm = (s: string) => s.toLowerCase().replace(/ё/g, "е").replace(/[^a-zа-я0-9\s]/g, " ").replace(/\s+/g, " ").trim();
const words = (s: string) => norm(s).split(" ").filter((w) => w.length >= 4);

// Похоже ли сообщение на вставленный текст активного задания (вопрос, на который человек ещё не ответил).
// Тогда наставник не отвечает на него, а предлагает объяснить тему. Проверка простая и честная: по словам вопроса.
export function quotesActiveTask(message: string, activeQuestions: string[]): boolean {
  const m = norm(message);
  const mWords = new Set(words(message));
  for (const q of activeQuestions) {
    const qn = norm(q);
    if (qn.length >= 25 && m.includes(qn.slice(0, 25))) return true;
    const qw = [...new Set(words(q))];
    if (qw.length < 4) continue;
    const hit = qw.filter((w) => mWords.has(w)).length;
    if (hit / qw.length >= 0.7) return true;
  }
  return false;
}

export const ACTIVE_TASK_REPLY =
  "Похоже, вы спрашиваете про задание, которое ещё не завершили. Готовый ответ на активное задание я не даю: иначе проверка ничего не покажет. " +
  "Зато могу объяснить тему своими словами или разобрать пример. Напишите, какое понятие в задании непонятно.";

export function validateMessage(v: unknown): { ok: true; text: string } | { ok: false; error: string } {
  if (typeof v !== "string" || !v.trim()) return { ok: false, error: "Напишите сообщение" };
  const t = v.trim();
  if (t.length > MAX_MESSAGE) return { ok: false, error: `Сообщение слишком длинное: не больше ${MAX_MESSAGE} символов` };
  return { ok: true, text: t };
}
