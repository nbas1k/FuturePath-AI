"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, X, ArrowRight } from "lucide-react";
import { useI18n } from "@/i18n/client";
import type { MessageKey } from "@/i18n";
import type { PlayLesson } from "@/backend/learn";
import { LessonMentor } from "./LessonMentor";

type Feedback = { correct: boolean; score: number; explanation: string; reveal: any; optionFeedback?: string; unverified: boolean };
type Summary = { score: number; passed: boolean; xp: number; mistakes: { exerciseId: string; prompt: string; explanation: string }[]; nextLessonId: string | null; unverifiedCount: number };

const optBtn = (selected: boolean, state?: "good" | "bad") =>
  `flex min-h-[52px] w-full items-center gap-3 rounded-2xl border-2 border-b-4 px-4 py-3 text-left font-semibold transition duration-150 active:translate-y-[2px] active:border-b-2 disabled:active:translate-y-0 ${
    state === "good" ? "border-indigo-400 bg-indigo-50 dark:border-indigo-600 dark:bg-indigo-950" : state === "bad" ? "border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-950"
    : selected ? "border-indigo-400 bg-indigo-50 dark:border-indigo-600 dark:bg-indigo-950" : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"}`;

function LessonPlayerInner({ lesson, attemptId, answered, trackHref }: { lesson: PlayLesson; attemptId: string; answered: Record<string, { correct: boolean; score: number }>; trackHref: string }) {
  const router = useRouter();
  const { t } = useI18n();
  const firstOpen = lesson.exercises.findIndex((e) => !answered[e.id]);
  const resumed = Object.keys(answered).length > 0;
  const [stage, setStage] = useState<"intro" | "exercises" | "result">(resumed ? "exercises" : "intro");
  const [idx, setIdx] = useState(firstOpen === -1 ? lesson.exercises.length - 1 : firstOpen);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [answer, setAnswer] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [theoryIdx, setTheoryIdx] = useState(0);
  const [matchSel, setMatchSel] = useState<(number | "")[]>([]);
  const [seq, setSeq] = useState<number[]>([]);
  const [fills, setFills] = useState<string[]>([]);
  const [text, setText] = useState("");

  const ex = lesson.exercises[idx];
  const total = lesson.exercises.length;

  async function post(url: string, body: unknown) {
    try { return await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }); } catch { return null; }
  }

  async function check() {
    if (answer === null) return;
    setBusy(true); setError("");
    const res = await post("/api/learn/answer", { attemptId, exerciseId: ex.id, answer });
    setBusy(false);
    if (!res?.ok) return setError(t("lp.error"));
    setFeedback(await res.json());
  }

  async function next() {
    setFeedback(null); setAnswer(null); setError(""); setMatchSel([]); setSeq([]); setFills([]); setText("");
    if (idx < total - 1) return setIdx(idx + 1);
    setBusy(true);
    const res = await post("/api/learn/complete", { attemptId });
    setBusy(false);
    if (!res?.ok) return setError(t("lp.error"));
    setSummary(await res.json());
    setStage("result");
  }

  const theory = lesson.theory;
  const title = <h1 className="text-xl font-extrabold">{lesson.title}</h1>;

  // ---------- Введение: цели и теория ----------
  if (stage === "intro") {
    const block = theory[theoryIdx];
    const last = theoryIdx >= theory.length - 1;
    return (
      <div className="flex min-h-[calc(100dvh-3rem)] flex-col">
        <header className="mb-6 flex items-center gap-3"><Link href={trackHref} className="btn-ghost !min-h-[44px] !px-3" aria-label={t("lp.exit")}><X size={20} aria-hidden /></Link>{title}</header>
        <div key={theoryIdx} className="step-in flex flex-1 flex-col gap-4">
          {theoryIdx === 0 && lesson.objectives.length > 0 && (
            <section className="card space-y-2"><h2 className="font-extrabold">{t("lp.goals")}</h2><ul className="list-disc space-y-1 pl-5 text-sm">{lesson.objectives.map((o) => <li key={o}>{o}</li>)}</ul></section>
          )}
          {block && (
            <section className={`card space-y-2 ${block.kind === "example" ? "!border-indigo-200 !bg-indigo-50 dark:!border-indigo-800 dark:!bg-indigo-950" : ""}`}>
              <h2 className="text-sm font-extrabold text-indigo-700 dark:text-indigo-300">{t(block.kind === "example" ? "lp.example" : "lp.explain")}</h2>
              <p className="text-lg leading-relaxed">{block.text}</p>
            </section>
          )}
        </div>
        <footer className="mt-8">
          <button className="btn-primary w-full !text-base" onClick={() => (last || !block ? setStage("exercises") : setTheoryIdx(theoryIdx + 1))}>{last || !block ? t("lp.begin") : t("lp.next")}</button>
        </footer>
      </div>
    );
  }

  // ---------- Результат ----------
  if (stage === "result" && summary) {
    const pct = Math.round(summary.score * 100);
    return (
      <div className="space-y-5">
        <header className="space-y-1"><h1 className="text-2xl font-extrabold">{t("lp.result.title")}</h1><p className="text-slate-600 dark:text-slate-400">{lesson.title}</p></header>
        <section className="card flex items-center justify-between gap-4">
          <div><p className="text-sm font-bold text-slate-500">{t("lp.result.score")}</p><p className="text-4xl font-extrabold text-indigo-700 dark:text-indigo-300">{pct}%</p></div>
          <p className="text-right font-extrabold">{summary.xp > 0 ? t("lp.result.xp", { n: summary.xp }) : summary.passed ? <span className="text-sm font-semibold text-slate-500">{t("lp.result.noXp")}</span> : null}</p>
        </section>
        <p role="status" className="font-semibold">{!summary.passed ? t("lp.result.failed") : pct >= 85 ? t("lp.result.rec.high") : t("lp.result.rec.mid")}</p>
        <section className="card space-y-3" aria-labelledby="mist-h">
          <h2 id="mist-h" className="font-extrabold">{t("lp.result.mistakes")}</h2>
          {summary.mistakes.length === 0 ? <p className="text-sm">{t("lp.result.none")}</p> : (
            <ul className="space-y-3">{summary.mistakes.map((m) => <li key={m.exerciseId} className="space-y-1 text-sm"><p className="font-bold">{m.prompt}</p><p className="text-slate-700 dark:text-slate-300">{m.explanation}</p></li>)}</ul>
          )}
          {summary.unverifiedCount > 0 && <p className="text-xs text-slate-500">{t("lp.result.unverified")}</p>}
        </section>
        <div className="space-y-3">
          {summary.nextLessonId && <Link href={`/learn/lesson/${summary.nextLessonId.replace(/\//g, "~")}`} className="btn-primary w-full !text-base">{t("lp.result.next")}<ArrowRight size={18} className="ml-2" aria-hidden /></Link>}
          <Link href={trackHref} className="btn-ghost w-full">{t("lp.result.back")}</Link>
          <button className="btn-ghost w-full" onClick={() => router.refresh()}>{t("lp.result.retry")}</button>
        </div>
      </div>
    );
  }

  // ---------- Упражнения ----------
  const data: any = ex.data;
  const locked = feedback !== null;
  const verdict = feedback ? (feedback.correct ? "good" : feedback.score > 0 ? "partial" : "bad") : null;

  return (
    <div className="flex min-h-[calc(100dvh-3rem)] flex-col">
      <header className="mb-5 flex items-center gap-3">
        <Link href={trackHref} className="btn-ghost !min-h-[44px] !px-3" aria-label={t("lp.exit")}><X size={20} aria-hidden /></Link>
        <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={idx} aria-label={lesson.title}>
          <div className="h-full rounded-full bg-indigo-500 transition-[width] duration-300" style={{ width: `${((idx + (feedback ? 1 : 0)) / total) * 100}%` }} />
        </div>
        <span className="text-sm font-bold text-slate-500">{idx + 1}/{total}</span>
      </header>
      {resumed && idx === firstOpen && !feedback && <p role="status" className="mb-3 rounded-2xl bg-indigo-50 p-3 text-sm font-semibold text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200">{t("lp.resume", { n: idx + 1 })}</p>}

      <div key={ex.id} className="step-in flex flex-1 flex-col gap-4">
        {data.scenario && <blockquote className="rounded-2xl border-2 border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">{data.scenario}</blockquote>}
        {ex.type !== "fill" && <h1 className="text-xl font-extrabold leading-snug">{ex.prompt}</h1>}

        {(ex.type === "choice" || ex.type === "case") && (
          <div className="space-y-3" role="group" aria-label={ex.prompt}>
            {data.options.map((o: string, i: number) => {
              const good = feedback && feedback.reveal?.correct === i;
              const bad = feedback && !feedback.correct && answer === i;
              return <button key={i} type="button" disabled={locked || busy} aria-pressed={answer === i} className={optBtn(answer === i, good ? "good" : bad ? "bad" : undefined)} onClick={() => setAnswer(i)}><span className="flex-1">{o}</span>{good && <Check size={20} aria-hidden />}{bad && <X size={20} aria-hidden />}</button>;
            })}
          </div>
        )}

        {ex.type === "multi" && (
          <div className="space-y-3" role="group" aria-label={ex.prompt}>
            <p className="text-sm font-semibold text-slate-500">{t("lp.multiHint")}</p>
            {data.options.map((o: string, i: number) => {
              const sel: number[] = answer ?? [];
              const isSel = sel.includes(i);
              const should = feedback?.reveal?.correct?.includes(i);
              return <button key={i} type="button" disabled={locked || busy} aria-pressed={isSel} className={optBtn(isSel, feedback ? (should ? "good" : isSel ? "bad" : undefined) : undefined)} onClick={() => setAnswer(isSel ? sel.filter((x) => x !== i) : [...sel, i])}><span className="flex-1">{o}</span>{feedback && should && <Check size={20} aria-hidden />}</button>;
            })}
          </div>
        )}

        {ex.type === "match" && (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-slate-500">{t("lp.matchHint")}</p>
            {data.left.map((l: string, i: number) => {
              const sel: (number | "")[] = data.left.map((_: unknown, k: number) => matchSel[k] ?? "");
              return (
                <label key={i} className="card block space-y-2 !p-3">
                  <span className="block font-bold">{l}</span>
                  <select disabled={locked || busy} value={sel[i]} onChange={(e) => { const n = [...sel]; n[i] = e.target.value === "" ? "" : Number(e.target.value); setMatchSel(n); setAnswer(n.every((x) => x !== "") && new Set(n).size === n.length ? n : null); }}
                    className="min-h-[44px] w-full rounded-xl border-2 border-slate-200 bg-white px-3 font-semibold dark:border-slate-700 dark:bg-slate-900">
                    <option value="">{t("lp.matchChoose")}</option>
                    {data.right.map((r: string, j: number) => <option key={j} value={j}>{r}</option>)}
                  </select>
                  {feedback && feedback.reveal?.map && <span className="block text-sm text-indigo-700 dark:text-indigo-300">→ {data.right[feedback.reveal.map[i]]}</span>}
                </label>
              );
            })}
          </div>
        )}

        {ex.type === "order" && (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-slate-500">{t("lp.orderHint")}</p>
            {data.items.map((it: string, i: number) => {
                            const pos = seq.indexOf(i);
              return <button key={i} type="button" disabled={locked || busy || pos !== -1} className={optBtn(pos !== -1)} onClick={() => { const n = [...seq, i]; setSeq(n); setAnswer(n.length === data.items.length ? n : null); }}>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-extrabold dark:bg-slate-800">{pos === -1 ? "" : pos + 1}</span><span className="flex-1">{it}</span></button>;
            })}
            {!locked && seq.length > 0 && <button type="button" className="btn-ghost" onClick={() => { setSeq([]); setAnswer(null); }}>{t("lp.orderReset")}</button>}
            {feedback && feedback.reveal?.order && <p className="text-sm text-indigo-700 dark:text-indigo-300">{feedback.reveal.order.map((k: number) => data.items[k]).join(" → ")}</p>}
          </div>
        )}

        {ex.type === "fill" && (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-slate-500">{t("lp.fillHint")}</p>
            <p className="text-xl font-extrabold leading-relaxed">
              {ex.prompt.split("___").map((part, i, arr) => (
                <span key={i}>{part}{i < arr.length - 1 && (
                  <input aria-label={`${i + 1}`} disabled={locked || busy} value={fills[i] ?? ""} onChange={(e) => { const n = Array.from({ length: data.blanks }, (_, k) => fills[k] ?? ""); n[i] = e.target.value; setFills(n); setAnswer(n.every((x) => x.trim() !== "") ? n : null); }}
                    className="mx-1 inline-block min-h-[44px] w-40 rounded-xl border-2 border-slate-300 bg-white px-3 text-base font-semibold dark:border-slate-600 dark:bg-slate-900" />
                )}</span>
              ))}
            </p>
            {feedback && feedback.reveal?.blanks && <p className="text-sm text-indigo-700 dark:text-indigo-300">{feedback.reveal.blanks.join(", ")}</p>}
          </div>
        )}

        {ex.type === "text" && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-500">{t("lp.textHint")}</p>
            <textarea aria-label={ex.prompt} disabled={locked || busy} rows={5} maxLength={2000} placeholder={t("lp.textPlaceholder")} value={text} onChange={(e) => { setText(e.target.value); setAnswer(e.target.value.trim() ? e.target.value : null); }}
              className="w-full rounded-2xl border-2 border-slate-200 bg-white p-3 font-semibold outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-900" />
            <p className="text-xs text-slate-500">{t("lp.textNote")}</p>
          </div>
        )}

        {ex.type === "project" && (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-slate-500">{t("lp.projectHint")}</p>
            {data.checklist.map((c: string, i: number) => {
              const checked: boolean[] = answer?.checked ?? data.checklist.map(() => false);
              return (
                <label key={i} className="card flex min-h-[52px] items-center gap-3 !p-3 font-semibold">
                  <input type="checkbox" className="h-5 w-5" disabled={locked || busy} checked={checked[i]} onChange={() => { const n = [...checked]; n[i] = !n[i]; setAnswer({ checked: n }); }} />{c}
                </label>
              );
            })}
            <p className="text-xs text-slate-500">{t("lp.unverified")}</p>
          </div>
        )}
      </div>

      <footer className="mt-6 space-y-3">
        {error && <p role="alert" className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700 dark:bg-red-950 dark:text-red-200">{error}</p>}
        {feedback && (
          <div role="status" className={`space-y-1 rounded-2xl p-4 ${verdict === "good" ? "bg-indigo-100 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-100" : verdict === "partial" ? "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100" : "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-100"}`}>
            <p className="font-extrabold">{t(verdict === "good" ? "lp.correct" : verdict === "partial" ? "lp.partial" : "lp.wrong")}</p>
            {feedback.optionFeedback && <p className="text-sm">{feedback.optionFeedback}</p>}
            <p className="text-sm"><span className="font-bold">{t("lp.why")}: </span>{feedback.explanation}</p>
          </div>
        )}
        <LessonMentor lessonId={lesson.id} exerciseId={ex.id} />
        {feedback ? <button className="btn-primary w-full !text-base" disabled={busy} onClick={next}>{t("lp.continue")}</button>
          : <button className="btn-primary w-full !text-base" disabled={busy || answer === null} onClick={check}>{t("lp.check")}</button>}
      </footer>
    </div>
  );
}

