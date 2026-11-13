// Объединённые данные каталога (только данные, без зависимостей от остального кода).
import { EXTRAS_HEALTH_IT, type ExtraTuple } from "./extras-health-it";
import { EXTRAS_ENG_LAW_BIZ } from "./extras-eng-law-biz";
import { EXTRAS_CREATIVE_EDU_ECO } from "./extras-creative-edu-eco";

export type Extra = {
  id: string;
  en: string;
  kk: string;
  code: string; // три буквы RIASEC (код Холланда), экспертная заготовка
  q: string;
  options: [string, string, string]; // порядок до детерминированной ротации
  correct: number;
  why: string;
};

const toExtra = (t: ExtraTuple): Extra => ({ id: t[0], en: t[1], kk: t[2], code: t[3], q: t[4], options: t[5], correct: t[6], why: t[7] });

export const EXTRAS: Extra[] = [...EXTRAS_HEALTH_IT, ...EXTRAS_ENG_LAW_BIZ, ...EXTRAS_CREATIVE_EDU_ECO].map(toExtra);
export const EXTRA_BY_ID = new Map(EXTRAS.map((e) => [e.id, e]));
