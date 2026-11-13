"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/i18n/client";
import type { MessageKey } from "@/i18n";

export type PubCodeSim = { id: string; title: string; goal: string; scenario: string; disclaimer: string; starter: string; fnName: string; tests: { args: unknown[]; expected: unknown; label: string }[]; hints: string[]; backHref: string };
type TestRes = { label: string; ok: boolean; got?: string; error?: string };

// Код выполняется в Web Worker (изолированный поток браузера) без доступа к сети и DOM; сервер код не запускает.
const WORKER_SRC = `
self.onmessage = (e) => {
  const { code, fnName, tests } = e.data;
  self.fetch = undefined; self.XMLHttpRequest = undefined; self.WebSocket = undefined; self.importScripts = undefined;
  let fn;
  try { fn = new Function(code + "\\nreturn typeof " + fnName + " === 'function' ? " + fnName + " : undefined;")(); }
  catch (err) { self.postMessage({ fatal: err && err.name || "Error" }); return; }
  if (!fn) { self.postMessage({ fatal: "Missing" }); return; }
  const out = [];
  for (const t of tests) {
    try { const got = fn(...JSON.parse(JSON.stringify(t.args))); out.push({ label: t.label, ok: JSON.stringify(got) === JSON.stringify(t.expected), got: JSON.stringify(got) }); }
    catch (err) { out.push({ label: t.label, ok: false, error: (err && err.name || "Error") }); }
  }
  self.postMessage({ results: out });
};`;

export function CodeSim({ sim }: { sim: PubCodeSim }) {
  const { t } = useI18n();
  const [code, setCode] = useState(sim.starter);
  const [results, setResults] = useState<TestRes[] | null>(null);
  const [fatal, setFatal] = useState("");
  const [running, setRunning] = useState(false);
  const [hint, setHint] = useState(0);
  const [sent, setSent] = useState<{ xp: number } | null>(null);
  const [error, setError] = useState("");
  const worker = useRef<Worker | null>(null);

  const explain = (name: string) => t(name === "SyntaxError" ? "code.err.syntax" : name === "ReferenceError" ? "code.err.reference" : name === "TypeError" ? "code.err.type" : name === "Missing" ? "code.err.missing" : "code.err.other");

  function run() {
    setRunning(true); setResults(null); setFatal(""); setError("");
    worker.current?.terminate();
    const w = new Worker(URL.createObjectURL(new Blob([WORKER_SRC], { type: "text/javascript" })));
    worker.current = w;
    const timer = setTimeout(() => { w.terminate(); setRunning(false); setFatal(t("code.timeout")); }, 2000);
    w.onmessage = (e) => { clearTimeout(timer); w.terminate(); setRunning(false); if (e.data.fatal) setFatal(explain(e.data.fatal)); else setResults(e.data.results); };
    w.onerror = () => { clearTimeout(timer); w.terminate(); setRunning(false); setFatal(explain("Error")); };
    w.postMessage({ code, fnName: sim.fnName, tests: sim.tests });
  }

  const passed = results?.filter((r) => r.ok).length ?? 0;

  async function submit() {
    if (!results) return;
    setError("");
    try {
      const r = await fetch("/api/sim/run", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "finish_code", simId: sim.id, passed, total: sim.tests.length }) });
      const j = await r.json();
      if (!r.ok) return setError(j.error ?? t("sim.error"));
      setSent({ xp: j.xp });
    } catch { setError(t("sim.error")); }
  }

  return (
    <div className="space-y-5">
      <header className="space-y-2"><h1 className="text-2xl font-extrabold">{sim.title}</h1><p className="rounded-2xl bg-slate-100 p-3 text-sm dark:bg-slate-800" role="note">{t("code.sandbox")}</p></header>
      <section className="card space-y-1"><p className="text-sm"><span className="font-extrabold">{t("sim.goal")}: </span>{sim.goal}</p><p className="text-sm"><span className="font-extrabold">{t("sim.scenario")}: </span>{sim.scenario}</p></section>
      <label className="block space-y-1"><span className="text-sm font-bold">{t("code.editor")}</span>
        <textarea value={code} onChange={(e) => setCode(e.target.value)} spellCheck={false} rows={10}
          onKeyDown={(e) => { if (e.key === "Tab") { e.preventDefault(); const el = e.currentTarget; const s = el.selectionStart; setCode(code.slice(0, s) + "  " + code.slice(el.selectionEnd)); requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = s + 2; }); } }}
          className="w-full rounded-2xl border-2 border-slate-300 bg-slate-950 p-3 font-mono text-sm text-slate-50 outline-none focus:border-indigo-400" />
      </label>
      <div className="flex flex-wrap gap-3">
        <button className="btn-primary" disabled={running} onClick={run}>{running ? t("code.running") : t("code.run")}</button>
        {hint < sim.hints.length && <button className="btn-ghost" onClick={() => setHint(hint + 1)}>{t("code.hint")}</button>}
      </div>
      {hint > 0 && <ul className="space-y-1 text-sm" aria-label={t("code.hint")}>{sim.hints.slice(0, hint).map((h) => <li key={h} className="rounded-xl bg-indigo-50 p-2 dark:bg-indigo-950">{h}</li>)}</ul>}
      {fatal && <p role="alert" className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700 dark:bg-red-950 dark:text-red-200">{fatal}</p>}
      {results && (
        <section className="card space-y-2" aria-live="polite">
          <p className="font-extrabold">{t("code.passed", { a: passed, b: results.length })}</p>
          <ul className="space-y-1 text-sm">{results.map((r) => <li key={r.label} className={r.ok ? "text-indigo-700 dark:text-indigo-300" : "text-red-700 dark:text-red-300"}>{r.ok ? "✓" : "✗"} {r.label}{!r.ok && (r.error ? ` — ${explain(r.error)}` : r.got !== undefined ? ` (получено: ${r.got})` : "")}</li>)}</ul>
          {!sent ? <button className="btn-primary" onClick={submit}>{t("code.submit")}</button> : <p role="status" className="font-bold">{t("code.sent")}. {sent.xp > 0 ? t("sim.xp", { n: sent.xp }) : t("sim.noXp")}</p>}
        </section>
      )}
      {error && <p role="alert" className="text-sm font-semibold text-red-700">{error}</p>}
      <Link href={sim.backHref} className="btn-ghost w-full">{t("learn.back")}</Link>
    </div>
  );
}
export type { MessageKey };
