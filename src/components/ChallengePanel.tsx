"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ChallengeState } from "@/backend/challenge";

type Task = ChallengeState["soloTasks"][number];

// Набор вопросов с выбором. hints — подсказки ИИ (только в части «с ИИ»).
function TaskForm({ tasks, namePrefix, hints, submitLabel, onSubmit, busy }: {
  tasks: Task[]; namePrefix: string; hints?: ChallengeState["hints"]; submitLabel: string;
  onSubmit: (answers: Record<string, number>) => void; busy: boolean;
}) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const complete = tasks.every((t) => answers[t.id] !== undefined);
  return (
    <div className="space-y-4">
      {tasks.map((t, i) => {
        const hint = hints?.find((h) => h.taskId === t.id);
        return (
          <fieldset key={t.id} className="space-y-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
            <legend className="px-1 text-sm font-medium">{i + 1}. {t.question}</legend>
            {hint && (
              <div className="rounded-lg bg-indigo-50 p-2 text-xs dark:bg-indigo-950">
                <p><b>Подсказка ИИ:</b> вариант «{t.options[hint.choice]}»</p>
                <p className="text-slate-600 dark:text-slate-400">Объяснение ИИ: {hint.why}</p>
                <p className="mt-1 text-slate-500">ИИ может ошибаться. Решайте сами.</p>
              </div>
            )}
            {t.options.map((o, idx) => (
              <label key={idx} className={`flex cursor-pointer items-start gap-2 rounded-lg border p-2 text-sm ${answers[t.id] === idx ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950" : "border-slate-200 dark:border-slate-700"}`}>
                <input type="radio" name={`${namePrefix}-${t.id}`} checked={answers[t.id] === idx} onChange={() => setAnswers((p) => ({ ...p, [t.id]: idx }))} className="mt-1 accent-indigo-600" />
                <span>{o}</span>
              </label>
            ))}
          </fieldset>
        );
      })}
      <button className="btn-primary" disabled={!complete || busy} onClick={() => onSubmit(answers)}>
        {busy ? "Проверяем…" : complete ? submitLabel : `Ответьте на все вопросы (${Object.keys(answers).length} из ${tasks.length})`}
      </button>
    </div>
  );
}

export function ChallengePanel({ professionId, state }: { professionId: string; state: ChallengeState }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function post(url: string, body: Record<string, unknown>): Promise<boolean> {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ professionId, ...body }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setError(json.error || "Не получилось. Попробуйте ещё раз."); return false; }
      router.refresh();
      return true;
    } catch {
      setError("Нет связи с сервером. Попробуйте ещё раз.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  const c = state.comparison;
  return (
    <div className="space-y-5">
      <div className="card space-y-2">
        <h2 className="text-xl font-bold">Сам и вместе с ИИ</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Сначала решите задания сами. Потом решите похожие задания, видя подсказки настоящего ИИ. Мы сравним результаты и покажем, где ИИ помог, а где подвёл.
        </p>
        <ol className="flex flex-wrap gap-2 text-xs">
          {["1. Сам", "2. Подсказки ИИ", "3. С ИИ", "4. Сравнение"].map((s, i) => {
            const idx = { solo: 0, "need-ai": 1, "with-ai": 2, done: 3 }[state.phase];
            return <li key={s} className={`chip ${i === idx ? "!bg-indigo-600 !text-white" : i < idx ? "" : "opacity-50"}`}>{i < idx ? "✓ " : ""}{s}</li>;
          })}
        </ol>
        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-200" role="alert">{error}</p>}
      </div>

      {state.phase === "solo" && (
        <section className="card space-y-3">
          <h3 className="font-semibold">Часть 1. Решите сами, без ИИ</h3>
          <TaskForm tasks={state.soloTasks} namePrefix="solo" submitLabel="Проверить мои ответы" busy={busy}
            onSubmit={(answers) => void post("/api/challenge/solo", { answers })} />
        </section>
      )}

      {state.phase === "need-ai" && state.solo && (
        <section className="card space-y-3">
          <h3 className="font-semibold">Часть 2. Подсказки ИИ</h3>
          <p className="text-sm">Самостоятельно вы решили: <b>{state.solo.score} из {state.solo.total}</b>. Теперь настоящий ИИ решит похожие задания, а вы увидите его подсказки.</p>
          <p className="text-xs text-slate-500">Если ИИ недоступен, подсказки не придумываются: сайт скажет об этом.</p>
          <button className="btn-primary" disabled={busy} onClick={() => void post("/api/challenge/ai-help", {})}>
            {busy ? "ИИ решает задания…" : "Получить подсказки ИИ"}
          </button>
        </section>
      )}

      {state.phase === "with-ai" && (
        <section className="card space-y-3">
          <h3 className="font-semibold">Часть 3. Решите с подсказками ИИ</h3>
          <TaskForm tasks={state.aiTasks} namePrefix="ai" hints={state.hints} submitLabel="Проверить мои ответы" busy={busy}
            onSubmit={(answers) => void post("/api/challenge/with-ai", { answers })} />
        </section>
      )}

      {state.phase === "done" && c && state.solo && state.withAi && (
        <section className="card space-y-4" aria-label="Сравнение результатов">
          <h3 className="font-semibold">Сравнение</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-100 p-3 dark:bg-slate-800"><p className="text-xs text-slate-500">Сам</p><p className="text-lg font-semibold">{c.soloScore} из {c.total}</p></div>
            <div className="rounded-xl bg-slate-100 p-3 dark:bg-slate-800"><p className="text-xs text-slate-500">С подсказками ИИ</p><p className="text-lg font-semibold">{c.withAiScore} из {c.total}</p></div>
            <div className="rounded-xl bg-slate-100 p-3 dark:bg-slate-800"><p className="text-xs text-slate-500">ИИ сам решил верно</p><p className="text-lg font-semibold">{c.aiScore} из {c.total}</p></div>
          </div>
          <p className="text-sm">{c.verdict}</p>

          <div>
            <h4 className="mb-2 text-sm font-semibold">Ваши ошибки без ИИ</h4>
            {state.solo.items.every((i) => i.correct) ? <p className="text-sm text-slate-500">Ошибок нет.</p> : (
              <ul className="space-y-2">
                {state.solo.items.map((it, idx) => !it.correct && (
                  <li key={it.taskId} className="rounded-lg border border-amber-400 p-2 text-sm">
                    <p>{state.soloTasks[idx].question}</p>
                    <p className="text-xs text-slate-500">Правильный ответ: {it.correctText}. {it.explanation}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h4 className="mb-2 text-sm font-semibold">Задания с ИИ: кто что выбрал</h4>
            <ul className="space-y-2">
              {state.withAi.items.map((it, idx) => {
                const ai = state.aiChoices.find((a) => a.taskId === it.taskId);
                const t = state.aiTasks[idx];
                return (
                  <li key={it.taskId} className="rounded-lg border border-slate-200 p-2 text-sm dark:border-slate-700">
                    <p>{t.question}</p>
                    <p className="text-xs">Ваш ответ: «{t.options[it.answer]}» — {it.correct ? "верно" : "неверно"}</p>
                    {ai && <p className="text-xs">ИИ выбрал: «{t.options[ai.choice]}» — {ai.correct ? "верно" : "неверно"}</p>}
                    {!it.correct && <p className="text-xs text-slate-500">Правильный ответ: {it.correctText}. {it.explanation}</p>}
                  </li>
                );
              })}
            </ul>
          </div>
          <p className="text-xs text-slate-500">Это учебное сравнение на нескольких заданиях. Оно не оценивает способности человека.</p>
        </section>
      )}
    </div>
  );
}
