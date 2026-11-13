"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { SimState } from "@/backend/simulator";
import { METRIC_LABELS, type Effects } from "@/data/simulator";

function Bars({ m }: { m: Effects }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3" aria-label="Метрики дня">
      {(Object.keys(METRIC_LABELS) as (keyof Effects)[]).map((k) => (
        <div key={k}>
          <div className="mb-1 flex justify-between text-xs"><span>{METRIC_LABELS[k]}</span><span>{m[k]} из 10</span></div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all" style={{ width: `${m[k] * 10}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

const sign = (n: number) => (n > 0 ? `+${n}` : `${n}`);

export function SimulatorPanel({ professionId, state }: { professionId: string; state: SimState }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function post(url: string, body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ professionId, ...body }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setError(json.error || "Не получилось. Попробуйте ещё раз."); return; }
      router.refresh();
    } catch {
      setError("Нет связи с сервером. Попробуйте ещё раз.");
    } finally {
      setBusy(false);
    }
  }

  const finished = state.run?.finished ?? false;
  return (
    <div className="space-y-5">
      <div className="card space-y-2">
        <h2 className="text-xl font-bold">{state.title}</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">{state.intro}</p>
        <p className="text-xs text-slate-500">Это учебная модель рабочего дня. Последствия упрощены и не предсказывают реальную работу.</p>
        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-200" role="alert">{error}</p>}
      </div>

      {!state.run && (
        <div className="card text-center">
          <button className="btn-primary" disabled={busy} onClick={() => void post("/api/sim/start", {})}>{busy ? "Запускаем…" : "Начать рабочий день"}</button>
        </div>
      )}

      {state.run && state.metrics && (
        <div className="card space-y-3">
          <div className="flex items-center justify-between text-sm">
            <p className="font-semibold">{finished ? "День завершён" : `Ситуация ${state.step + 1} из ${state.total}`}</p>
            {state.finishedRuns > 0 && <span className="chip">Пройдено полностью: {state.finishedRuns}</span>}
          </div>
          <Bars m={state.metrics} />
        </div>
      )}

      {state.history.length > 0 && (
        <ol className="space-y-3">
          {state.history.map((h, i) => (
            <li key={i} className="card space-y-2 !p-4">
              <p className="text-sm font-medium">{i + 1}. {h.situation}</p>
              <p className="text-sm"><b>Ваше решение:</b> {h.chosen}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400"><b>Последствие:</b> {h.consequence}</p>
              <p className="text-xs text-slate-500">
                Качество {sign(h.effects.quality)}, сроки {sign(h.effects.time)}, доверие {sign(h.effects.trust)}.{" "}
                {h.wasBest ? "Это был сильный вариант." : `Сильнее было бы: ${h.best}.`}
              </p>
            </li>
          ))}
        </ol>
      )}

      {state.current && !finished && (
        <div className="card space-y-3">
          <p className="font-medium">{state.current.text}</p>
          <div className="space-y-2">
            {state.current.options.map((o, idx) => (
              <button key={idx} disabled={busy} onClick={() => void post("/api/sim/choose", { situationIndex: state.step, optionIndex: idx })}
                className="w-full rounded-xl border border-slate-200 p-3 text-left text-sm transition hover:border-indigo-400 dark:border-slate-700">
                {o}
              </button>
            ))}
          </div>
        </div>
      )}

      {finished && state.verdict && (
        <div className="card space-y-3">
          <h3 className="font-semibold">Итог дня</h3>
          <p className="text-sm">{state.verdict.text}</p>
          <button className="btn-ghost" disabled={busy} onClick={() => void post("/api/sim/start", {})}>Пройти заново</button>
        </div>
      )}
    </div>
  );
}
