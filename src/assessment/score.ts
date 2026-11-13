// Детерминированный подсчёт диагностики v3. Чистые функции: без базы, без ИИ, без случайности.
// Одинаковые ответы всегда дают одинаковый результат. Подробно: docs/ASSESSMENT_ALGORITHM_RU.md.
//
// Три разных источника данных намеренно НЕ смешиваются в один балл «способностей»:
//   1) интересы   — RIASEC (30 утверждений + ситуации + доп. пакет),
//   2) самооценка — как человек сам оценивает свои навыки (8 утверждений),
//   3) показанные навыки — результат мини-заданий (числа, логика, текст).
// Условия работы и выбранные при онбординге области — отдельные мягкие сигналы.
import { PROFESSIONS, type Profession } from "@/data/professions";
import {
  ALL_ITEMS, CONDITIONS, DEMONSTRABLE, ITEM_BY_ID, LETTERS, SKILL_DIMS, isValidAnswer,
  type ChoiceItem, type Condition, type Letter, type LikertItem, type SkillDim,
} from "./items";
import { AREA_CATEGORIES, professionProfile, type CareerProfile } from "./careerProfiles";

export type Answers = Record<string, number>;

// Документированные веса итогового совпадения. Если часть данных отсутствует, веса остальных пересчитываются.
export const WEIGHTS = { interest: 0.5, skills: 0.2, conditions: 0.15, areas: 0.15 } as const;
export const SITUATION_WEIGHT = 0.7; // вес одного ответа в ситуации относительно утверждения об интересах
export const DEMONSTRATED_SHARE = 0.6; // доля показанного навыка против самооценки там, где есть и то и другое
export const AREA_MISS_SCORE = 40; // область не выбрана при онбординге — мягкий штраф, а не ноль
export const MIN_INTEREST_ANSWERS = 12; // меньше — рекомендаций не даём
export const FLAT_PROFILE_EPS = 0.04; // разброс интересов меньше — профиль «плоский», различать не на чем
export const TOP_N = 5;
export const MAX_PER_CATEGORY = 2;

export type Confidence = "insufficient" | "low" | "medium" | "high";

export type UserProfile = {
  letters: Record<Letter, number | null>; // 0..100
  interestAnswered: number;
  conditions: Record<Condition, number | null>; // 1..5
  demonstrated: Record<(typeof DEMONSTRABLE)[number], { correct: number; total: number }>;
  self: Record<SkillDim, number | null>; // 0..1
  skillLevel: Record<SkillDim, number | null>; // 0..1, итоговый уровень для сопоставления
  code: string; // три ведущие буквы RIASEC
  undifferentiated: boolean;
};

export type Match = {
  professionId: string;
  title: string;
  category: string;
  percent: number; // 0..100, «совпадение для размышления», не вероятность успеха
  parts: { interest: number | null; skills: number | null; conditions: number | null; areas: number | null };
  matchedLetters: Letter[];
  matchedConditions: Condition[];
  mustHave: SkillDim[]; // навыки, которые понадобятся (по профилю профессии)
  gaps: SkillDim[]; // где уровень пользователя заметно ниже требуемого
};

export type AssessmentResult = {
  version: number;
  confidence: Confidence;
  answered: number;
  total: number;
  profile: UserProfile;
  top: Match[]; // ≤ 5, не более 2 из одной категории
  ranked: Match[]; // все профессии
};

// Оставляет только известные вопросы с допустимыми значениями (защита от мусора и подделки с клиента).
export function sanitizeAnswers(raw: unknown): Answers {
  const out: Answers = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [id, v] of Object.entries(raw as Record<string, unknown>)) {
    const item = ITEM_BY_ID.get(id);
    if (item && typeof v === "number" && isValidAnswer(item, v)) out[id] = v;
  }
  return out;
}

const to01 = (v: number) => (v - 1) / 4;

