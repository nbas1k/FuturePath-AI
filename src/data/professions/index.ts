// Главный каталог профессий. Сами описания лежат в файлах рядом (по группам категорий).
// Чтобы добавить профессию: откройте нужный файл группы, скопируйте блок и поменяйте поля.
// Подробно: docs/CATALOG_AND_RECOMMENDATIONS_RU.md
import { CATEGORY_DIRECTIONS } from "../categories";
import type { DirectionId } from "../directions";
import { ITAI_CYBER } from "./it-ai-cyber";
import { ENGINEERING_ECO_AGRI_PROD } from "./engineering-ecology-agri-production";
import { HEALTH_SOCIAL } from "./health-social";
import { BUSINESS_FINANCE_LAW } from "./business-finance-law";
import { CREATIVE_MEDIA_TOURISM } from "./creative-media-tourism";
import { EDU_ARCH_LOGISTICS } from "./education-architecture-logistics";
import type { Profession } from "./types";

export * from "./types";

export const PROFESSIONS: Profession[] = [
  ...ITAI_CYBER,
  ...ENGINEERING_ECO_AGRI_PROD,
  ...HEALTH_SOCIAL,
  ...BUSINESS_FINANCE_LAW,
  ...CREATIVE_MEDIA_TOURISM,
  ...EDU_ARCH_LOGISTICS,
];

// Направления профессии: свои веса, а если их нет — веса её категории
export function effectiveDirections(p: Profession): Partial<Record<DirectionId, number>> {
  return p.directions && Object.keys(p.directions).length > 0 ? p.directions : CATEGORY_DIRECTIONS[p.category];
}

export function professionById(id: string): Profession | undefined {
  return PROFESSIONS.find((p) => p.id === id);
}
