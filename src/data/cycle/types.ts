// Единый цикл обучения: цель → будущее профессии → диагностика → план → обучение → человек + ИИ → повторная проверка → доказательство.
// Для каждого навыка по 3 критерия. У каждого критерия 4 сопоставимых задания и мини-урок:
//  diag — начальная диагностика (без ИИ), practice — упражнение для пробела, ai — задание с подсказкой ИИ, retest — повторная независимая проверка.
// Задания diag и retest проверяют ОДИН И ТОТ ЖЕ критерий, поэтому результаты сравнимы по одинаковым критериям.
// Правильные ответы лежат только на сервере.

export type CycleTask = { id: string; skill: string; question: string; options: string[]; correct: number; explanation: string };

export type CycleCriterion = {
  id: string;
  name: string; // понятное название критерия
  lesson: string; // мини-урок для упражнения (2–3 предложения)
  diag: CycleTask;
  practice: CycleTask;
  ai: CycleTask;
  retest: CycleTask;
};

export type CycleSkill = { skill: string; criteria: CycleCriterion[] };
export type CycleContent = { professionId: string; skills: CycleSkill[] };

// Короткая запись задания: id, навык, вопрос, варианты, номер верного, пояснение
export const T = (id: string, skill: string, question: string, options: string[], correct: number, explanation: string): CycleTask => ({ id, skill, question, options, correct, explanation });

// Критерий из четырёх заданий. Идентификаторы заданий строятся из id критерия.
export function crit(id: string, skill: string, name: string, lesson: string, d: [string, string[], number, string], p: [string, string[], number, string], a: [string, string[], number, string], r: [string, string[], number, string]): CycleCriterion {
  return {
    id, name, lesson,
    diag: T(`${id}-d`, skill, ...d),
    practice: T(`${id}-e`, skill, ...p),
    ai: T(`${id}-a`, skill, ...a),
    retest: T(`${id}-r`, skill, ...r),
  };
}
