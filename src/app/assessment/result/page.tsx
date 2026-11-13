import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";
import { getProfile } from "@/backend/profile";
import { getLatestAssessment } from "@/backend/assessment";
import { sanitizeAnswers, scoreAssessment, type Match } from "@/assessment/score";
import { LETTERS, SKILL_DIMS, DEMONSTRABLE } from "@/assessment/items";
import { professionById } from "@/data/professions";
import { getCareer } from "@/catalog/build";
import { parseInterests } from "@/onboarding/schema";
import { getT } from "@/i18n/server";
import type { MessageKey } from "@/i18n";
import { ResultActions } from "@/components/ResultActions";

export const dynamic = "force-dynamic";
export const metadata = { title: "FuturePath AI" };

const band = (p: number): MessageKey => (p >= 85 ? "res.band.high" : p >= 70 ? "res.band.good" : "res.band.partial");

export default async function ResultPage() {
  const { t, lang } = await getT();
  const profile = await getProfile();
  const a = profile ? await getLatestAssessment(profile.id) : null;
  if (!profile || !a || a.status !== "completed") redirect("/assessment");

  // Результат пересчитывается из сохранённых ответов: алгоритм детерминированный, поэтому он совпадёт с сохранённым.
  const r = scoreAssessment(sanitizeAnswers(a.answers), { areas: parseInterests(profile.interests), version: a.version });
  if (r.confidence === "insufficient") redirect("/assessment");
  const p = r.profile;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-extrabold sm:text-3xl">{t("res.title")}</h1>
        <p className="rounded-2xl bg-slate-100 p-3 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-300" role="note">{t("res.disclaimer")}</p>
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">{t(`res.conf.${r.confidence}` as MessageKey)}</p>
        {p.undifferentiated && <p role="status" className="text-sm font-semibold text-amber-700 dark:text-amber-300">{t("res.flat")}</p>}
      </header>

      <ol className="space-y-4">
        {r.top.map((m: Match, i) => {
          const prof = professionById(m.professionId);
          return (
            <li key={m.professionId} className="card space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-slate-500">#{i + 1}</p>
                  <h2 className="text-xl font-extrabold">{getCareer(m.professionId)?.titles[lang] ?? m.title}</h2>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-2xl font-extrabold text-indigo-700 dark:text-indigo-300">{m.percent}</p>
                  <p className="text-xs font-bold text-slate-500">{t("res.match")}</p>
                </div>
              </div>
              <p className="chip">{t(band(m.percent))}</p>

              <section aria-label={t("res.why")} className="space-y-2 text-sm">
                <h3 className="font-extrabold">{t("res.why")}</h3>
                {m.matchedLetters.length > 0 ? (
                  <p><span className="font-bold">{t("res.whyInterests")}: </span>{m.matchedLetters.map((l) => t(`letter.${l}` as MessageKey)).join("; ")}</p>
                ) : (
                  <p className="text-slate-600 dark:text-slate-400">{t("res.noInterestMatch")}</p>
                )}
                {m.matchedConditions.length > 0 && <p><span className="font-bold">{t("res.whyConditions")}: </span>{m.matchedConditions.map((c) => t(`cond.${c}` as MessageKey)).join(", ")}</p>}
                <p><span className="font-bold">{t("res.needed")}: </span>{m.mustHave.map((s) => t(`sk.${s}` as MessageKey)).join(", ")}</p>
                {m.gaps.length > 0 && <p><span className="font-bold">{t("res.gaps")}: </span>{m.gaps.map((s) => t(`sk.${s}` as MessageKey)).join(", ")}</p>}
                {lang === "ru" && prof && prof.study.length > 0 && <p><span className="font-bold">{t("res.directions")}: </span>{prof.study.slice(0, 3).join("; ")}</p>}
              </section>

              <Link href={`/professions/${m.professionId}`} className="btn-primary w-full !text-base sm:w-auto">{t("res.try")}<ArrowRight size={18} className="ml-2" aria-hidden /></Link>
            </li>
          );
        })}
      </ol>
      {r.top.length === 0 && <p>{t("res.none")}</p>}

      <section className="card space-y-3" aria-labelledby="prof-h">
        <h2 id="prof-h" className="text-lg font-extrabold">{t("res.profileTitle")}</h2>
        <ul className="space-y-3">
          {LETTERS.map((l) => (
            <li key={l}>
              <div className="flex justify-between text-sm font-semibold"><span>{t(`letter.${l}` as MessageKey)}</span><span>{p.letters[l] ?? "—"}</span></div>
              <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"><div className="h-full rounded-full bg-indigo-500" style={{ width: `${p.letters[l] ?? 0}%` }} /></div>
            </li>
          ))}
        </ul>
      </section>

      <section className="card space-y-3" aria-labelledby="skills-h">
        <h2 id="skills-h" className="text-lg font-extrabold">{t("res.skillsTitle")}</h2>
        <ul className="space-y-3 text-sm">
          {SKILL_DIMS.map((s) => {
            const demo = (DEMONSTRABLE as readonly string[]).includes(s) ? p.demonstrated[s as (typeof DEMONSTRABLE)[number]] : null;
            const self = p.self[s];
            return (
              <li key={s} className="flex flex-wrap items-baseline justify-between gap-x-4">
                <span className="font-bold">{t(`sk.${s}` as MessageKey)}</span>
                <span className="text-slate-600 dark:text-slate-400">
                  {t("res.selfLabel")}: {self === null ? t("res.notMeasured") : `${Math.round(self * 100)}%`}
                  {demo && <> · {t("res.demoLabel")}: {demo.total ? t("res.demoValue", { correct: demo.correct, total: demo.total }) : t("res.notMeasured")}</>}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card flex items-start gap-3 !border-indigo-200 !bg-indigo-50 dark:!border-indigo-800 dark:!bg-indigo-950">
        <Sparkles size={22} className="mt-0.5 shrink-0 text-indigo-600" aria-hidden />
        <div className="space-y-3">
          <div><h2 className="font-extrabold">{t("as.refine.title")}</h2><p className="text-sm text-slate-700 dark:text-slate-300">{t("as.refine.text")}</p></div>
          <Link href="/assessment?pack=refine" className="btn-primary">{t("as.refine.start")}</Link>
        </div>
      </section>

      <ResultActions />
    </div>
  );
}