// Попытка создаётся через API (route handler), потому что серверная страница не может выставлять cookie профиля.
export function LessonPlayer({ lesson, trackHref }: { lesson: PlayLesson; trackHref: string }) {
  const { t } = useI18n();
  const [state, setState] = useState<{ attemptId: string; answered: Record<string, { correct: boolean; score: number }> } | "locked" | "error" | null>(null);
  useEffect(() => {
    let alive = true;
    fetch("/api/learn/start", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ lessonId: lesson.id }) })
      .then(async (r) => { if (!alive) return; if (r.status === 403) return setState("locked"); if (!r.ok) return setState("error"); const j = await r.json(); setState({ attemptId: j.attemptId, answered: j.answered }); })
      .catch(() => alive && setState("error"));
    return () => { alive = false; };
  }, [lesson.id]);

  if (state === null) return <p role="status" className="py-10 text-center font-semibold text-slate-500">{t("common.loading")}</p>;
  if (state === "locked" || state === "error")
    return (
      <div className="space-y-4">
        <p role="alert" className="rounded-2xl bg-slate-100 p-4 font-semibold dark:bg-slate-800">{state === "locked" ? t("lp.locked") : t("lp.errorStart")}</p>
        <Link href={trackHref} className="btn-ghost">{t("lp.result.back")}</Link>
      </div>
    );
  return <LessonPlayerInner lesson={lesson} attemptId={state.attemptId} answered={state.answered} trackHref={trackHref} />;
}