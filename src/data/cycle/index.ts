import { DEV_CYCLE } from "./software-developer";
import { UX_CYCLE } from "./ux-designer";
import { MKT_CYCLE } from "./marketer";
import type { CycleContent, CycleSkill } from "./types";

// Профессии, для которых есть полный цикл. Для остальных сайт честно показывает доступные инструменты.
export const CYCLES: Record<string, CycleContent> = {
  "software-developer": DEV_CYCLE,
  "ux-designer": UX_CYCLE,
  marketer: MKT_CYCLE,
};

export const CYCLE_PROFESSIONS = Object.keys(CYCLES);

export function findSkill(professionId: string, skill: string): CycleSkill | undefined {
  return CYCLES[professionId]?.skills.find((s) => s.skill === skill);
}
