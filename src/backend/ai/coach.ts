// AI-наставник маршрута (этап 3): короткий разбор навыков и ошибок курса.
// Модель не меняет баллы и правильные ответы курса: она только объясняет то, что уже посчитано.
import { AiFormatError, asObject, list, text } from "./schemas";
import type { AiPrompt } from "./provider";

export type CoachOutput = {
  summary: string; // что видно по данным, 2–3 предложения
  focus: string[]; // 1–3 пункта, на что обратить внимание
  nextStep: string; // одно конкретное следующее действие
};

// Проверка структуры. Если передан allowed, пункты focus обязаны быть из этого списка
// (модель не может придумать навык, которого нет в каталоге).
export function validateCoach(raw: unknown, allowed?: string[]): CoachOutput {
  const o = asObject(raw, "наставник");
  const focus = list(o.focus, "focus", 1, 3, 200);
  if (allowed) {
    for (const f of focus) {
      if (!allowed.includes(f)) throw new AiFormatError(`focus: «${f}» нет в списке допустимых пунктов`);
    }
  }
  return {
    summary: text(o.summary, "summary", 500),
    focus,
    nextStep: text(o.nextStep, "nextStep", 300),
  };
}

// Что уходит модели для навыков: название профессии, навыки и самооценка (0 — пока нет, 1 — немного, 2 — уверенно).
export type SkillGapData = { professionTitle: string; skills: { name: string; rating: number | null }[] };

export function skillGapPrompt(d: SkillGapData): AiPrompt {
  const lines = d.skills.map((s) => `- ${s.name}: ${s.rating === null ? "не отмечено" : ["пока нет", "немного", "уверенно"][s.rating]}`);
  return {
    system:
      "Ты наставник по профориентации для школьников. Пиши по-русски, просто и доброжелательно. " +
      "Оценки навыков — это САМООЦЕНКА пользователя, а не проверенный уровень: так и пиши. " +
      "Не придумывай статистику, зарплаты и прогнозы рынка труда. Не называй конкретные платформы, курсы, учебные заведения и цены, не ссылайся на сайты. " +
      'Ответ верни ТОЛЬКО как JSON: {"summary": "2–3 предложения", "focus": ["1–3 навыка ТОЧНО из списка"], "nextStep": "одно конкретное действие"}.',
    user: `Профессия: ${d.professionTitle}\nНавыки и самооценка:\n${lines.join("\n")}\nКакие 1–3 навыка стоит развить в первую очередь и что сделать на этой неделе?`,
  };
}

// Резерв без ИИ: сначала навыки, отмеченные «пока нет», затем «немного»
export function skillGapFallback(d: SkillGapData): CoachOutput {
  const weakest = d.skills.filter((s) => s.rating === 0);
  const medium = d.skills.filter((s) => s.rating === 1);
  const unrated = d.skills.filter((s) => s.rating === null);
  const pool = [...weakest, ...medium, ...unrated].slice(0, 3);
  const focus = (pool.length ? pool : d.skills.slice(0, 1)).map((s) => s.name);
  return {
    summary: `По вашей самооценке видно, что стоит развить: ${focus.join(", ")}. Это правило сайта, а не ответ ИИ.`,
    focus,
    nextStep: "Выберите один навык из списка и сделайте одно маленькое задание из плана на 30 дней.",
  };
}

// Что уходит модели для курса: только вопросы, которые пользователь ответил неверно, и итоги
export type TrainingData = {
  professionTitle: string;
  kind: "round1" | "round2" | "progress";
  score: number | null;
  total: number;
  scoreBefore: number | null;
  wrong: { question: string; chosen: string; correct: string; explanation: string }[];
};

export function trainingPrompt(d: TrainingData): AiPrompt {
  const wrong = d.wrong.map((w, i) => `${i + 1}. Вопрос: ${w.question}\n   Ответ пользователя: ${w.chosen}\n   Правильный ответ: ${w.correct}\n   Пояснение: ${w.explanation}`);
  return {
    system:
      "Ты наставник по профориентации для школьников. Пиши по-русски, коротко и понятно. " +
      "Опирайся только на данные ниже. Баллы и правильные ответы уже определены: не спорь с ними и не придумывай новых. " +
      "Не делай выводов о способностях человека. Не придумывай статистику, ссылки, платформы, курсы и цены. " +
      'Ответ верни ТОЛЬКО как JSON: {"summary": "2–3 предложения", "focus": ["1–3 темы, которые стоит повторить"], "nextStep": "одно действие"}.',
    user:
      `Профессия: ${d.professionTitle}\nЭтап: ${d.kind === "progress" ? "прогресс" : d.kind === "round1" ? "первая проверка" : "повторная проверка"}\n` +
      (d.score === null ? "" : `Результат: ${d.score} из ${d.total}\n`) +
      (d.scoreBefore === null ? "" : `До курса было: ${d.scoreBefore} из ${d.total}\n`) +
      (wrong.length ? `Ошибки:\n${wrong.join("\n")}` : "Ошибок нет.") +
      "\nЧто повторить и что сделать дальше?",
  };
}

// Резерв без ИИ: темы ошибок и правило-пояснение
export function trainingFallback(d: TrainingData): CoachOutput {
  const topics = d.wrong.map((w) => (w.question.length > 120 ? w.question.slice(0, 117) + "…" : w.question)).slice(0, 3);
  const score = d.score === null ? "" : `Верно ${d.score} из ${d.total}. `;
  const summary = d.wrong.length
    ? `${score}Повторите темы, где были ошибки. Это правило сайта, а не ответ ИИ.`
    : `${score}Все ответы верные. Это правило сайта, а не ответ ИИ.`;
  return {
    summary,
    focus: topics.length ? topics : ["Закрепите то, что уже получилось"],
    nextStep: d.wrong.length
      ? "Перечитайте урок по теме ошибки и попробуйте объяснить её своими словами."
      : "Переходите к следующему шагу пути: выполните задание из плана на 30 дней.",
  };
}
