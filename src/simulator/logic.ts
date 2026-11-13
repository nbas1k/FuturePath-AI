// Job Simulator: правила прохождения. Чистые функции, без базы и без ИИ.
import { SIM_START, METRIC_LABELS, type Effects, type SimScenario, type SimSituation } from "@/data/simulator";

const clamp = (n: number) => Math.max(0, Math.min(10, n));

export function applyEffects(m: Effects, e: Effects): Effects {
  return { quality: clamp(m.quality + e.quality), time: clamp(m.time + e.time), trust: clamp(m.trust + e.trust) };
}

// Считает метрики по списку сделанных выборов. Некорректный выбор — ошибка.
export function metricsFromChoices(scenario: SimScenario, choices: number[]): { ok: true; metrics: Effects } | { ok: false; error: string } {
  if (choices.length > scenario.situations.length) return { ok: false, error: "Выборов больше, чем ситуаций" };
  let m: Effects = { ...SIM_START };
  for (let i = 0; i < choices.length; i++) {
    const opt = scenario.situations[i].options[choices[i]];
    if (!Number.isInteger(choices[i]) || !opt) return { ok: false, error: `Неверный выбор в ситуации ${i + 1}` };
    m = applyEffects(m, opt.effects);
  }
  return { ok: true, metrics: m };
}

// Лучший вариант ситуации — с наибольшей суммой эффектов (при равенстве — первый)
export function bestOption(s: SimSituation): number {
  const sums = s.options.map((o) => o.effects.quality + o.effects.time + o.effects.trust);
  return sums.indexOf(Math.max(...sums));
}

export type Verdict = { level: "strong" | "ok" | "weak"; text: string; weakest: keyof Effects };

// Итог по правилам: общий уровень и слабая метрика. Не оценивает человека, а описывает решения.
export function summarize(m: Effects): Verdict {
  const total = m.quality + m.time + m.trust;
  const entries = Object.entries(m) as [keyof Effects, number][];
  const weakest = entries.sort((a, b) => a[1] - b[1])[0][0];
  const level: Verdict["level"] = total >= 18 ? "strong" : total >= 14 ? "ok" : "weak";
  const base =
    level === "strong" ? "В целом решения этого дня дали хороший баланс качества, сроков и доверия."
    : level === "ok" ? "Решения в целом разумные, но в некоторых ситуациях можно было выбрать лучше."
    : "В этом дне несколько решений дорого обошлись команде. Разберите их ниже.";
  // Говорим «просела» только если метрика действительно упала ниже стартового значения
  const weakNote = m[weakest] < SIM_START[weakest]
    ? `Больше всего просела метрика «${METRIC_LABELS[weakest]}» (${m[weakest]} из 10).`
    : `Самая низкая метрика: «${METRIC_LABELS[weakest]}» (${m[weakest]} из 10).`;
  return { level, text: `${base} ${weakNote}`, weakest };
}
