// Настройки ИИ читаются только из переменных окружения (файл .env на сервере). Секреты не попадают в код и в браузер.
//
// Провайдеры:
//  - "antigravity" — локальный прокси Antigravity Tools (формат OpenAI chat/completions).
//      Переменные: ANTIGRAVITY_API_URL, ANTIGRAVITY_API_KEY, ANTIGRAVITY_MODEL.
//  - "anthropic", "openai", "openai-compatible" — переменные AI_API_KEY, AI_MODEL, AI_BASE_URL.
//  - "none" — ИИ выключен, сайт работает в резервном режиме по правилам.
export type ProviderName = "none" | "anthropic" | "openai" | "openai-compatible" | "antigravity" | "groq";

export type AiConfig = {
  provider: ProviderName;
  apiKey: string;
  model: string;
  baseUrl: string;
  rateLimitPerHour: number;
  timeoutMs: number; // ожидание ответа модели
};

// Адрес по умолчанию для локальной разработки: прокси на вашем компьютере
export const ANTIGRAVITY_DEFAULT_URL = "http://127.0.0.1:8045/v1";
// Адрес Groq API (формат OpenAI chat/completions)
export const GROQ_DEFAULT_URL = "https://api.groq.com/openai/v1";

export function getAiConfig(env: NodeJS.ProcessEnv = process.env): AiConfig {
  const raw = (env.AI_PROVIDER ?? "none").trim().toLowerCase();
  const known: ProviderName[] = ["none", "anthropic", "openai", "openai-compatible", "antigravity", "groq"];
  const provider = (known as string[]).includes(raw) ? (raw as ProviderName) : "none";
  const timeoutMs = Math.min(120_000, Math.max(5_000, Number(env.AI_TIMEOUT_MS) || 60_000));
  const rateLimitPerHour = Math.max(1, Number(env.AI_RATE_LIMIT_PER_HOUR) || 40);

  // Groq: облачный API в формате OpenAI. Ключ GROQ_API_KEY хранится только на сервере (.env или переменные Vercel).
  if (provider === "groq") {
    return {
      provider,
      apiKey: (env.GROQ_API_KEY ?? "").trim(),
      model: (env.GROQ_MODEL ?? "").trim(),
      baseUrl: ((env.GROQ_API_URL ?? "").trim() || GROQ_DEFAULT_URL).replace(/\/$/, ""),
      rateLimitPerHour,
      timeoutMs,
    };
  }

  if (provider === "antigravity") {
    return {
      provider,
      apiKey: (env.ANTIGRAVITY_API_KEY ?? "").trim(),
      model: (env.ANTIGRAVITY_MODEL ?? "").trim(),
      baseUrl: ((env.ANTIGRAVITY_API_URL ?? "").trim() || ANTIGRAVITY_DEFAULT_URL).replace(/\/$/, ""),
      rateLimitPerHour,
      timeoutMs,
    };
  }
  return {
    provider,
    apiKey: (env.AI_API_KEY ?? "").trim(),
    model: (env.AI_MODEL ?? "").trim(),
    baseUrl: (env.AI_BASE_URL ?? "").trim().replace(/\/$/, ""),
    rateLimitPerHour,
    timeoutMs,
  };
}

// ИИ считается включённым, только если выбран провайдер И есть ключ И модель.
export function isAiEnabled(c: AiConfig): boolean {
  if (c.provider === "none" || !c.apiKey || !c.model) return false;
  if (c.provider === "openai-compatible" && !c.baseUrl) return false;
  if (c.provider === "antigravity" && !c.baseUrl) return false;
  if (c.provider === "groq" && !c.baseUrl) return false;
  return true;
}

// Короткое имя для интерфейса: не показываем ключ и адрес
export function providerLabel(c: AiConfig): string {
  if (c.provider === "groq") return "Groq API";
  return c.provider === "antigravity" ? "Antigravity Tools" : c.provider;
}
