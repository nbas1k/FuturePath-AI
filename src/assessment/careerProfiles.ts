// Профили профессий для сопоставления. ВАЖНО: пока это профили КАТЕГОРИЙ (18 штук) плюс небольшая
// профессиональная поправка из направлений каталога (см. professionProfile). Это экспертная заготовка,
// а не результат исследования или валидации. Индивидуальные профили 100 профессий появятся на Этапе 4.
import type { CategoryId } from "@/data/categories";
import { effectiveDirections, type Profession } from "@/data/professions";
import { LETTERS, SKILL_DIMS, CONDITIONS, type Letter, type SkillDim, type Condition } from "./items";
import { EXTRA_BY_ID } from "@/catalog/extras";

export type CareerProfile = {
  riasec: Record<Letter, number>; // 0..3 — насколько тип важен для профессии
  conditions: Record<Condition, number>; // 1..5 — типичные условия работы
  needs: Record<SkillDim, number>; // 0..1 — насколько навык важен
};

const r = (R: number, I: number, A: number, S: number, E: number, C: number): Record<Letter, number> => ({ R, I, A, S, E, C });
const c = (people: number, field: number, variety: number, autonomy: number, pace: number): Record<Condition, number> => ({ people, field, variety, autonomy, pace });
const n = (numeric: number, logic: number, verbal: number, people: number, tech: number, creative: number, organize: number, handson: number, research: number): Record<SkillDim, number> =>
  ({ numeric, logic, verbal, people, tech, creative, organize, handson, research });

export const CATEGORY_PROFILES: Record<CategoryId, CareerProfile> = {
  it: { riasec: r(1, 3, 1, 0, 1, 2), conditions: c(2, 1, 3, 4, 3), needs: n(0.7, 0.9, 0.4, 0.3, 0.9, 0.5, 0.6, 0.2, 0.6) },
  ai_data: { riasec: r(0, 3, 1, 0, 1, 2), conditions: c(2, 1, 3, 4, 3), needs: n(1, 0.9, 0.5, 0.3, 0.9, 0.5, 0.6, 0.1, 0.8) },
  cyber: { riasec: r(2, 3, 0, 0, 0, 2), conditions: c(2, 2, 4, 3, 5), needs: n(0.6, 0.9, 0.4, 0.3, 1, 0.4, 0.7, 0.3, 0.6) },
  engineering: { riasec: r(3, 3, 0, 0, 0, 1), conditions: c(2, 4, 3, 3, 3), needs: n(0.8, 0.8, 0.4, 0.4, 0.8, 0.5, 0.6, 0.7, 0.5) },
  medicine: { riasec: r(1, 3, 0, 3, 0, 1), conditions: c(5, 3, 3, 2, 4), needs: n(0.5, 0.7, 0.6, 1, 0.4, 0.3, 0.7, 0.6, 0.7) },
  business: { riasec: r(0, 0, 0, 1, 3, 2), conditions: c(4, 2, 4, 4, 4), needs: n(0.6, 0.6, 0.8, 0.8, 0.4, 0.6, 0.9, 0.1, 0.4) },
  finance: { riasec: r(0, 2, 0, 0, 2, 3), conditions: c(3, 1, 2, 3, 3), needs: n(1, 0.8, 0.6, 0.5, 0.5, 0.3, 0.9, 0, 0.5) },
  design: { riasec: r(1, 1, 3, 0, 1, 0), conditions: c(3, 1, 5, 5, 3), needs: n(0.2, 0.4, 0.6, 0.5, 0.6, 1, 0.6, 0.4, 0.4) },
  media: { riasec: r(0, 0, 3, 1, 2, 0), conditions: c(4, 2, 5, 4, 5), needs: n(0.2, 0.4, 1, 0.7, 0.5, 0.9, 0.6, 0.2, 0.5) },
  education: { riasec: r(0, 1, 1, 3, 1, 1), conditions: c(5, 1, 3, 3, 3), needs: n(0.4, 0.5, 1, 1, 0.4, 0.6, 0.8, 0.2, 0.5) },
  law: { riasec: r(0, 2, 0, 1, 2, 2), conditions: c(4, 1, 3, 3, 4), needs: n(0.3, 0.9, 1, 0.7, 0.3, 0.4, 0.8, 0, 0.7) },
  architecture: { riasec: r(2, 2, 3, 0, 0, 1), conditions: c(3, 3, 3, 4, 3), needs: n(0.6, 0.7, 0.5, 0.5, 0.7, 0.9, 0.7, 0.5, 0.5) },
  logistics: { riasec: r(2, 0, 0, 0, 2, 2), conditions: c(3, 3, 3, 3, 5), needs: n(0.6, 0.7, 0.5, 0.5, 0.6, 0.3, 1, 0.4, 0.3) },
  ecology: { riasec: r(2, 3, 0, 1, 0, 0), conditions: c(3, 5, 3, 4, 2), needs: n(0.5, 0.6, 0.5, 0.4, 0.5, 0.4, 0.5, 0.6, 1) },
  agri: { riasec: r(3, 2, 0, 0, 0, 1), conditions: c(2, 5, 3, 4, 2), needs: n(0.5, 0.5, 0.3, 0.3, 0.5, 0.3, 0.6, 0.9, 0.6) },
  production: { riasec: r(3, 1, 0, 0, 0, 2), conditions: c(2, 4, 2, 2, 4), needs: n(0.5, 0.6, 0.3, 0.4, 0.7, 0.2, 0.8, 0.9, 0.3) },
  tourism: { riasec: r(0, 0, 1, 3, 2, 1), conditions: c(5, 4, 5, 3, 4), needs: n(0.3, 0.3, 0.8, 1, 0.3, 0.6, 0.8, 0.3, 0.3) },
  science: { riasec: r(1, 3, 1, 0, 0, 1), conditions: c(2, 3, 3, 4, 2), needs: n(0.7, 0.8, 0.6, 0.3, 0.6, 0.5, 0.6, 0.4, 1) },
  social: { riasec: r(0, 1, 1, 3, 1, 0), conditions: c(5, 2, 4, 3, 3), needs: n(0.2, 0.4, 0.9, 1, 0.2, 0.5, 0.6, 0.1, 0.5) },
};

