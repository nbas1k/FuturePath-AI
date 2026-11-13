// Future Career Scenarios: качественные сценарии развития профессии. Это рассуждение модели, а не прогноз и не факт.
import { AiFormatError, asObject, list, text } from "./schemas";
import type { AiPrompt } from "./provider";
import type { Profession } from "@/data/professions";

export const SCENARIO_NAMES = ["Быстрая автоматизация", "Постепенные изменения", "Усиление человека с ИИ"] as const;

export type Scenario = { name: string; description: string; signals: string[]; actions: string[] };
export type ScenariosOutput = { scenarios: Scenario[] };

export function scenariosPrompt(p: Profession): AiPrompt {
  return {
    system:
      "Ты помогаешь школьникам и студентам думать о будущем профессий. Опиши ТРИ возможных сценария развития профессии к 2030–2035 годам. " +
      `Названия сценариев строго такие: ${SCENARIO_NAMES.join("; ")}. ` +
      "Это воображаемые сценарии для размышления, а не прогнозы и не факты. Не используй цифры, проценты, зарплаты, названия компаний и ссылки. " +
      "Пиши по-русски, просто. Для каждого: description (до 350 символов), signals (2–3 признака, по которым можно заметить такой сценарий), actions (2–3 действия, которые человек может сделать уже сейчас). " +
      'Ответ верни ТОЛЬКО как JSON: {"scenarios":[{"name":"...","description":"...","signals":["..."],"actions":["..."]}]}.',
    user:
      `Профессия: ${p.title}\nОписание: ${p.description}\nВлияние ИИ (из каталога): ${p.aiImpact}\n` +
      `ИИ может автоматизировать: ${p.aiAutomates.join("; ")}\nДля человека важно: ${p.humanSkills.join("; ")}`,
  };
}

export function validateScenarios(raw: unknown): ScenariosOutput {
  const o = asObject(raw, "сценарии");
  const arr = o.scenarios;
  if (!Array.isArray(arr) || arr.length !== SCENARIO_NAMES.length) throw new AiFormatError(`scenarios: нужно ${SCENARIO_NAMES.length} сценария`);
  const scenarios = SCENARIO_NAMES.map((name) => {
    const it = arr.find((x: unknown) => x && typeof x === "object" && (x as Record<string, unknown>).name === name) as Record<string, unknown> | undefined;
    if (!it) throw new AiFormatError(`нет сценария «${name}»`);
    return { name, description: text(it.description, `${name}.description`, 450), signals: list(it.signals, `${name}.signals`, 2, 3, 200), actions: list(it.actions, `${name}.actions`, 2, 3, 200) };
  });
  // Проверка цифр: годы горизонта 2020–2049 разрешены, остальные числа отклоняются.
  // Цифры запрещены, кроме годов горизонта (2020–2049): «2030–2035» — это не статистика.
  // Проценты, суммы и любые другие числа по-прежнему отклоняются.
  const withoutYears = JSON.stringify(scenarios).replace(/\b20[2-4]\d\b/g, "");
  if (/\d/.test(withoutYears)) throw new AiFormatError("в сценариях не должно быть цифр, кроме годов горизонта");
  return { scenarios };
}
