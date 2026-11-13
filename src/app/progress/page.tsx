import Link from "next/link";
import { Award, Flame, Zap } from "lucide-react";
import { getProfile } from "@/backend/profile";
import { loadProgress } from "@/backend/progress";
import { getT } from "@/i18n/server";
import type { MessageKey } from "@/i18n";
import { lessonSlug } from "@/learn/slug";

export const dynamic = "force-dynamic";
export const metadata = { title: "FuturePath AI" };

export default async function ProgressPage() {
  const { t, lang } = await getT();
  const profile = await getProfile();
  if (!profile) return <section className="space-y-3"><h1 className="text-2xl font-extrabold">{t("nav.progress")}</h1><p>{t("pr.empty")}</p><Link href="/learn" className="btn-primary">{t("home.rec.learn")}</Link></section>;
  const p = await loadProgress(profile.id, lang);
  const max = Math.max(10, ...p.week.map((d) => d.xp));
  const label = (c: { name: string; universal: boolean }) => (c.universal ? t(c.name as MessageKey) : c.name);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold sm:text-3xl">{t("nav.progress")}</h1>

      <section className="grid grid-cols-3 gap-3" aria-label={t("pr.summary")}>
        <div className="card !p-3 text-center"><p className="text-xs font-bold text-slate-500">{t("pr.level")}</p><p className="text-2xl font-extrabold">{p.level.level}</p></div>
        <div className="card flex flex-col items-center !p-3 text-center"><Zap size={20} className="text-amber-500" aria-hidden /><p className="text-xl font-extrabold">{p.xp}</p><p className="text-xs font-bold text-slate-500">XP</p></div>
        <div className="card flex flex-col items-center !p-3 text-center"><Flame size={20} className="text-orange-500" aria-hidden /><p className="text-xl font-extrabold">{p.streak}</p><p className="text-xs font-bold text-slate-500">{t("home.streak")}</p></div>
      </section>
      <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={p.level.pct} aria-label={t("pr.nextLevel")}>
        <p className="mb-1 text-xs font-bold text-slate-500">{t("pr.nextLevel")}: {p.level.into}/{p.level.need} XP</p>
        <div className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"><div className="h-full rounded-full bg-indigo-500" style={{ width: `${p.level.pct}%` }} /></div>
      </div>

      <section className="card space-y-3" aria-labelledby="w-h">
        <h2 id="w-h" className="font-extrabold">{t("pr.week")}</h2>
        <p className="text-xs text-slate-500">{t("pr.dailyGoal", { a: p.todayXp, b: p.dailyGoal })}</p>
        <ul className="flex h-28 items-end gap-2">{p.week.map((d) => <li key={d.day} className="flex flex-1 flex-col items-center gap-1"><span className="text-[10px] font-bold">{d.xp}</span><span className="w-full rounded-t-lg bg-indigo-400" style={{ height: `${Math.max(4, (d.xp / max) * 70)}px` }} aria-hidden /><span className="text-[10px] text-slate-500">{d.day.slice(8)}</span></li>)}</ul>
      </section>

      <section className="card space-y-3" aria-labelledby="c-h">
        <h2 id="c-h" className="font-extrabold">{t("pr.skills")}</h2>
        <p className="text-xs text-slate-500">{t("pr.skillsNote")}</p>
        {p.competencies.length === 0 ? <p className="text-sm">{t("pr.noSkills")}</p> : (
          <ul className="space-y-3">{p.competencies.map((c) => <li key={c.id}><div className="flex justify-between text-sm font-bold"><span>{label(c)}</span><span>{Math.round(c.score * 100)}% · {c.evidence}</span></div><div className="mt-1 h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"><div className={`h-full rounded-full ${c.universal ? "bg-violet-500" : "bg-indigo-500"}`} style={{ width: `${c.score * 100}%` }} /></div></li>)}</ul>
        )}
      </section>

      <section className="card space-y-3" aria-labelledby="a-h">
        <h2 id="a-h" className="font-extrabold">{t("pr.achievements")} · {p.achievements.filter((a) => a.unlocked).length}/{p.achievementsTotal}</h2>
        <ul className="grid gap-2 sm:grid-cols-2">{p.achievements.map((a) => <li key={a.id} className={`flex items-center gap-3 rounded-2xl border-2 p-3 ${a.unlocked ? "border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950" : "border-slate-200 opacity-60 dark:border-slate-700"}`}><Award size={22} aria-hidden className={a.unlocked ? "text-amber-600" : "text-slate-400"} /><span><span className="block text-sm font-extrabold">{a.title}</span><span className="text-xs">{a.description}</span></span></li>)}</ul>
      </section>

      <section className="card space-y-3" aria-labelledby="m-h">
        <h2 id="m-h" className="font-extrabold">{t("pr.mistakes")}</h2>
        {p.mistakes.length === 0 ? <p className="text-sm">{t("pr.noMistakes")}</p> : <ul className="space-y-2">{p.mistakes.map((m, i) => <li key={i}><Link href={`/learn/lesson/${lessonSlug(m.lessonId)}`} className="block rounded-2xl bg-slate-100 p-3 text-sm dark:bg-slate-800"><span className="font-bold">{m.lesson}</span><br />{m.prompt}</Link></li>)}</ul>}
      </section>
    </div>
  );
}
