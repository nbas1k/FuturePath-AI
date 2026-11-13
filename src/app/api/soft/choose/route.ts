import { NextResponse } from "next/server";
import { getOrCreateProfile } from "@/backend/profile";
import { chooseSoft } from "@/backend/softSkills";

export async function POST(req: Request) {
  const profile = await getOrCreateProfile();
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const r = await chooseSoft(profile.id, body?.situationId, body?.option);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
