import { redirect } from "next/navigation";
import { getProfile } from "@/backend/profile";
import { getLatestAssessment } from "@/backend/assessment";
import { sanitizeAnswers } from "@/assessment/score";
import { AssessmentFlow } from "@/components/AssessmentFlow";

export const dynamic = "force-dynamic";
export const metadata = { title: "FuturePath AI" };

export default async function AssessmentPage({ searchParams }: { searchParams: Promise<{ pack?: string }> }) {
  const { pack } = await searchParams;
  const profile = await getProfile();
  const latest = profile ? await getLatestAssessment(profile.id) : null;
  const refine = pack === "refine";
  // Завершённую диагностику сразу показываем результатом; уточнение — отдельный пакет вопросов.
  if (latest?.status === "completed" && !refine) redirect("/assessment/result");
  if (refine && latest?.status !== "completed") redirect("/assessment");
  return <AssessmentFlow pack={refine ? "refine" : "core"} initialAnswers={latest ? sanitizeAnswers(latest.answers) : {}} />;
}
