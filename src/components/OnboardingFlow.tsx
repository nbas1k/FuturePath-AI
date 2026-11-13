"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Compass, Cpu, FlaskConical, GraduationCap, HeartPulse, Leaf, Palette, Scale, Briefcase, Sparkles, Target, Truck, Wrench } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { LANGS, LANG_LABELS, type Lang, type MessageKey } from "@/i18n";
import { AGE_GROUPS, EDUCATION, GOALS, INTEREST_IDS, MAX_INTERESTS, isMinor } from "@/onboarding/schema";
import { Logo } from "./Logo";

const ICONS: Record<string, typeof Cpu> = {
  med: HeartPulse, it: Cpu, eng: Wrench, law: Scale, biz: Briefcase, design: Palette, edu: GraduationCap, sci: FlaskConical, logi: Truck, eco: Leaf,
};

// Шаги после приветствия: 1 язык, 2 возраст и образование, 3 цель, 4 интересы, 5 диагностика.
const TOTAL = 5;

type State = { lang: Lang; ageGroup: string | null; education: string | null; goal: string | null; interests: string[] };

export function OnboardingFlow({ initial }: { initial: State }) {
  const router = useRouter();
  const { t, lang } = useI18n();
  const [step, setStep] = useState(0);
  const [s, setS] = useState<State>({ ...initial, lang });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  async function save(patch: Record<string, unknown>): Promise<boolean> {
    setSaving(true);
    setError(false);
    try {
      const res = await fetch("/api/onboarding", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(patch) });
      if (!res.ok) throw new Error("save");
      return true;
    } catch {
      setError(true);
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function next(patch: Record<string, unknown> = {}) {
    if (Object.keys(patch).length > 0 && !(await save(patch))) return;
    setStep((v) => v + 1);
  }

  async function chooseLang(l: Lang) {
    setS((v) => ({ ...v, lang: l }));
    if (await save({ lang: l })) router.refresh(); // интерфейс переключается сразу
  }

  async function finish(href: string) {
    if (await save({ complete: true })) router.push(href);
  }

  const Option = ({ selected, onClick, title, hint, icon: Icon }: { selected: boolean; onClick: () => void; title: string; hint?: string; icon?: typeof Cpu }) => (
    <button type="button" onClick={onClick} aria-pressed={selected}
      className={`flex min-h-[56px] w-full items-center gap-3 rounded-2xl border-2 border-b-4 px-4 py-3 text-left transition duration-150 active:translate-y-[2px] active:border-b-2 ${selected ? "border-indigo-400 bg-indigo-50 dark:border-indigo-600 dark:bg-indigo-950" : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"}`}>
      {Icon && <Icon size={24} aria-hidden className={selected ? "text-indigo-600 dark:text-indigo-300" : "text-slate-500"} />}
      <span className="flex-1">
        <span className="block font-bold text-slate-900 dark:text-white">{title}</span>
        {hint && <span className="block text-sm text-slate-600 dark:text-slate-400">{hint}</span>}
      </span>
      {selected && <Check size={20} aria-hidden className="text-indigo-600 dark:text-indigo-300" />}
    </button>
  );

  const toggleInterest = (id: string) =>
    setS((v) => {
      const has = v.interests.includes(id);
      if (!has && v.interests.length >= MAX_INTERESTS) return v;
      return { ...v, interests: has ? v.interests.filter((x) => x !== id) : [...v.interests, id] };
    });

  const progress = step === 0 ? 0 : (step / TOTAL) * 100;

  return (
          <div className="flex min-h-[calc(100dvh-3rem)] flex-col">
        <header className="mb-6">
          {step === 0 ? (
            <Logo />
          ) : (
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setStep((v) => v - 1)} className="btn-ghost !min-h-[44px] !px-3" aria-label={t("common.back")}>
                <ArrowLeft size={20} aria-hidden />
              </button>
              <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800" role="progressbar" aria-valuemin={0} aria-valuemax={TOTAL} aria-valuenow={step} aria-label={t("ob.step", { n: step, total: TOTAL })}>
                <div className="h-full rounded-full bg-indigo-500 transition-[width] duration-300" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-sm font-bold text-slate-500">{step}/{TOTAL}</span>
            </div>
          )}
        </header>

        <section key={step} className="step-in flex flex-1 flex-col">
            {step === 0 && (
              <div className="flex flex-1 flex-col justify-center gap-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-indigo-100 dark:bg-indigo-950"><Sparkles size={32} className="text-indigo-600" aria-hidden /></div>
                <h1 className="text-3xl font-extrabold">{t("ob.welcome.title")}</h1>
                <p className="text-lg text-slate-600 dark:text-slate-400">{t("ob.welcome.text")}</p>
                <ul className="space-y-3">
                  {(["ob.welcome.f1", "ob.welcome.f2", "ob.welcome.f3"] as MessageKey[]).map((k) => (
                    <li key={k} className="flex items-center gap-3 font-semibold"><Check size={20} className="shrink-0 text-indigo-600" aria-hidden />{t(k)}</li>
                  ))}
                </ul>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-5">
                <div><h1 className="text-2xl font-extrabold">{t("ob.lang.title")}</h1><p className="mt-1 text-slate-600 dark:text-slate-400">{t("ob.lang.hint")}</p></div>
                <div className="space-y-3" role="group" aria-label={t("ob.lang.title")}>
                  {LANGS.map((l) => <Option key={l} selected={s.lang === l} onClick={() => chooseLang(l)} title={LANG_LABELS[l]} />)}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div><h1 className="text-2xl font-extrabold">{t("ob.age.title")}</h1><p className="mt-1 text-slate-600 dark:text-slate-400">{t("ob.age.hint")}</p></div>
                <div className="grid gap-3 sm:grid-cols-2" role="group" aria-label={t("ob.age.title")}>
                  {AGE_GROUPS.map((a) => <Option key={a} selected={s.ageGroup === a} onClick={() => setS({ ...s, ageGroup: a })} title={t(`ob.age.${a}` as MessageKey)} />)}
                </div>
                {isMinor(s.ageGroup) && <p className="rounded-2xl bg-slate-100 p-4 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-300" role="note">{t("ob.age.minorNote")}</p>}
                <div>
                  <h2 className="mb-3 text-lg font-extrabold">{t("ob.edu.title")}</h2>
                  <div className="grid gap-3 sm:grid-cols-2" role="group" aria-label={t("ob.edu.title")}>
                    {EDUCATION.map((e) => <Option key={e} selected={s.education === e} onClick={() => setS({ ...s, education: e })} title={t(`ob.edu.${e}` as MessageKey)} />)}
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <h1 className="text-2xl font-extrabold">{t("ob.goal.title")}</h1>
                <div className="space-y-3" role="group" aria-label={t("ob.goal.title")}>
                  {GOALS.map((g) => <Option key={g} selected={s.goal === g} onClick={() => setS({ ...s, goal: g })} title={t(`ob.goal.${g}` as MessageKey)} hint={t(`ob.goal.${g}Hint` as MessageKey)} icon={g === "choose" ? Compass : g === "learn" ? GraduationCap : g === "skills" ? Target : Sparkles} />)}
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-5">
                <div><h1 className="text-2xl font-extrabold">{t("ob.interests.title")}</h1><p className="mt-1 text-slate-600 dark:text-slate-400">{t("ob.interests.hint")}</p></div>
                <div className="grid gap-3 sm:grid-cols-2" role="group" aria-label={t("ob.interests.title")}>
                  {INTEREST_IDS.map((id) => <Option key={id} selected={s.interests.includes(id)} onClick={() => toggleInterest(id)} title={t(`dir.${id}` as MessageKey)} icon={ICONS[id]} />)}
                </div>
                {s.interests.length >= MAX_INTERESTS && <p className="text-sm font-semibold text-slate-500" role="status">{t("ob.interests.max")}</p>}
              </div>
            )}

            {step === 5 && (
              <div className="flex flex-1 flex-col justify-center gap-5">
                <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-indigo-100 dark:bg-indigo-950"><Compass size={32} className="text-indigo-600" aria-hidden /></div>
                <h1 className="text-2xl font-extrabold">{t("ob.diag.title")}</h1>
                <p className="text-slate-600 dark:text-slate-400">{t("ob.diag.text")}</p>
              </div>
            )}
          </section>

        <footer className="mt-8 space-y-3">
          {error && <p role="alert" className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700 dark:bg-red-950 dark:text-red-200">{t("common.saveError")}</p>}
          {step === 0 && <button className="btn-primary w-full !text-base" onClick={() => setStep(1)}>{t("ob.welcome.start")}</button>}
          {step === 1 && <button className="btn-primary w-full !text-base" disabled={saving} onClick={() => next()}>{t("common.next")}</button>}
          {step === 2 && (
            <>
              <button className="btn-primary w-full !text-base" disabled={saving || (!s.ageGroup && !s.education)} onClick={() => next({ ...(s.ageGroup ? { ageGroup: s.ageGroup } : {}), ...(s.education ? { education: s.education } : {}) })}>{t("common.next")}</button>
              <button className="btn-ghost w-full" disabled={saving} onClick={() => next()}>{t("common.skip")}</button>
            </>
          )}
          {step === 3 && (
            <>
              <button className="btn-primary w-full !text-base" disabled={saving || !s.goal} onClick={() => next({ goal: s.goal })}>{t("common.next")}</button>
              <button className="btn-ghost w-full" disabled={saving} onClick={() => next()}>{t("common.skip")}</button>
            </>
          )}
          {step === 4 && (
            <>
              <button className="btn-primary w-full !text-base" disabled={saving || s.interests.length === 0} onClick={() => next({ interests: s.interests })}>{t("common.next")}</button>
              <button className="btn-ghost w-full" disabled={saving} onClick={() => next()}>{t("common.skip")}</button>
            </>
          )}
          {step === 5 && (
            <>
              <button className="btn-primary w-full !text-base" disabled={saving} onClick={() => finish("/assessment")}>{t("ob.diag.start")}</button>
              <button className="btn-ghost w-full" disabled={saving} onClick={() => finish("/professions")}>{t("ob.diag.later")}</button>
            </>
          )}
        </footer>
      </div>
  );
}
