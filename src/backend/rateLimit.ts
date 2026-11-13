// Ограничение частоты запросов (rate limit) в памяти сервера. Подходит для MVP.
// Ограничения:
//  - счётчики сбрасываются при перезапуске сервера;
//  - не общие для нескольких серверов (для этого нужна внешняя база, например Redis).
// Память не растёт бесконечно: старые ключи удаляются, а общее число ключей ограничено.

const MAX_KEYS = 10_000; // максимум разных ключей (например, IP) в памяти
const SWEEP_EVERY = 500; // раз в сколько вызовов чистить устаревшие записи

type Bucket = { times: number[]; windowMs: number };
const buckets = new Map<string, Bucket>();
let calls = 0;

// Удаляет записи, у которых все запросы уже вышли из окна времени
function sweep(now: number) {
  for (const [key, bucket] of buckets) {
    bucket.times = bucket.times.filter((t) => t > now - bucket.windowMs);
    if (bucket.times.length === 0) buckets.delete(key);
  }
}

// Проверяет, можно ли выполнить запрос. limit — сколько запросов разрешено за windowMs.
export function checkRateLimit(
  key: string,
  limit: number,
  now = Date.now(),
  windowMs = 60 * 60 * 1000,
): { ok: boolean; retryAfterSec: number } {
  calls++;
  if (calls % SWEEP_EVERY === 0) sweep(now);

  const bucket = buckets.get(key) ?? { times: [], windowMs };
  bucket.windowMs = windowMs;
  bucket.times = bucket.times.filter((t) => t > now - windowMs);

  if (bucket.times.length >= limit) {
    buckets.set(key, bucket);
    return { ok: false, retryAfterSec: Math.ceil((bucket.times[0] + windowMs - now) / 1000) };
  }

  bucket.times.push(now);
  buckets.set(key, bucket);

  // Защита памяти: если ключей слишком много, удаляем самые старые
  if (buckets.size > MAX_KEYS) {
    const extra = buckets.size - MAX_KEYS;
    let removed = 0;
    for (const k of buckets.keys()) {
      if (removed++ >= extra) break;
      buckets.delete(k);
    }
  }
  return { ok: true, retryAfterSec: 0 };
}

// Для тестов и диагностики
export function rateLimitKeyCount(): number {
  return buckets.size;
}

export function resetRateLimit() {
  buckets.clear();
  calls = 0;
}
