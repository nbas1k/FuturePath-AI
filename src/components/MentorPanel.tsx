"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { MentorState } from "@/backend/mentor";
import { MAX_MESSAGE } from "@/mentor/logic";

const STARTERS = ["Объясни, с чего мне начать в этой профессии", "Дай короткое упражнение на слабый навык", "Какие вопросы мне стоит себе задать?"];

export function MentorPanel({ professionId, professionTitle, state }: { professionId: string; professionTitle: string; state: MentorState }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function send(msg: string) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/mentor", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ professionId, message: msg }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setError(json.error || "Не получилось. Попробуйте ещё раз."); return; }
      setText("");
      router.refresh();
    } catch {
      setError("Нет связи с сервером. Попробуйте ещё раз.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="card space-y-1">
        <h2 className="text-xl font-bold">Наставник по профессии «{professionTitle}»</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">Наставник знает вашу профессию, ошибки диагностики, результаты теста (если вы его проходили) и подтверждённые навыки. Готовых ответов на незавершённые задания он не даёт. Ответы пишет ИИ и они могут быть неточными.</p>
        {!state.aiAvailable && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200" role="status">ИИ сейчас не подключён, поэтому наставник недоступен. Ответы не подделываются.</p>}
      </div>

      <div className="card space-y-3" aria-live="polite">
        {state.messages.length === 0 && <p className="text-sm text-slate-500">Пока нет сообщений. Задайте вопрос или выберите подсказку ниже.</p>}
        {state.messages.map((m) => (
          <div key={m.id} className={m.role === "user" ? "text-right" : ""}>
            <div className={"inline-block max-w-[90%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-left text-sm " + (m.role === "user" ? "bg-indigo-600 text-white" : m.role === "rule" ? "bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100" : "bg-slate-100 dark:bg-slate-800")}>
              {m.role === "assistant" && <span className="mb-1 block text-xs text-slate-500">Наставник (ИИ)</span>}
              {m.role === "rule" && <span className="mb-1 block text-xs">Правило защиты заданий, это не ответ ИИ</span>}
              {m.content}
            </div>
          </div>
        ))}
        {busy && <p className="text-sm text-slate-500">Наставник думает…</p>}
      </div>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-200" role="alert">{error}</p>}

      <div className="card space-y-2">
        <div className="flex flex-wrap gap-2">
          {STARTERS.map((s) => <button key={s} className="btn-ghost !py-1 text-xs" disabled={busy} onClick={() => void send(s)}>{s}</button>)}
        </div>
        <label className="sr-only" htmlFor="mentor-input">Сообщение наставнику</label>
        <textarea id="mentor-input" className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-900" rows={3} maxLength={MAX_MESSAGE}
          value={text} onChange={(e) => setText(e.target.value)} placeholder="Спросите, что непонятно" />
        <div className="flex justify-end">
          <button className="btn-primary" disabled={busy || !text.trim()} onClick={() => void send(text)}>Отправить</button>
        </div>
      </div>
    </div>
  );
}
