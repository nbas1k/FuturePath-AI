"use client";
import { useEffect, useRef, useState } from "react";
import type { PlanDay } from "@/data/plan";
import { createSaveQueue, type SaveQueue } from "./planQueue";

// Чек-лист плана. Отметка сразу видна на экране и сохраняется на сервере через очередь (planQueue.ts).
// Источник правды для нажатий — doneRef: он меняется мгновенно, поэтому быстрые клики не теряются.
export function PlanChecklist({ planKey, plan, initialDone }: { planKey: string; plan: PlanDay[]; initialDone: string[] }) {
  const [done, setDone] = useState<Set<string>>(() => new Set(initialDone));
  const doneRef = useRef<Set<string>>(done);
  const queueRef = useRef<SaveQueue | null>(null);
  const resyncPending = useRef(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Загружает с сервера актуальный список отметок (нужно после ошибки)
    async function resync(queue: SaveQueue) {
      try {
        const res = await fetch(`/api/progress?planKey=${encodeURIComponent(planKey)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        if (queue.isBusy()) { resyncPending.current = true; return; } // ещё есть новые клики — сверим позже
        const fresh = new Set<string>(data.done);
        doneRef.current = fresh;
        setDone(fresh);
      } catch {
        setError("Нет связи с сервером. Обновите страницу, чтобы увидеть сохранённые отметки.");
      }
    }

    const queue: SaveQueue = createSaveQueue({
      send: async (taskId, value) => {
        const res = await fetch("/api/progress", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ planKey, taskId, done: value }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Ошибка сохранения");
        }
      },
      onIdle: (hadError) => {
        if (hadError) {
          setError("Не все отметки сохранились. Показываем состояние, которое действительно на сервере.");
          void resync(queue);
        } else if (resyncPending.current) {
          resyncPending.current = false;
          void resync(queue);
        }
      },
    });
    queueRef.current = queue;
    return () => {
      queueRef.current = null;
    };
  }, [planKey]);

  function toggle(taskId: string) {
    const value = !doneRef.current.has(taskId);
    const next = new Set(doneRef.current);
    if (value) next.add(taskId);
    else next.delete(taskId);
    doneRef.current = next; // мгновенно: следующий клик увидит уже новое состояние
    setDone(next);
    setError("");
    queueRef.current?.set(taskId, value);
  }

  const pct = Math.round((done.size / plan.length) * 100);
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm"><span>Выполнено {done.size} из {plan.length}</span><span>{pct}%</span></div>
      <div className="mb-5 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
      {error && <p className="mb-3 text-sm text-red-600" role="alert">{error}</p>}
      <ul className="space-y-2">
        {plan.map((p) => (
          <li key={p.taskId}>
            <label className={`card flex cursor-pointer items-start gap-3 !p-3 ${done.has(p.taskId) ? "opacity-60" : ""}`}>
              <input type="checkbox" className="mt-1 h-4 w-4 accent-indigo-600" checked={done.has(p.taskId)} onChange={() => toggle(p.taskId)} />
              <span className="text-sm"><b>День {p.day}.</b> <span className={done.has(p.taskId) ? "line-through" : ""}>{p.task}</span></span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
