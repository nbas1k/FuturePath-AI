import { type AiConfig, isAiEnabled } from "./config";

export type AiPrompt = { system: string; user: string };

// Ошибки ИИ превращаем в понятные коды: сайт не падает, а показывает резервный режим.
export class AiError extends Error {
  constructor(public code: "disabled" | "timeout" | "auth" | "rate" | "upstream" | "empty", message: string) {
    super(message);
  }
}

// Запрос к провайдеру с таймаутом. В ошибки не попадают ни ключ, ни тело ответа (только код статуса).
async function post(url: string, headers: Record<string, string>, body: unknown, timeoutMs: number): Promise<any> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body), signal: ctrl.signal });
    if (res.status === 401 || res.status === 403) throw new AiError("auth", "Ключ API не принят провайдером");
    if (res.status === 429) throw new AiError("rate", "Провайдер ИИ ограничил запросы");
    if (!res.ok) throw new AiError("upstream", `Провайдер вернул ошибку ${res.status}`);
    return await res.json();
  } catch (e) {
    if (e instanceof AiError) throw e;
    if ((e as Error).name === "AbortError") throw new AiError("timeout", "Провайдер ИИ не ответил вовремя");
    throw new AiError("upstream", "Не удалось связаться с провайдером ИИ");
  } finally {
    clearTimeout(timer);
  }
}

// Единственная точка, где сервер обращается к ИИ. Ключ берётся из config (из .env).
// maxTokens — лимит длины ответа модели (для дорожной карты на 30 дней нужно больше).
export async function askAi(config: AiConfig, prompt: AiPrompt, maxTokens = 700): Promise<string> {
  if (!isAiEnabled(config)) throw new AiError("disabled", "ИИ не настроен");
  let text: unknown;
  if (config.provider === "anthropic") {
    const data = await post(
      `${config.baseUrl || "https://api.anthropic.com"}/v1/messages`,
      { "x-api-key": config.apiKey, "anthropic-version": "2023-06-01" },
      { model: config.model, max_tokens: maxTokens, system: prompt.system, messages: [{ role: "user", content: prompt.user }] },
      config.timeoutMs,
    );
    text = data?.content?.find?.((b: any) => b.type === "text")?.text;
  } else {
    // OpenAI-compatible chat completions.
    const data = await post(
      `${config.baseUrl || "https://api.openai.com/v1"}/chat/completions`,
      { authorization: `Bearer ${config.apiKey}` },
      { model: config.model, ...(config.provider === "groq" ? { max_completion_tokens: maxTokens } : { max_tokens: maxTokens }), messages: [{ role: "system", content: prompt.system }, { role: "user", content: prompt.user }] },
      config.timeoutMs,
    );
    text = data?.choices?.[0]?.message?.content;
  }
  if (typeof text !== "string" || !text.trim()) throw new AiError("empty", "ИИ вернул пустой ответ");
  return text.trim();
}
