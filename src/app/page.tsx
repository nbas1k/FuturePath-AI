import Link from "next/link";
import { ArrowRight, Flame, Zap, Target, Compass, GraduationCap, TrendingUp } from "lucide-react";
import { getProfile } from "@/backend/profile";
import { loadJourney } from "@/backend/journeyContext";
import { getT } from "@/i18n/server";
import { ThemeToggle } from "@/components/ThemeToggle";
import { loadProgress } from "@/backend/progress";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { t, lang } = await getT();
  const profile = await getProfile();
  const onboarded = profile?.onboardedAt != null;

  // Новый пользователь: один экран — одна задача.
  if (!onboarded) {
    return (
      <section className="flex min-h-[70dvh] flex-col justify-center gap-5">
        <h1 className="text-3xl font-extrabold sm:text-4xl">{t("home.welcomeNew")}</h1>
        <p className="max-w-md text-lg text-slate-600 dark:text-slate-400">{t("home.welcomeNewText")}</p>
        <div><Link href="/onboarding" className="btn-primary !text-base">{t("home.setup")}<ArrowRight size={18} className="ml-2" aria-hidden /></Link></div>
      </section>
    );
  }

  const data = await loadJourney();
  const step = data.journey.steps.find((s) => s.current) ?? null;
  const goal = Math.max(1, profile.dailyGoalXp);
  // XP за сегодня появится вместе с журналом XP (этап 10); пока показываем только то, что реально сохранено.
  const prog = await loadProgress(profile.id, lang);
  const xpToday = Math.min(prog.todayXp, goal);
  const pct = Math.round((xpToday / goal) * 100);

  const recs = [
    !data.hasProfile || data.user.status !== "ok" ? { href: "/assessment", label: t("home.rec.test"), icon: Compass } : null,
    { href: "/professions", label: t("home.rec.catalog"), icon: Compass },
    { href: "/learn", label: t("home.rec.learn"), icon: GraduationCap },
    { href: "/path", label: t("home.rec.progress"), icon: TrendingUp },
  ].filter((x): x is { href: string; label: string; icon: typeof Compass } => x !== null).slice(0, 3);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold sm:text-3xl">{t("home.welcome")}</h1>
        <div className="md:hidden"><ThemeToggle /></div>
      </header>

      <section className="card space-y-4 !border-indigo-200 !bg-indigo-50 dark:!border-indigo-800 dark:!bg-indigo-950" aria-labelledby="prof-h">
        <p id="prof-h" className="text-sm font-bold text-indigo-700 dark:text-indigo-200">{t("home.profession")}</p>
        {data.selected ? (
          <>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{data.selected.title}</p>
            {step && (
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {t("home.currentStep")}: {data.journey.completed + 1}/5{lang === "ru" ? ` · ${step.title}` : ""}
              </p>
            )}
            <Link href={step?.nextHref ?? "/learn"} className="btn-primary w-full !text-base sm:w-auto">{t("home.continue")}<ArrowRight size={18} className="ml-2" aria-hidden /></Link>
          </>
        ) : (
          <>
            <p className="text-lg font-bold text-slate-900 dark:text-white">{t("home.noProfession")}</p>
            <Link href="/professions" className="btn-primary w-full !text-base sm:w-auto">{t("home.pickProfession")}<ArrowRight size={18} className="ml-2" aria-hidden /></Link>
          </>
        )}
      </section>

      <section className="grid grid-cols-3 gap-3" aria-label={t("home.dailyGoal")}>
        <div className="card flex flex-col items-center gap-1 !p-3 text-center"><Target size={22} className="text-violet-500" aria-hidden /><span className="text-xl font-extrabold">{xpToday}/{goal}</span><span className="text-xs font-semibold text-slate-500">{t("home.dailyGoal")}</span></div>
        <div className="card flex flex-col items-center gap-1 !p-3 text-center"><Zap size={22} className="text-amber-500" aria-hidden /><span className="text-xl font-extrabold">{profile.xp}</span><span className="text-xs font-semibold text-slate-500">{t("home.xp")}</span></div>
        <div className="card flex flex-col items-center gap-1 !p-3 text-center"><Flame size={22} className="text-orange-500" aria-hidden /><span className="text-xl font-extrabold">{prog.streak}</span><span className="text-xs font-semibold text-slate-500">{t("home.streak")}</span></div>
      </section>
      <div className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={t("home.dailyGoal")}>
        <div className="h-full rounded-full bg-indigo-500 transition-[width] duration-300" style={{ width: `${pct}%` }} />
      </div>

      <section aria-labelledby="next-h" className="space-y-3">
        <h2 id="next-h" className="text-lg font-extrabold">{t("home.next")}</h2>
        <ul className="space-y-3">
          {recs.map((r) => {
            const Icon = r.icon;
            return (
              <li key={r.href}>
                <Link href={r.href} className="card flex min-h-[56px] items-center gap-3 !py-3 font-bold transition-colors duration-150 hover:bg-slate-50 dark:hover:bg-slate-800">
                  <Icon size={22} className="text-indigo-600" aria-hidden /><span className="flex-1">{r.label}</span><ArrowRight size={18} className="text-slate-400" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
