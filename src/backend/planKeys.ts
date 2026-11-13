// Ключи планов и id заданий. Файл без базы данных, поэтому его можно тестировать отдельно.
// Два вида планов:
//  - обычный план: "v1:it+design+business" (строится правилами по топ-3 направлениям);
//  - AI-дорожная карта: "ai:<id записи>" (id уникален у каждой созданной карты).
const AI_PREFIX = "ai:";

export function aiPlanKey(recordId: string): string {
  return AI_PREFIX + recordId;
}

// Возвращает id записи, если ключ — AI-план; иначе null
export function parseAiPlanKey(key: unknown): string | null {
  if (typeof key !== "string" || !key.startsWith(AI_PREFIX)) return null;
  const id = key.slice(AI_PREFIX.length);
  return /^[a-z0-9]{8,40}$/i.test(id) ? id : null;
}

// Задания AI-карты: d1 … d30 (без нулей и без лишних символов)
export function isRoadmapTaskId(id: unknown): boolean {
  return typeof id === "string" && /^d([1-9]|[12]\d|30)$/.test(id);
}
