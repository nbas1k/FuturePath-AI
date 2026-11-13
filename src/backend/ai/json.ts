import { AiFormatError } from "./schemas";

// Достаёт JSON-объект из ответа модели.
// Модель может вернуть чистый JSON, JSON в блоке ```json ... ```, или JSON с лишним текстом вокруг.
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start < 0 || end <= start) throw new AiFormatError("В ответе модели не найден JSON-объект");
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    throw new AiFormatError("JSON в ответе модели не читается");
  }
}
