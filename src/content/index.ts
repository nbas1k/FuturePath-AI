import type { TrackDef } from "@/learn/types";
import { COMMUNICATION } from "./skills/communication";

// Все треки обучения. Этапы 6–7 добавляют сюда профессиональные маршруты и остальные универсальные навыки.
export const TRACKS: TrackDef[] = [COMMUNICATION];
export const TRACK_BY_ID = new Map(TRACKS.map((t) => [t.id, t]));
