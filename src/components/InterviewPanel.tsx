"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { InterviewState } from "@/backend/interview";
import { CRITERIA } from "@/data/interview";
import { MIN_ANSWER, MAX_ANSWER } from "@/interview/logic";

export function InterviewPanel({ professionId, state }: { professionId: string; state: InterviewState }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [text, setText] = useState("");

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

  const idx = state.answers.length;
  const total = state.questions.length;
  const tooShort = text.trim().length < MIN_ANSWER;

  return (
    <div className="space-y-5">
      <div className="card space-y-2">
        <h2 className="text-xl font-bold">Пробное собеседование</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">{total} вопросов по очереди. Ответы оценивает настоящий ИИ по критериям: {CRITERIA.map((c) => c.label.toLowerCase()).join(", ")}. Это тренировка, а не реальный отбор.</p>
        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-200" role="alert">{error}</p>}
      </div>

      {state.phase === "none" && (
        <div className="card text-center">
          <button className="btn-primary" disabled={busy} onClick={() => void post("/api/interview/start", {})}>{busy ? "Запускаем…" : "Начать собеседование"}</button>
        </div>
      )}

      {state.phase === "answering" && (
        <div className="card space-y-3">
          <p className="text-xs text-slate-500">Вопрос {idx + 1} из {total} · {state.questions[idx].skill}</p>
          <p className="font-semibold">{state.questions[idx].question}</p>
          <label className="sr-only" htmlFor="ans">Ваш ответ</label>
          <textarea id="ans" className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-900" rows={5} maxLength={MAX_ANSWER}
            value={text} onChange={(e) => setText(e.target.value)} placeholder="Ответьте своими словами, лучше с примером" />
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-slate-500">{text.trim().length} / {MAX_ANSWER} (минимум {MIN_ANSWER})</span>
            <button className="btn-primary" disabled={busy || tooShort}
              onClick={async () => { if (await post("/api/interview/answer", { index: idx, answer: text })) setText(""); }}>
              {busy ? "Сохраняем…" : idx + 1 === total ? "Ответить и закончить" : "Ответить"}
            </button>
          </div>
        </div>
      )}

      {state.phase === "need-eval" && (
        <div className="card space-y-3 text-center">
          <p className="text-sm">Вы ответили на все вопросы. Ответы сохранены. Теперь ИИ разберёт их.</p>
          <button className="btn-primary" disabled={busy} onClick={() => void post("/api/interview/evaluate", {})}>{busy ? "ИИ разбирает ответы…" : "Получить разбор"}</button>
        </div>
      )}

      {state.phase === "done" && state.evaluation && state.summary && (
        <div className="space-y-4">
          <div className="card space-y-3">
            <h3 className="font-semibold">Итог: {state.summary.percentLabel} баллов</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">{state.summary.levelText}</p>
            <div className="grid gap-3 sm:grid-cols-3">
              {state.summary.byCriterion.map((c) => (
                <div key={c.id}>
                  <div className="mb-1 flex justify-between text-xs"><span>{c.label}</span><span>{c.avg} из 3</span></div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" style={{ width: `${(c.avg / 3) * 100}%` }} /></div>
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="card"><h4 className="mb-1 font-semibold">Сильные стороны</h4><ul className="list-disc pl-5 text-sm">{state.evaluation.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul></div>
            <div className="card"><h4 className="mb-1 font-semibold">Над чем поработать</h4><ul className="list-disc pl-5 text-sm">{state.evaluation.weaknesses.map((s, i) => <li key={i}>{s}</li>)}</ul></div>
          </div>
          <div className="card"><h4 className="mb-1 font-semibold">Как подготовиться</h4><ul className="list-disc pl-5 text-sm">{state.evaluation.prep.map((s, i) => <li key={i}>{s}</li>)}</ul></div>
          <div className="card space-y-3">
            <h4 className="font-semibold">Разбор по вопросам</h4>
            {state.questions.map((q, i) => {
              const it = state.evaluation!.items.find((x) => x.questionId === q.id);
              if (!it) return null;
              return (
                <div key={q.id} className="space-y-1 border-t border-slate-200 pt-3 text-sm dark:border-slate-800">
                  <p className="font-medium">{i + 1}. {q.question}</p>
                  <p className="text-slate-500">Ваш ответ: {state.answers[i]}</p>
                  <p className="text-xs">{CRITERIA.map((c) => `${c.label}: ${it.scores[c.id]}/3`).join(" · ")}</p>
                  <p>{it.comment}</p>
                  <p className="text-indigo-700 dark:text-indigo-300">Совет: {it.tip}</p>
                </div>
              );
            })}
          </div>
          <div className="card flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500">Оценка сделана моделью ИИ и может быть неточной. Это учебная обратная связь.</p>
            <button className="btn-ghost" disabled={busy} onClick={() => void post("/api/interview/start", {})}>Пройти ещё раз</button>
          </div>
        </div>
      )}

      {state.history.length > 0 && (
        <div className="card text-sm">
          <h4 className="mb-1 font-semibold">Прошлые попытки</h4>
          <ul className="space-y-1">{state.history.map((h) => <li key={h.id}>{h.date}: {h.label} баллов</li>)}</ul>
        </div>
      )}
    </div>
  );
}
