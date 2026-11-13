"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ScenariosState } from "@/backend/scenarios";

export function ScenariosPanel({ professionId, professionTitle, state }: { professionId: string; professionTitle: string; state: ScenariosState }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/scenarios", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ professionId }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setError(json.error || "Не получилось. Попробуйте ещё раз."); return; }
      router.refresh();
    } catch {
      setError("Нет связи с сервером.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="card space-y-2">
        <h2 className="text-xl font-bold">Сценарии для профессии «{professionTitle}» до 2030–2035 годов</h2>
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">Это не прогноз и не факт. ИИ описывает три возможных сценария, чтобы вы подумали, как подготовиться. Реальное будущее может быть другим.</p>
        {!state.aiAvailable && <p className="text-sm text-slate-500">ИИ сейчас не подключён, сценарии построить нельзя.</p>}
        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-200" role="alert">{error}</p>}
        <button className="btn-primary" disabled={busy || !state.aiAvailable} onClick={() => void generate()}>{busy ? "ИИ строит сценарии…" : state.saved ? "Построить заново" : "Построить сценарии"}</button>
      </div>

      {state.saved && (
        <>
          <p className="text-xs text-slate-500">Построено моделью ИИ {state.saved.date}. Данные профессии взяты из каталога, цифры не используются.</p>
          <div className="grid gap-4 sm:grid-cols-3">
            {state.saved.data.scenarios.map((s) => (
              <article key={s.name} className="card space-y-2 text-sm">
                <h3 className="font-semibold">{s.name}</h3>
                <p>{s.description}</p>
                <div><p className="text-xs font-medium text-slate-500">Признаки</p><ul className="list-disc pl-5">{s.signals.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
                <div><p className="text-xs font-medium text-slate-500">Что можно сделать уже сейчас</p><ul className="list-disc pl-5">{s.actions.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
