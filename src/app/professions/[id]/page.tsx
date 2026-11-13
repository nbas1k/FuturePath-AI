import Link from "next/link";
import { notFound } from "next/navigation";
import { CAREERS, UNIVERSAL_SKILLS, getCareer } from "@/catalog/build";
import { directionKey } from "@/catalog/directions";
import { prisma } from "@/backend/db";
import { getProfile } from "@/backend/profile";
import { getT } from "@/i18n/server";
import type { MessageKey } from "@/i18n";
import { FavoriteButton } from "@/components/FavoriteButton";
import { ChooseCareer } from "@/components/ChooseCareer";
import { IntroChallenge } from "@/components/IntroChallenge";
import { simsForCareer } from "@/sim/defs";
import { careerOverrides } from "@/backend/careerOverrides";

export function generateStaticParams() {
  return CAREERS.map((c) => ({ id: c.id }));
}
export const dynamicParams = false;
export const dynamic = "force-dynamic";

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="card">
      <h2 className="mb-2 font-extrabold">{title}</h2>
      <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-300">{items.map((x) => <li key={x}>{x}</li>)}</ul>
    </section>
  );
}

function Level({ level }: { level: 1 | 2 | 3 }) {
  return <span className="inline-flex gap-1" aria-hidden>{[1, 2, 3].map((i) => <span key={i} className={`h-2.5 w-5 rounded-full ${i <= level ? "bg-indigo-500" : "bg-slate-200 dark:bg-slate-700"}`} />)}</span>;
}

export default async function CareerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = getCareer(id);
  if (!c) notFound();
  const ov = (await careerOverrides()).get(c.id);
  if (ov && ov.status !== "published") notFound();
  const { t, lang } = await getT();
  const profile = await getProfile();
  const attempt = profile ? await prisma.introAttempt.findUnique({ where: { profileId_careerId: { profileId: profile.id, careerId: c.id } } }) : null;
  const same = CAREERS.filter((x) => x.direction === c.direction && x.id !== c.id).slice(0, 4);

  return (
    <div className="space-y-5">
      <Link href="/professions" className="text-sm font-bold text-indigo-700 dark:text-indigo-300">← {t("cat.back")}</Link>

      <header className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <span className="chip">{t(directionKey(c.direction))}</span>
          <span className="chip">{t(`cat.readiness.${c.readiness}` as MessageKey)}</span>
        </div>
        <h1 className="text-2xl font-extrabold sm:text-3xl">{(lang === "kk" && ov?.titleKk) || (lang === "en" && ov?.titleEn) || c.titles[lang]}</h1>
        <p className="text-slate-700 dark:text-slate-300">{c.description}</p>
        {lang !== "ru" && <p className="text-xs text-slate-500">{t("cat.ruOnly")}</p>}
        <p className="text-xs text-slate-500">{t("cat.draftNote")}</p>
        <div className="flex flex-wrap items-center gap-2 pt-1"><ChooseCareer professionId={c.id} /><FavoriteButton id={c.id} /></div>
      </header>

      <IntroChallenge careerId={c.id} question={c.challenge.question} options={c.challenge.options} solved={attempt?.solvedAt != null} />

      {(() => { const s = simsForCareer(c.id); return [...s.steps, ...s.code].map((x) => <Link key={x.id} href={`/learn/sim/${encodeURIComponent(x.id)}`} className="card block font-extrabold hover:bg-slate-50 dark:hover:bg-slate-800">{t("sim.title")}: {x.title}</Link>); })()}

      <List title={t("cat.tasks")} items={c.tasks} />

      <section className="card space-y-3" aria-labelledby="comp-h">
        <h2 id="comp-h" className="font-extrabold">{t("cat.competencies")}</h2>
        <ul className="space-y-2 text-sm">
          {c.competencies.map((k) => (
            <li key={k.id} className="flex items-center justify-between gap-3"><span>{k.name}</span><span className="flex items-center gap-2 text-xs font-bold text-slate-500">{t(`cat.lvl.${k.level}` as MessageKey)}<Level level={k.level} /></span></li>
          ))}
        </ul>
      </section>

      <section className="card space-y-3" aria-labelledby="uni-h">
        <h2 id="uni-h" className="font-extrabold">{t("cat.universal")}</h2>
        <ul className="grid gap-2 text-sm sm:grid-cols-2">
          {UNIVERSAL_SKILLS.map((s) => (
            <li key={s} className="flex items-center justify-between gap-3"><span className={c.topUniversal.includes(s) ? "font-extrabold" : ""}>{t(`us.${s}` as MessageKey)}</span><Level level={c.universal[s]} /></li>
          ))}
        </ul>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <List title={t("cat.prereq")} items={[...c.prerequisites.subjects, c.prerequisites.education]} />
        <List title={t("cat.examples")} items={c.examples} />
        <List title={t("cat.route")} items={c.route.study} />
        <List title={t("cat.growth")} items={c.route.growth} />
      </div>

      <p className="text-xs text-slate-500">{t("cat.holland")}: {c.holland}</p>

      {same.length > 0 && (
        <section className="card">
          <div className="flex flex-wrap gap-2">
            {same.map((x) => <Link key={x.id} href={`/professions/${x.id}`} className="chip hover:bg-indigo-100 dark:hover:bg-indigo-900">{x.titles[lang]}</Link>)}
          </div>
        </section>
      )}
    </div>
  );
}