export function buildProfile(answersIn: Answers): UserProfile {
  const answers = sanitizeAnswers(answersIn);

  // 1) Интересы: утверждения (вес 1) + ситуации (вес SITUATION_WEIGHT)
  const num = Object.fromEntries(LETTERS.map((l) => [l, 0])) as Record<Letter, number>;
  const den = Object.fromEntries(LETTERS.map((l) => [l, 0])) as Record<Letter, number>;
  let interestAnswered = 0;
  for (const item of ALL_ITEMS) {
    const v = answers[item.id];
    if (v === undefined) continue;
    if (item.block === "interest") {
      const li = item as LikertItem;
      num[li.letter!] += to01(v);
      den[li.letter!] += 1;
      interestAnswered++;
    } else if (item.block === "situation") {
      const ci = item as ChoiceItem;
      ci.options.forEach((o, idx) => {
        if (!o.letter) return;
        num[o.letter] += SITUATION_WEIGHT * (idx === v ? 1 : 0);
        den[o.letter] += SITUATION_WEIGHT;
      });
      interestAnswered++;
    }
  }
  const letters = Object.fromEntries(LETTERS.map((l) => [l, den[l] > 0 ? Math.round((num[l] / den[l]) * 100) : null])) as Record<Letter, number | null>;

  // 2) Условия работы
  const conditions = Object.fromEntries(CONDITIONS.map((c) => [c, null])) as Record<Condition, number | null>;
  for (const item of ALL_ITEMS) {
    if (item.block === "condition" && answers[item.id] !== undefined) conditions[(item as LikertItem).condition!] = answers[item.id];
  }

  // 3) Показанные навыки (пропущенное задание не считается ошибкой, его просто нет)
  const demonstrated = Object.fromEntries(DEMONSTRABLE.map((s) => [s, { correct: 0, total: 0 }])) as UserProfile["demonstrated"];
  for (const item of ALL_ITEMS) {
    if (item.block !== "challenge" || answers[item.id] === undefined) continue;
    const ci = item as ChoiceItem;
    const d = demonstrated[ci.skill as (typeof DEMONSTRABLE)[number]];
    d.total++;
    if (answers[item.id] === ci.correct) d.correct++;
  }

  // 4) Самооценка
  const self = Object.fromEntries(SKILL_DIMS.map((s) => [s, null])) as Record<SkillDim, number | null>;
  for (const item of ALL_ITEMS) {
    if (item.block === "self" && answers[item.id] !== undefined) self[(item as LikertItem).skill!] = to01(answers[item.id]);
  }

  // Итоговый уровень для сопоставления: там, где есть и показанный навык, и самооценка, показанный весит больше
  const skillLevel = Object.fromEntries(SKILL_DIMS.map((s) => [s, null])) as Record<SkillDim, number | null>;
  for (const s of SKILL_DIMS) {
    const demo = (DEMONSTRABLE as readonly string[]).includes(s) ? demonstrated[s as (typeof DEMONSTRABLE)[number]] : null;
    const d = demo && demo.total > 0 ? demo.correct / demo.total : null;
    const a = self[s];
    skillLevel[s] = d !== null && a !== null ? DEMONSTRATED_SHARE * d + (1 - DEMONSTRATED_SHARE) * a : d ?? a;
  }

  const known = LETTERS.filter((l) => letters[l] !== null);
  const mean = known.length ? known.reduce((s, l) => s + (letters[l] as number), 0) / known.length : 0;
  const spread = known.length ? Math.sqrt(known.reduce((s, l) => s + ((letters[l] as number) - mean) ** 2, 0) / known.length) / 100 : 0;
  const code = [...known].sort((a, b) => (letters[b] as number) - (letters[a] as number) || LETTERS.indexOf(a) - LETTERS.indexOf(b)).slice(0, 3).join("");

  return { letters, interestAnswered, conditions, demonstrated, self, skillLevel, code, undifferentiated: known.length < 2 || spread < FLAT_PROFILE_EPS, };
}

// Совпадение интересов: косинус между отцентрованными векторами (убирает эффект «всё нравится» / «ничего не нравится»).
export function interestFit(user: UserProfile, career: CareerProfile): number | null {
  const known = LETTERS.filter((l) => user.letters[l] !== null);
  if (known.length === 0 || user.undifferentiated) return known.length === 0 ? null : 50;
  const uMean = known.reduce((s, l) => s + (user.letters[l] as number), 0) / known.length;
  const cMean = LETTERS.reduce((s, l) => s + career.riasec[l], 0) / LETTERS.length;
  let dot = 0, uu = 0, cc = 0;
  for (const l of known) {
    const u = (user.letters[l] as number) - uMean;
    const c = career.riasec[l] - cMean;
    dot += u * c; uu += u * u; cc += c * c;
  }
  if (uu === 0 || cc === 0) return 50;
  return 50 + 50 * (dot / Math.sqrt(uu * cc));
}

export function conditionsFit(user: UserProfile, career: CareerProfile): number | null {
  const known = CONDITIONS.filter((c) => user.conditions[c] !== null);
  if (!known.length) return null;
  const diff = known.reduce((s, c) => s + Math.abs((user.conditions[c] as number) - career.conditions[c]), 0) / known.length;
  return 100 * (1 - diff / 4);
}

