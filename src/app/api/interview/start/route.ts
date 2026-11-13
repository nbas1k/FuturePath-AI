import { NextResponse } from "next/server";
import { guardSelected } from "@/backend/learnGuard";
import { startInterview } from "@/backend/interview";

export async function POST(req: Request) {
  const g = await guardSelected(req);
  if (!g.ok) return g.res;
  const r = await startInterview(g.profileId, g.professionId);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
