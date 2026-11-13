"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n/client";
import type { MessageKey } from "@/i18n";

type PubStep = { id: string; kind: "pick" | "multi" | "number"; prompt: string; options?: string[]; max?: number; unit?: string };
export type PubSim = { id: string; title: string; goal: string; scenario: string; disclaimer: string; steps: PubStep[]; stateVars: Record<string, number>; drawing?: { scale: string; rooms: { name: string; w: number; h: number }[] }; backHref: string };
type Report = { score: number; criteria: { id: string; label: string; score: number }[]; strengths: string[]; improvements: string[]; vars: Record<string, number> };

export function SimPlayer({ sim }: { sim: PubSim }) {
  const { t } = useI18n();
  const [runId, setRunId] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);
  const [answer, setAnswer] = useState<any>(null);
  const [feedback, setFeedback] = useState<{ text: string; replies?: { text: string; reply: string }[]; correct?: boolean } | null>(null);
  const [vars, setVars] = useState<Record<string, number>>(sim.stateVars);
  const [report, setReport] = useState<{ report: Report; xp: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [num, setNum] = useState("");

  const post = (body: unknown) => fetch("/api/sim/run", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

  useEffect(() => {
    post({ action: "start", simId: sim.id }).then(async (r) => { if (!r.ok) return setError(t("sim.error")); const j = await r.json(); setRunId(j.runId); const answered = Object.keys(j.state.answers).length; setIdx(Math.min(answered, sim.steps.length - 1)); setVars(j.state.vars); if (answered >= sim.steps.length) setIdx(sim.steps.length); }).catch(() => setError(t("sim.error")));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sim.id]);

  const step = sim.steps[idx];

  async function submit() {
    if (!runId || answer === null) return;
    setBusy(true); setError("");
    try {
      const r = await post({ action: "step", runId, stepId: step.id, answer });
      const j = await r.json();
      if (!r.ok) return setError(j.error ?? t("sim.error"));
      setVars(j.vars);
      setFeedback({ text: j.feedback, replies: j.replies, correct: j.correct });
    } catch { setError(t("sim.error")); } finally { setBusy(false); }
  }

  async function next() {
    setFeedback(null); setAnswer(null); setNum("");
    if (idx < sim.steps.length - 1) return setIdx(idx + 1);
    setBusy(true);
    try {
      const r = await post({ action: "finish", runId });
      const j = await r.json();
      if (!r.ok) return setError(j.error ?? t("sim.error"));
      setReport(j);
    } catch { setError(t("sim.error")); } finally { setBusy(false); }
  }

  const header = (
    <header className="space-y-2">
      <h1 className="text-2xl font-extrabold">{sim.title}</h1>
      <p className="rounded-2xl bg-slate-100 p-3 text-sm dark:bg-slate-800" role="note">{sim.disclaimer}</p>
    </header>
  );

  if (report) {
    const r = report.report;
    return (
      <div className="space-y-5">
        {header}
        <section className="card space-y-3" aria-labelledby="rep-h">
          <h2 id="rep-h" className="text-lg font-extrabold">{t("sim.report")}</h2>
          <p className="text-4xl font-extrabold text-indigo-700 dark:text-indigo-300">{Math.round(r.score * 100)}%</p>
          <p className="font-extrabold">{report.xp > 0 ? t("sim.xp", { n: report.xp }) : <span className="text-sm font-semibold text-slate-500">{t("sim.noXp")}</span>}</p>
          <ul className="space-y-2">{r.criteria.map((c) => <li key={c.id}><div className="flex justify-between text-sm font-bold"><span>{c.label}</span><span>{Math.round(c.score * 100)}%</span></div><div className="mt-1 h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"><div className="h-full rounded-full bg-indigo-500" style={{ width: `${c.score * 100}%` }} /></div></li>)}</ul>
          <p className="text-sm"><span className="font-bold">{t("sim.strengths")}: </span>{r.strengths.length ? r.strengths.join(", ") : t("sim.none")}</p>
          <p className="text-sm"><span className="font-bold">{t("sim.improve")}: </span>{r.improvements.length ? r.improvements.join(", ") : t("sim.none")}</p>
          {Object.keys(r.vars).length > 0 && <p className="text-sm"><span className="font-bold">{t("sim.state")}: </span>{Object.entries(r.vars).map(([k, v]) => `${t(`sim.var.${k}` as MessageKey)}: ${v}`).join(" · ")}</p>}
        </section>
        <Link href={sim.backHref} className="btn-ghost w-full">{t("learn.back")}</Link>
      </div>
    );
  }

  if (!step) return <div className="space-y-4">{header}<p role="status">{t("common.loading")}</p></div>;

  return (
    <div className="space-y-5">
      {header}
      <section className="card space-y-1"><p className="text-sm"><span className="font-extrabold">{t("sim.goal")}: </span>{sim.goal}</p><p className="text-sm"><span className="font-extrabold">{t("sim.scenario")}: </span>{sim.scenario}</p></section>
      {sim.drawing && (
        <figure className="card space-y-2"><figcaption className="text-sm font-bold">{t("sim.drawing")} · {sim.drawing.scale}</figcaption>
          <svg role="img" aria-label={sim.drawing.rooms.map((r) => `${r.name} ${r.w}×${r.h}`).join(", ")} viewBox="0 0 220 120" className="w-full max-w-md">
            {sim.drawing.rooms.map((r, i) => { const x = i === 0 ? 8 : 8 + sim.drawing!.rooms[0].w * 10 + 10; return <g key={r.name}><rect x={x} y={8} width={r.w * 10} height={r.h * 10} className="fill-indigo-50 stroke-indigo-600 dark:fill-indigo-950" strokeWidth="2" /><text x={x + 4} y={22} className="fill-current text-[9px] font-bold">{r.name}</text><text x={x + 4} y={34} className="fill-current text-[8px]">{r.w} × {r.h}</text></g>; })}
          </svg></figure>
      )}
      {Object.keys(vars).length > 0 && <p className="text-sm font-bold" aria-live="polite">{Object.entries(vars).map(([k, v]) => `${t(`sim.var.${k}` as MessageKey)}: ${v}`).join(" · ")}</p>}

      <section className="space-y-3" aria-labelledby="step-h">
        <h2 id="step-h" className="text-lg font-extrabold">{idx + 1}/{sim.steps.length}. {step.prompt}</h2>
        {step.kind === "pick" && <div className="space-y-2" role="group" aria-label={step.prompt}>{step.options!.map((o, i) => <button key={i} type="button" disabled={!!feedback || busy} aria-pressed={answer === i} onClick={() => setAnswer(i)} className={`flex min-h-[52px] w-full items-center rounded-2xl border-2 border-b-4 px-4 py-3 text-left font-semibold ${answer === i ? "border-indigo-400 bg-indigo-50 dark:border-indigo-600 dark:bg-indigo-950" : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900"}`}>{o}</button>)}</div>}
        {step.kind === "multi" && (
          <div className="space-y-2" role="group" aria-label={step.prompt}>
            <p className="text-sm font-semibold text-slate-500">{t("sim.pickMax", { n: step.max ?? 1 })}</p>
            {step.options!.map((o, i) => { const sel: number[] = answer ?? []; const on = sel.includes(i); return <button key={i} type="button" disabled={!!feedback || busy} aria-pressed={on} onClick={() => { const n = on ? sel.filter((x) => x !== i) : sel.length < (step.max ?? 1) ? [...sel, i] : sel; setAnswer(n.length ? n : null); }} className={`flex min-h-[52px] w-full items-center rounded-2xl border-2 border-b-4 px-4 py-3 text-left font-semibold ${on ? "border-indigo-400 bg-indigo-50 dark:border-indigo-600 dark:bg-indigo-950" : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900"}`}>{o}</button>; })}
          </div>
        )}
        {step.kind === "number" && (
          <label className="block space-y-1"><span className="text-sm font-bold">{t("sim.numberLabel")}{step.unit ? `, ${step.unit}` : ""}</span>
            <input inputMode="decimal" disabled={!!feedback || busy} value={num} onChange={(e) => { setNum(e.target.value); const v = Number(e.target.value.replace(",", ".")); setAnswer(e.target.value.trim() !== "" && Number.isFinite(v) ? v : null); }} className="min-h-[48px] w-full rounded-2xl border-2 border-slate-200 bg-white px-3 text-lg font-bold dark:border-slate-700 dark:bg-slate-900" /></label>
        )}
      </section>

      {feedback && (
        <div role="status" className="space-y-2 rounded-2xl bg-indigo-50 p-4 dark:bg-indigo-950">
          {feedback.replies?.map((r, i) => <p key={i} className="text-sm"><span className="font-bold">{r.text}</span><br /><span className="italic">{t("sim.replyLabel")}: {r.reply}</span></p>)}
          {feedback.text && <p className="text-sm font-semibold">{feedback.text}</p>}
        </div>
      )}
      {error && <p role="alert" className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700 dark:bg-red-950 dark:text-red-200">{error}</p>}
      {feedback ? <button className="btn-primary w-full !text-base" disabled={busy} onClick={next}>{idx === sim.steps.length - 1 ? t("sim.finish") : t("sim.next")}</button>
        : <button className="btn-primary w-full !text-base" disabled={busy || answer === null || !runId} onClick={submit}>{t("sim.answer")}</button>}
    </div>
  );
}
