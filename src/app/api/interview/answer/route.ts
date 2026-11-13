import { NextResponse } from "next/server";
import { guardSelected } from "@/backend/learnGuard";
import { submitInterviewAnswer } from "@/backend/interview";

export async function POST(req: Request) {
  const g = await guardSelected(req);
  if (!g.ok) return g.res;
  const r = await submitInterviewAnswer(g.profileId, g.professionId, g.body.index, g.body.answer);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
