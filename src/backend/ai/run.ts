// Единый запуск AI-функции: отправить запрос → проверить JSON → при любой ошибке вернуть резерв.
// Сайт никогда не падает из-за ИИ: в худшем случае пользователь получит честный резервный текст.
import { type AiConfig, isAiEnabled, providerLabel } from "./config";
import { askAi, AiError, type AiPrompt } from "./provider";
import { extractJson } from "./json";
import { AiFormatError } from "./schemas";

export type AiOutcome<T> =
  | { mode: "ai"; provider: string; model: string; data: T }
  | { mode: "fallback"; reason: string; data: T };

export async function runAiFeature<T>(opts: {
  config: AiConfig;
  prompt: AiPrompt;
  maxTokens: number;
  validate: (raw: unknown) => T; // проверка структуры
  fallback: () => T; // резервный режим по правилам
  blockedReason?: string | null; // например, лимит запросов исчерпан
}): Promise<AiOutcome<T>> {
  const { config, prompt, maxTokens, validate, fallback, blockedReason } = opts;

  if (blockedReason) return { mode: "fallback", reason: `${blockedReason} Показан резервный текст без ИИ.`, data: fallback() };
  if (!isAiEnabled(config)) {
    return { mode: "fallback", reason: "ИИ не подключён: не задан провайдер, ключ или модель в .env.", data: fallback() };
  }

  try {
    const text = await askAi(config, prompt, maxTokens);
    const data = validate(extractJson(text));
    return { mode: "ai", provider: providerLabel(config), model: config.model, data };
  } catch (e) {
    let reason = "Неизвестная ошибка ИИ";
    if (e instanceof AiError) reason = e.message;
    else if (e instanceof AiFormatError) reason = `Ответ модели не прошёл проверку структуры (${e.message})`;
    return { mode: "fallback", reason: `${reason}. Показан резервный текст без ИИ.`, data: fallback() };
  }
}
