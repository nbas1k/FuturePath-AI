import { NextResponse } from "next/server";
import { guardSelected } from "@/backend/learnGuard";
import { choose } from "@/backend/simulator";

export async function POST(req: Request) {
  const g = await guardSelected(req);
  if (!g.ok) return g.res;
  const r = await choose(g.profileId, g.professionId, g.body.situationIndex, g.body.optionIndex);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
