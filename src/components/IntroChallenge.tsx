"use client";
import { useState } from "react";
import { Check, X } from "lucide-react";
import { useI18n } from "@/i18n/client";

type Result = { correct: boolean; correctIndex: number; why: string };

export function IntroChallenge({ careerId, question, options, solved }: { careerId: string; question: string; options: string[]; solved: boolean }) {
  const { t } = useI18n();
  const [choice, setChoice] = useState<number | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function check() {
    if (choice === null) return;
    setBusy(true);
    setError(false);
    try {
      const res = await fetch("/api/careers/challenge", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ careerId, choice }) });
      if (!res.ok) throw new Error("check");
      setResult(await res.json());
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card space-y-4" aria-labelledby="intro-h">
      <div>
        <h2 id="intro-h" className="text-lg font-extrabold">{t("cat.intro.title")}</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">{t("cat.intro.hint")}</p>
        {solved && !result && <p className="mt-1 text-sm font-bold text-indigo-700 dark:text-indigo-300">{t("cat.intro.solved")}</p>}
      </div>
      <p className="font-bold">{question}</p>
      <div className="space-y-2" role="group" aria-label={question}>
        {options.map((o, i) => {
          const isCorrect = result && i === result.correctIndex;
          const isWrongPick = result && !result.correct && i === choice;
          return (
            <button key={i} type="button" disabled={busy || result !== null} aria-pressed={choice === i} onClick={() => setChoice(i)}
              className={`flex min-h-[52px] w-full items-center gap-3 rounded-2xl border-2 border-b-4 px-4 py-3 text-left font-semibold transition duration-150 ${isCorrect ? "border-indigo-400 bg-indigo-50 dark:border-indigo-600 dark:bg-indigo-950" : isWrongPick ? "border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-950" : choice === i ? "border-indigo-400 bg-indigo-50 dark:border-indigo-600 dark:bg-indigo-950" : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"}`}>
              <span className="flex-1">{o}</span>
              {isCorrect && <Check size={20} aria-hidden className="text-indigo-600" />}
              {isWrongPick && <X size={20} aria-hidden className="text-red-600" />}
            </button>
          );
        })}
      </div>
      {error && <p role="alert" className="text-sm font-semibold text-red-700 dark:text-red-300">{t("cat.intro.error")}</p>}
      {result ? (
        <div role="status" className={`space-y-2 rounded-2xl p-4 ${result.correct ? "bg-indigo-50 dark:bg-indigo-950" : "bg-slate-100 dark:bg-slate-800"}`}>
          <p className="font-extrabold">{result.correct ? t("cat.intro.correct") : t("cat.intro.wrong")}</p>
          <p className="text-sm"><span className="font-bold">{t("cat.intro.why")}: </span>{result.why}</p>
          {!result.correct && <button type="button" className="btn-ghost" onClick={() => { setResult(null); setChoice(null); }}>{t("cat.intro.retry")}</button>}
        </div>
      ) : (
        <button type="button" className="btn-primary w-full sm:w-auto" disabled={choice === null || busy} onClick={check}>{t("cat.intro.check")}</button>
      )}
    </section>
  );
}
