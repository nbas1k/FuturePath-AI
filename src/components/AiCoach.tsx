"use client";
import { useState } from "react";

type Outcome = {
  mode: "ai" | "fallback";
  provider?: string;
  model?: string;
  reason?: string;
  data: { summary: string; focus: string[]; nextStep: string };
};

// Кнопка «Разобрать с ИИ». Сначала пользователь нажимает сам (ИИ не запускается без запроса).
// Ответ ИИ и резервный текст различаются заметно: резерв никогда не выдаётся за ответ модели.
export function AiCoach({ url, body, title, buttonLabel, hint }: { url: string; body: Record<string, unknown>; title: string; buttonLabel: string; hint: string }) {
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setError(json.error || "Не получилось получить разбор."); return; }
      setOutcome(json);
    } catch {
      setError("Нет связи с сервером. Попробуйте ещё раз.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 dark:border-indigo-900 dark:bg-indigo-950/30">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-semibold">{title}</p>
          <p className="text-xs text-slate-500">{hint}</p>
        </div>
        <button className="btn-ghost !py-1.5 text-sm" onClick={run} disabled={busy}>{busy ? "Думаем…" : buttonLabel}</button>
      </div>
      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
      {outcome && (
        <div className="fade-in space-y-3 text-sm">
          {outcome.mode === "ai" ? (
            <span className="chip">Ответ ИИ · {outcome.provider} / {outcome.model}</span>
          ) : (
            <p className="rounded-lg bg-amber-50 p-2 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
              <b>Резервный режим, это не ответ ИИ.</b> {outcome.reason}
            </p>
          )}
          <p>{outcome.data.summary}</p>
          <div>
            <p className="font-medium">На что обратить внимание</p>
            <ul className="list-disc pl-5 text-slate-600 dark:text-slate-400">{outcome.data.focus.map((f) => <li key={f}>{f}</li>)}</ul>
          </div>
          <p><b>Следующий шаг:</b> {outcome.data.nextStep}</p>
          <p className="text-xs text-slate-500">Разбор не сохраняется и не меняет баллы и правильные ответы.</p>
        </div>
      )}
    </div>
  );
}
