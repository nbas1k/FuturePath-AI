"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageCircle, X, Send } from "lucide-react";
import { useI18n } from "@/i18n/client";
import type { MessageKey } from "@/i18n";
import { MAX_MESSAGE_CHARS, type MentorMode } from "@/learn/mentorPrompt";
import { lessonSlug } from "@/learn/slug";

const MODES: MentorMode[] = ["explain_simple", "example", "hint", "ask_question", "explain_error", "suggest_practice"];
type Msg = { role: string; text: string };

// Панель ИИ-наставника. Если ИИ не подключён, честно говорим об этом и показываем рекомендации тренировки (они считаются без ИИ).
export function LessonMentor({ lessonId, exerciseId }: { lessonId: string; exerciseId?: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<{ aiEnabled: boolean; history: Msg[]; practice: { lessonId: string; title: string; bestScore: number }[] } | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || state) return;
    fetch(`/api/learn/mentor?lessonId=${encodeURIComponent(lessonId)}`).then((r) => r.json()).then((j) => { setState(j); setMsgs(j.history ?? []); }).catch(() => setError(t("mentor.error")));
  }, [open, state, lessonId, t]);

  async function ask(mode: MentorMode, message = "") {
    setBusy(true); setError("");
    if (message) setMsgs((m) => [...m, { role: "user", text: message }]);
    try {
      const res = await fetch("/api/learn/mentor", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ lessonId, exerciseId, mode, message }) });
      const j = await res.json();
      if (!res.ok) { setError(res.status === 503 ? t("mentor.unavailable") : j.error ?? t("mentor.error")); return; }
      setMsgs((m) => [...m, { role: "assistant", text: j.reply }]);
      setInput("");
    } catch { setError(t("mentor.error")); } finally { setBusy(false); }
  }

  return (
    <>
      <button type="button" className="btn-ghost w-full" onClick={() => setOpen(true)}><MessageCircle size={18} className="mr-2" aria-hidden />{t("mentor.open")}</button>
      {open && (
        <div role="dialog" aria-modal="true" aria-label={t("mentor.title")} className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 sm:items-center">
          <div className="flex max-h-[85dvh] w-full max-w-xl flex-col gap-3 overflow-y-auto rounded-t-3xl bg-white p-4 dark:bg-slate-900 sm:rounded-3xl">
            <div className="flex items-center justify-between"><h2 className="text-lg font-extrabold">{t("mentor.title")}</h2><button type="button" className="btn-ghost !min-h-[44px] !px-3" aria-label={t("mentor.close")} onClick={() => setOpen(false)}><X size={20} aria-hidden /></button></div>
            {state && !state.aiEnabled && <p role="status" className="rounded-2xl bg-slate-100 p-3 text-sm font-semibold dark:bg-slate-800">{t("mentor.unavailable")}</p>}
            {state && state.practice.length > 0 && (
              <section className="space-y-2" aria-label={t("mentor.practice")}>
                <h3 className="text-sm font-extrabold">{t("mentor.practice")}</h3>
                <ul className="space-y-2">{state.practice.map((p) => <li key={p.lessonId}><Link href={`/learn/lesson/${lessonSlug(p.lessonId)}`} className="card block !p-3 text-sm font-bold">{p.title} · {Math.round(p.bestScore * 100)}%</Link></li>)}</ul>
              </section>
            )}
            {state?.aiEnabled && (
              <>
                <div className="flex flex-wrap gap-2" role="group" aria-label={t("mentor.title")}>
                  {MODES.map((m) => <button key={m} type="button" disabled={busy} className="chip min-h-[44px] !px-3" onClick={() => ask(m)}>{t(`mentor.mode.${m}` as MessageKey)}</button>)}
                </div>
                <ul className="space-y-2" aria-live="polite">
                  {msgs.map((m, i) => <li key={i} className={`rounded-2xl p-3 text-sm ${m.role === "user" ? "ml-8 bg-indigo-50 dark:bg-indigo-950" : "mr-8 bg-slate-100 dark:bg-slate-800"}`}>{m.text}</li>)}
                  {busy && <li className="text-sm text-slate-500">{t("mentor.thinking")}</li>}
                </ul>
                <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (input.trim()) ask("dialog", input.trim()); }}>
                  <input value={input} maxLength={MAX_MESSAGE_CHARS} onChange={(e) => setInput(e.target.value)} placeholder={t("mentor.placeholder")} aria-label={t("mentor.placeholder")} className="min-h-[48px] flex-1 rounded-2xl border-2 border-slate-200 bg-white px-3 font-semibold dark:border-slate-700 dark:bg-slate-900" />
                  <button type="submit" disabled={busy || !input.trim()} className="btn-primary !px-4" aria-label={t("mentor.send")}><Send size={18} aria-hidden /></button>
                </form>
                <p className="text-xs text-slate-500">{t("mentor.note")}</p>
              </>
            )}
            {error && <p role="alert" className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700 dark:bg-red-950 dark:text-red-200">{error}</p>}
          </div>
        </div>
      )}
    </>
  );
}
