import Link from "next/link";
import { prisma } from "@/backend/db";
import { getProfile } from "@/backend/profile";
import { professionById } from "@/data/professions";
import { loadSkillMap } from "@/backend/skillMap";
import { PortfolioEditor, type PortfolioView } from "@/components/PortfolioEditor";
import { PrintButton } from "@/components/PrintButton";

export const dynamic = "force-dynamic";
export const metadata = { title: "Портфолио — FuturePath AI" };

// Portfolio Builder: проекты, которые человек добавил сам. Платформа их не проверяет, это сказано на странице.
export default async function PortfolioPage() {
  const profile = await getProfile();
  if (!profile) {
    return (
      <div className="card mx-auto max-w-xl text-center">
        <h1 className="h2 mb-2">Портфолио</h1>
        <p className="mb-4 text-sm text-slate-500">Портфолио привязано к профилю, который создаётся после теста.</p>
        <Link href="/path" className="btn-primary">Начать мой путь</Link>
      </div>
    );
  }
  const rows = await prisma.portfolioItem.findMany({ where: { profileId: profile.id }, orderBy: { createdAt: "desc" } });
  const items: PortfolioView[] = rows.map((r) => {
    let skills: string[] = [];
    try { const v = JSON.parse(r.skills); if (Array.isArray(v)) skills = v.filter((s) => typeof s === "string"); } catch { /* повреждённая запись */ }
    return { id: r.id, title: r.title, description: r.description, skills, link: r.link, date: r.createdAt.toISOString().slice(0, 10) };
  });
  const prof = profile.selectedProfession ? professionById(profile.selectedProfession) : undefined;
  const confirmed = prof ? ((await loadSkillMap(profile.id, prof.id))?.map.rows.filter((r) => r.status === "confirmed").map((r) => r.skill) ?? []) : [];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/profile" className="text-sm text-indigo-600 underline dark:text-indigo-400">← Профиль</Link>
        <PrintButton />
      </div>
      <header className="card space-y-1">
        <h1 className="h2">Портфолио: {profile.name}</h1>
        {prof && <p className="text-sm text-slate-500">Профессия: {prof.title}</p>}
        <p className="text-xs text-slate-500">Проекты добавлены самим пользователем, платформа их не проверяла. Подтверждёнными считаются только навыки, решённые заданиями на платформе.</p>
        {confirmed.length > 0 && <p className="text-sm">Подтверждено заданиями: {confirmed.join(", ")}.</p>}
      </header>
      <PortfolioEditor items={items} skillOptions={prof?.skills ?? []} />
    </div>
  );
}
