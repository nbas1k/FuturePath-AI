import Link from "next/link";
import { prisma } from "@/backend/db";
import { getProfile } from "@/backend/profile";
import { getLatestState } from "@/backend/results";
import { latestAiRecord } from "@/backend/aiContext";
import { aiPlanKey } from "@/backend/planKeys";
import { planKeyFor } from "@/data/plan";
import { PROFESSIONS } from "@/data/professions";
import type { AnalysisOutput, RoadmapOutput } from "@/backend/ai/schemas";
import { AiWorkspace } from "@/components/AiWorkspace";

export const dynamic = "force-dynamic";
export const metadata = { title: "AI-помощник — FuturePath AI" };

export default async function AiPage() {
  const profile = await getProfile();
  const state = profile ? await getLatestState(profile.id) : { status: "none" as const };

  if (!profile || state.status !== "ok") {
    return (
      <div className="card mx-auto max-w-xl text-center">
        <h1 className="h2 mb-2">AI-помощник</h1>
        <p className="mb-4 text-sm text-slate-500">
          {state.status === "outdated"
            ? "Результат устарел: вопросы теста изменились. Пройдите тест заново."
            : "Сначала пройдите тест: AI-функции используют ваши реальные результаты."}
        </p>
        <Link href="/test" className="btn-primary">Пройти тест</Link>
      </div>
    );
  }

  const basedOn = planKeyFor(state.result.top.map((d) => d.id));
  const analysis = await latestAiRecord<AnalysisOutput>(profile.id, "analysis", basedOn);
  const roadmapRecord = await latestAiRecord<RoadmapOutput>(profile.id, "roadmap", basedOn);
  let roadmap = null;
  if (roadmapRecord) {
    const planKey = aiPlanKey(roadmapRecord.id);
    const rows = await prisma.taskProgress.findMany({ where: { profileId: profile.id, planKey, done: true }, select: { taskId: true } });
    roadmap = {
      id: roadmapRecord.id,
      source: roadmapRecord.source,
      createdAt: roadmapRecord.createdAt.toISOString(),
      days: roadmapRecord.data.days,
      done: rows.map((r) => r.taskId),
    };
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="h2 mb-1">AI-помощник</h1>
        <p className="text-sm text-slate-500">
          Три функции на основе вашего теста. ИИ не меняет баллы: он только объясняет и предлагает задания.
          Если ключ API не подключён, сайт показывает честный резервный текст, собранный по правилам.
        </p>
      </div>
      <AiWorkspace
        analysis={analysis ? { source: analysis.source, createdAt: analysis.createdAt.toISOString(), data: analysis.data } : null}
        roadmap={roadmap}
        professions={PROFESSIONS.map((p) => ({ id: p.id, title: p.title }))}
      />
    </div>
  );
}
