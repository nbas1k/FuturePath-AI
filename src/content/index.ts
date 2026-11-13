import type { TrackDef } from "@/learn/types";
import { COMMUNICATION } from "./skills/communication";
import { UNIVERSAL } from "./skills/universal";
import { DOCTOR } from "./careers/doctor";
import { SOFTWARE_DEVELOPER } from "./careers/software-developer";
import { ARCHITECT } from "./careers/architect";
import { ENTREPRENEUR } from "./careers/entrepreneur";

// Все треки обучения. Этапы 6–7 добавляют сюда профессиональные маршруты и остальные универсальные навыки.
export const TRACKS: TrackDef[] = [DOCTOR, SOFTWARE_DEVELOPER, ARCHITECT, ENTREPRENEUR, COMMUNICATION, ...UNIVERSAL];
export const TRACK_BY_ID = new Map(TRACKS.map((t) => [t.id, t]));
