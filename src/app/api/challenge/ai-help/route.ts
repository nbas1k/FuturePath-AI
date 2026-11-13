import { NextResponse } from "next/server";
import { guardSelected } from "@/backend/learnGuard";
import { requestAiHelp } from "@/backend/challenge";

// Human + AI Challenge, часть 2: настоящий ИИ решает сопоставимые задания. Подсказки не подделываются.
export async function POST(req: Request) {
  const g = await guardSelected(req);
  if (!g.ok) return g.res;
  const r = await requestAiHelp(g.profileId, g.professionId);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
