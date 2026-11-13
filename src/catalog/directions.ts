import type { CategoryId } from "@/data/categories";
import type { MessageKey } from "@/i18n";

// 10 направлений каталога из ТЗ. id совпадают с областями интересов онбординга.
export const DIRECTION_IDS = ["med", "it", "eng", "law", "biz", "design", "edu", "sci", "logi", "eco"] as const;
export type CareerDirection = (typeof DIRECTION_IDS)[number];
export const directionKey = (d: CareerDirection) => `dir.${d}` as MessageKey;

export const CATEGORY_TO_DIRECTION: Record<CategoryId, CareerDirection> = {
  medicine: "med", it: "it", ai_data: "it", cyber: "it",
  engineering: "eng", architecture: "eng", production: "eng",
  law: "law", business: "biz", finance: "biz", tourism: "biz",
  design: "design", media: "design", education: "edu", social: "edu",
  science: "sci", logistics: "logi", ecology: "eco", agri: "eco",
};

// Исключения: профессия относится к другому направлению, чем её категория в старом каталоге.
export const DIRECTION_OVERRIDES: Record<string, CareerDirection> = {
  "speech-therapist": "med",
  "rehabilitation-specialist": "med",
  "occupational-therapist": "med",
  researcher: "sci",
};