// Как 6 направлений старого теста сдвигают профиль конкретной профессии (даёт различия внутри категории).
const DIRECTION_RIASEC: Record<string, Record<Letter, number>> = {
  it: r(0.5, 2, 0, 0, 0, 1),
  engineering: r(2, 1.5, 0, 0, 0, 0),
  medicine: r(0, 1.5, 0, 2, 0, 0),
  design: r(0, 0, 3, 0, 0, 0),
  business: r(0, 0, 0, 0, 2.5, 1),
  education: r(0, 0, 0.5, 2.5, 0, 0),
};

const DIRECTION_SHARE = 0.3; // доля направлений в итоговом профиле профессии
const HOLLAND_SHARE = 0.5; // доля индивидуального кода Холланда (Этап 4) против профиля категории и направлений

export function professionProfile(p: Profession): CareerProfile {
  const base = CATEGORY_PROFILES[p.category];
  const dirs = effectiveDirections(p);
  let total = 0;
  const add = Object.fromEntries(LETTERS.map((l) => [l, 0])) as Record<Letter, number>;
  for (const [dir, w] of Object.entries(dirs)) {
    const m = DIRECTION_RIASEC[dir];
    if (!m || !w) continue;
    total += w;
    for (const l of LETTERS) add[l] += m[l] * w;
  }
  const riasec = Object.fromEntries(
    LETTERS.map((l) => [l, total ? (1 - DIRECTION_SHARE) * base.riasec[l] + DIRECTION_SHARE * (add[l] / total) : base.riasec[l]]),
  ) as Record<Letter, number>;
  // Этап 4: индивидуальный код Холланда профессии (3 буквы: 3/2/1 балла) смешивается с профилем категории
  const code = EXTRA_BY_ID.get(p.id)?.code;
  if (code) {
    const w = Object.fromEntries(LETTERS.map((l) => [l, 0])) as Record<Letter, number>;
    [...code].slice(0, 3).forEach((ch, i) => { if ((LETTERS as readonly string[]).includes(ch)) w[ch as Letter] = 3 - i; });
    for (const l of LETTERS) riasec[l] = (1 - HOLLAND_SHARE) * riasec[l] + HOLLAND_SHARE * w[l];
  }
  return { riasec, conditions: base.conditions, needs: base.needs };
}

// Выбранные при онбординге области (10 направлений ТЗ) → категории каталога.
export const AREA_CATEGORIES: Record<string, CategoryId[]> = {
  med: ["medicine", "social"],
  it: ["it", "ai_data", "cyber"],
  eng: ["engineering", "architecture", "production"],
  law: ["law"],
  biz: ["business", "finance", "tourism"],
  design: ["design", "media"],
  edu: ["education", "social"],
  sci: ["ai_data", "ecology", "medicine"],
  logi: ["logistics"],
  eco: ["ecology", "agri"],
};

void SKILL_DIMS;
void CONDITIONS;
