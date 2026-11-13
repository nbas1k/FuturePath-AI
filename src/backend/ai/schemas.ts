// Проверка структуры ответов модели ИИ.
// Правило: всё, что не совпадает с ожидаемой формой, отбрасывается и заменяется резервным режимом.
// Модель НЕ может менять баллы теста: сюда не попадают и не используются поля результата.

// Ошибка «ответ модели не прошёл проверку»
export class AiFormatError extends Error {}

export type AnalysisOutput = {
  summary: string; // краткое резюме
  strengths: string[]; // сильные стороны
  interests: string[]; // интересы, которые видны из результата
  skills: string[]; // навыки, которые стоит развивать
  missingSkills: string[]; // недостающие компетенции для выбранных профессий (качественно)
  resources: string[]; // виды образовательных ресурсов (без ссылок и без выдуманных названий курсов)
};

export type RoadmapOutput = {
  days: { day: number; title: string; task: string }[]; // ровно 30 дней по порядку
};

export type SimulatorOutput = {
  summary: string; // как ИИ может изменить профессию (качественно)
  automates: string[]; // что ИИ может взять на себя
  humanSkills: string[]; // что останется важным для человека
  advice: string; // что можно сделать сейчас
};

// Фразы, которые запрещены в ответе модели: выдуманные цифры рынка, зарплаты, «прогнозы как факты».
// Ссылки (https://, www.) тоже запрещены: модель могла бы выдумать адрес.
const FORBIDDEN = /%|процент[а-я]*\s+(рынк|спрос|безработ)|зарплат|тенге|₸|\$|прогноз(ируется|ы)?\s+рынк|безработиц|https?:\/\/|www\./i;

export function asObject(v: unknown, where: string): Record<string, unknown> {
  if (!v || typeof v !== "object" || Array.isArray(v)) throw new AiFormatError(`${where}: ожидался объект`);
  return v as Record<string, unknown>;
}

// Строка: обрезаем пробелы, проверяем длину (лишнее обрезаем), запрещённые фразы — ошибка
export function text(v: unknown, where: string, max: number): string {
  if (typeof v !== "string") throw new AiFormatError(`${where}: ожидалась строка`);
  const t = v.trim();
  if (!t) throw new AiFormatError(`${where}: пустая строка`);
  if (FORBIDDEN.test(t)) throw new AiFormatError(`${where}: похоже на рыночные данные или цифры, которых нет в исходных данных`);
  return t.length > max ? t.slice(0, max) : t;
}

export function list(v: unknown, where: string, min: number, max: number, itemMax: number): string[] {
  if (!Array.isArray(v)) throw new AiFormatError(`${where}: ожидался список`);
  if (v.length < min || v.length > max) throw new AiFormatError(`${where}: нужно от ${min} до ${max} пунктов`);
  return v.map((item, i) => text(item, `${where}[${i}]`, itemMax));
}

export function validateAnalysis(raw: unknown): AnalysisOutput {
  const o = asObject(raw, "анализ");
  return {
    summary: text(o.summary, "summary", 800),
    strengths: list(o.strengths, "strengths", 2, 5, 200),
    interests: list(o.interests, "interests", 1, 5, 200),
    skills: list(o.skills, "skills", 2, 6, 200),
    missingSkills: list(o.missingSkills, "missingSkills", 2, 5, 200),
    resources: list(o.resources, "resources", 1, 4, 200),
  };
}
export function validateRoadmap(raw: unknown): RoadmapOutput {
  const o = asObject(raw, "дорожная карта");
  if (!Array.isArray(o.days)) throw new AiFormatError("days: ожидался список");
  if (o.days.length !== 30) throw new AiFormatError(`days: нужно ровно 30 дней, пришло ${o.days.length}`);
  const days = o.days.map((d, i) => {
    const day = asObject(d, `days[${i}]`);
    // Номера должны идти подряд: 1, 2, …, 30
    if (day.day !== i + 1) throw new AiFormatError(`days[${i}]: номер дня должен быть ${i + 1}`);
    return {
      day: i + 1,
      title: text(day.title, `days[${i}].title`, 120),
      task: text(day.task, `days[${i}].task`, 400),
    };
  });
  return { days };
}

export function validateSimulator(raw: unknown): SimulatorOutput {
  const o = asObject(raw, "симулятор");
  return {
    summary: text(o.summary, "summary", 800),
    automates: list(o.automates, "automates", 1, 6, 200),
    humanSkills: list(o.humanSkills, "humanSkills", 2, 6, 200),
    advice: text(o.advice, "advice", 600),
  };
}
