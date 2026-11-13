import Link from "next/link";
import { prisma } from "@/backend/db";
import { getProfile } from "@/backend/profile";
import { getLatestState } from "@/backend/results";
import { buildPlan, planKeyFor } from "@/data/plan";
import { PlanChecklist } from "@/components/PlanChecklist";

export const dynamic = "force-dynamic";
export const metadata = { title: "План на 30 дней — FuturePath AI" };

export default async function PlanPage() {
  const profile = await getProfile();
  const latest = profile ? await getLatestState(profile.id) : null;

  if (!profile || !latest || latest.status === "none") {
    return (
      <div className="card mx-auto max-w-xl text-center">
        <h1 className="h2 mb-2">План появится после теста</h1>
        <p className="mb-4 text-sm text-slate-500">План строится по твоим топ-3 направлениям.</p>
        <Link href="/test" className="btn-primary">Пройти тест</Link>
      </div>
    );
  }
  if (latest.status === "outdated") {
    return (
      <div className="card mx-auto max-w-xl text-center">
        <h1 className="h2 mb-2">Результат устарел</h1>
        <p className="mb-4 text-sm text-slate-500">Вопросы теста изменились после того, как вы его проходили. Пройдите тест заново, чтобы получить план.</p>
        <Link href="/test" className="btn-primary">Пройти тест заново</Link>
      </div>
    );
  }

  const top = latest.result.top.map((d) => d.id);
  const planKey = planKeyFor(top);
  const plan = buildPlan(top);
  // Отметки только для ЭТОГО плана (ключ = версия + направления). Старые отметки не подходят.
  const rows = await prisma.taskProgress.findMany({ where: { profileId: profile.id, planKey, done: true }, select: { taskId: true } });
  return (
    <div>
      <h1 className="h2 mb-1">План на 30 дней</h1>
      <p className="mb-5 text-sm text-slate-500">Основан на направлениях: {latest.result.top.map((d) => d.name).join(", ")}. Каждое задание — небольшой шаг на 15–30 минут.</p>
      <PlanChecklist planKey={planKey} plan={plan} initialDone={rows.map((r) => r.taskId)} />
    </div>
  );
}
