import { notFound } from "next/navigation";
import { VOICE_BY_ID } from "@/voice/score";
import { VoicePractice } from "@/components/VoicePractice";

export const dynamic = "force-dynamic";
export const metadata = { title: "FuturePath AI" };

export default async function VoicePage({ params }: { params: Promise<{ promptId: string }> }) {
  const p = VOICE_BY_ID.get((await params).promptId);
  if (!p) notFound();
  return <VoicePractice prompt={{ id: p.id, title: p.title, question: p.question, tips: p.tips }} />;
}
