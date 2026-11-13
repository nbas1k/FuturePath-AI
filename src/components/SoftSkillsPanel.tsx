"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { SoftState } from "@/backend/softSkills";

const LEVEL = ["", "лёгкая", "средняя", "сложная"];

export function SoftSkillsPanel({ state }: { state: SoftState }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function post(url: string, body: Record<string, unknown> = {}) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setError(json.error || "Не получилось. Попробуйте ещё раз."); return; }
      router.refresh();
    } catch {
      setError("Нет связи с сервером. Попробуйте ещё раз.");
    } finally {
      setBusy(false);
    }
  }

  const last = state.review[state.review.length - 1];
  return (
    <div className="space-y-5">
      <div className="card space-y-2">
        <h2 className="text-xl font-bold">Мягкие навыки в рабочих ситуациях</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">{state.total} ситуаций о коммуникации, командной работе, времени и решении проблем. Если выбираете сильный вариант, следующая ситуация становится сложнее, если слабый, то проще. Это упражнение на размышление, а не психологический тест.</p>
        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-200" role="alert">{error}</p>}
      </div>

      {state.phase === "none" && (
        <div className="card text-center"><button className="btn-primary" disabled={busy} onClick={() => void post("/api/soft/start")}>{busy ? "Запускаем…" : "Начать упражнение"}</button></div>
      )}

      {state.phase === "playing" && state.current && (
        <div className="space-y-3">
          {last && (
            <div className="card space-y-1 border-indigo-200 text-sm dark:border-indigo-900">
              <p className="text-xs text-slate-500">Предыдущая ситуация: {last.points} из 2 баллов</p>
              <p>{last.why}</p>
            </div>
          )}
          <div className="card space-y-3">
            <p className="text-xs text-slate-500">Ситуация {state.round} из {state.total} · сложность: {LEVEL[state.current.level]}</p>
            <p className="font-semibold">{state.current.text}</p>
            <div className="space-y-2">
              {state.current.options.map((o, i) => (
                <button key={i} className="btn-ghost w-full !justify-start text-left" disabled={busy} onClick={() => void post("/api/soft/choose", { situationId: state.current!.id, option: i })}>{o}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {state.phase === "done" && state.summary && (
        <div className="space-y-4">
          <div className="card space-y-3">
            <h3 className="font-semibold">Итог: {state.summary.total} из {state.summary.max} баллов · достигнутая сложность: {LEVEL[state.summary.highestLevel]}</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">{state.summary.text}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {state.summary.bySkill.map((s) => (
                <div key={s.skill}>
                  <div className="mb-1 flex justify-between text-xs"><span>{s.label}</span><span>{s.points} из {s.max}</span></div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" style={{ width: `${(s.points / s.max) * 100}%` }} /></div>
                </div>
              ))}
            </div>
          </div>
          <div className="card space-y-3">
            <h4 className="font-semibold">Разбор решений</h4>
            {state.review.map((r, i) => (
              <div key={i} className="space-y-1 border-t border-slate-200 pt-3 text-sm dark:border-slate-800">
                <p className="font-medium">{i + 1}. {r.text}</p>
                <p>Ваш выбор: {r.chosen} ({r.points} из 2)</p>
                <p className="text-slate-600 dark:text-slate-400">{r.why}</p>
                {r.points < 2 && <p className="text-indigo-700 dark:text-indigo-300">Сильнее: {r.best}</p>}
              </div>
            ))}
          </div>
          <div className="card text-right"><button className="btn-ghost" disabled={busy} onClick={() => void post("/api/soft/start")}>Пройти ещё раз</button></div>
        </div>
      )}
    </div>
  );
}
