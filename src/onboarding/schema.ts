import { z } from "zod";
import { LANGS } from "@/i18n";

export const AGE_GROUPS = ["u14", "14_17", "18_24", "25_34", "35p"] as const;
export const EDUCATION = ["school", "college", "university", "working", "other"] as const;
export const GOALS = ["choose", "learn", "skills", "all"] as const;
// 10 направлений из ТЗ. id короткие, названия — в словаре i18n (dir.*).
export const INTEREST_IDS = ["med", "it", "eng", "law", "biz", "design", "edu", "sci", "logi", "eco"] as const;
export const MAX_INTERESTS = 4;

// Все поля необязательны: экран можно пропустить, а шаги сохраняются по одному.
export const OnboardingInput = z.object({
  lang: z.enum(LANGS).optional(),
  ageGroup: z.enum(AGE_GROUPS).optional(),
  education: z.enum(EDUCATION).optional(),
  goal: z.enum(GOALS).optional(),
  interests: z.array(z.enum(INTEREST_IDS)).max(MAX_INTERESTS).optional(),
  complete: z.boolean().optional(),
}).strict();

export type OnboardingInput = z.infer<typeof OnboardingInput>;

export function parseInterests(stored: string): string[] {
  const allowed = new Set<string>(INTEREST_IDS);
  return Array.from(new Set(stored.split(",").filter((x) => allowed.has(x)))).slice(0, MAX_INTERESTS);
}

// Несовершеннолетние (до 18): строгие настройки приватности.
export function isMinor(ageGroup: string | null | undefined): boolean {
  return ageGroup === "u14" || ageGroup === "14_17";
}
