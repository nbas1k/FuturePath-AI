import { NextResponse } from "next/server";
import { getOrCreateProfile } from "@/backend/profile";
import { startSoft } from "@/backend/softSkills";

export async function POST() {
  const profile = await getOrCreateProfile();
  await startSoft(profile.id);
  return NextResponse.json({ ok: true });
}