export function skillsFit(user: UserProfile, career: CareerProfile): number | null {
  let sumNeed = 0, loss = 0;
  for (const s of SKILL_DIMS) {
    const level = user.skillLevel[s];
    if (level === null || career.needs[s] <= 0) continue;
    sumNeed += career.needs[s];
    loss += career.needs[s] * Math.max(0, career.needs[s] - level);
  }
  return sumNeed > 0 ? 100 * (1 - loss / sumNeed) : null;
}

export function areasFit(areas: string[], category: string): number | null {
  if (!areas.length) return null;
  const cats = new Set<string>(areas.flatMap((a) => AREA_CATEGORIES[a] ?? []));
  if (cats.size === 0) return null;
  return cats.has(category) ? 100 : AREA_MISS_SCORE;
}

function matchProfession(p: Profession, user: UserProfile, areas: string[]): Match {
  const career = professionProfile(p);
  const parts = {
    interest: interestFit(user, career),
    skills: skillsFit(user, career),
    conditions: conditionsFit(user, career),
    areas: areasFit(areas, p.category),
  };
  let sum = 0, w = 0;
  for (const k of Object.keys(parts) as (keyof typeof parts)[]) {
    const v = parts[k];
    if (v === null) continue;
    sum += WEIGHTS[k] * v;
    w += WEIGHTS[k];
  }
  const percent = w > 0 ? Math.round(sum / w) : 0;

  const matchedLetters = [...LETTERS]
    .filter((l) => user.letters[l] !== null && (user.letters[l] as number) >= 55 && career.riasec[l] >= 1.5)
    .sort((a, b) => career.riasec[b] - career.riasec[a] || (user.letters[b] as number) - (user.letters[a] as number) || LETTERS.indexOf(a) - LETTERS.indexOf(b))
    .slice(0, 3);
  const matchedConditions = CONDITIONS.filter((c) => user.conditions[c] !== null && Math.abs((user.conditions[c] as number) - career.conditions[c]) <= 1);
  const mustHave = [...SKILL_DIMS].sort((a, b) => career.needs[b] - career.needs[a] || SKILL_DIMS.indexOf(a) - SKILL_DIMS.indexOf(b)).slice(0, 3);
  const gaps = SKILL_DIMS
    .filter((s) => user.skillLevel[s] !== null && career.needs[s] >= 0.5 && career.needs[s] - (user.skillLevel[s] as number) >= 0.2)
    .sort((a, b) => career.needs[b] - (user.skillLevel[b] as number) - (career.needs[a] - (user.skillLevel[a] as number)) || SKILL_DIMS.indexOf(a) - SKILL_DIMS.indexOf(b))
    .slice(0, 3);

  return { professionId: p.id, title: p.title, category: p.category, percent, parts, matchedLetters, matchedConditions, mustHave, gaps };
}

export function pickTop(ranked: Match[], n = TOP_N, perCategory = MAX_PER_CATEGORY): Match[] {
  const count = new Map<string, number>();
  const out: Match[] = [];
  for (const m of ranked) {
    const c = count.get(m.category) ?? 0;
    if (c >= perCategory) continue;
    count.set(m.category, c + 1);
    out.push(m);
    if (out.length >= n) break;
  }
  return out;
}

export function scoreAssessment(answersIn: Answers, opts: { areas?: string[]; version?: number } = {}): AssessmentResult {
  const answers = sanitizeAnswers(answersIn);
  const profile = buildProfile(answers);
  const core = ALL_ITEMS.filter((i) => i.pack === "core");
  const answered = core.filter((i) => answers[i.id] !== undefined).length;
  const total = core.length;
  const coverage = answered / total;
  const confidence: Confidence = profile.interestAnswered < MIN_INTEREST_ANSWERS ? "insufficient" : coverage < 0.6 ? "low" : coverage < 0.85 ? "medium" : "high";

  if (confidence === "insufficient") return { version: opts.version ?? 3, confidence, answered, total, profile, top: [], ranked: [] };

  const areas = opts.areas ?? [];
  const ranked = PROFESSIONS.map((p) => matchProfession(p, profile, areas)).sort((a, b) => b.percent - a.percent || a.professionId.localeCompare(b.professionId));
  return { version: opts.version ?? 3, confidence, answered, total, profile, top: pickTop(ranked), ranked };
}
