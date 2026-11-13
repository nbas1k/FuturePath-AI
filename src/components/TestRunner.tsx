"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { QUESTIONS } from "@/data/questions";
import { findProblem, sanitizeAnswers } from "@/recommendation-engine";

// Прохождение теста: по одному вопросу, прогресс, кнопка «Назад».
// Черновик ответов хранится в localStorage, чтобы обновление страницы не стирало прогресс.
const KEY = "fp_draft";

export function TestRunner() {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [index, setIndex] = useState(0);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    try {
      const d = JSON.parse(localStorage.getItem(KEY) || "null");
      // Оставляем только ответы, которые подходят текущим вопросам (старый черновик не ломает страницу)
      const { answers: clean, dropped } = sanitizeAnswers(d?.answers);
      setAnswers(clean);
      if (dropped > 0) {
        setNotice("Тест обновился, и часть сохранённых ответов устарела. Они сброшены — ответьте, пожалуйста, на вопросы заново.");
        const firstOpen = QUESTIONS.findIndex((q) => !clean[q.id]);
        setIndex(firstOpen === -1 ? 0 : firstOpen);
      } else if (typeof d?.index === "number") {
        setIndex(Math.min(Math.max(d.index, 0), QUESTIONS.length - 1));
      }
    } catch {
      // Испорченный черновик просто игнорируем
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) try { localStorage.setItem(KEY, JSON.stringify({ answers, index })); } catch {}
  }, [answers, index, ready]);

  const q = QUESTIONS[index];
  const last = index === QUESTIONS.length - 1;
  const answered = Object.keys(answers).filter((k) => QUESTIONS.some((x) => x.id === k)).length;

  async function finish() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/result", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ answers }) });
      const data = await res.json();
      if (!res.ok) {
        // Показываем вопрос, на котором сервер нашёл проблему
        const bad = QUESTIONS.findIndex((x) => x.id === data.questionId);
        if (bad >= 0) setIndex(bad);
        throw new Error(data.error || "Ошибка сохранения");
      }
      try { localStorage.removeItem(KEY); } catch {}
      router.push("/result");
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  }

  // Пересчитываем, на каком вопросе ответ всё ещё не выбран (для подсказки)
  const problem = findProblem(answers);

  if (!ready) return <p className="text-sm text-slate-500">Загрузка…</p>;

  return (
    <div className="mx-auto max-w-2xl">
      {notice && <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200" role="status">{notice}</p>}
      <div className="mb-2 flex justify-between text-sm text-slate-500">
        <span>Вопрос {index + 1} из {QUESTIONS.length}</span>
        <span>Отвечено: {answered}</span>
      </div>
      <div className="mb-6 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800" role="progressbar" aria-valuenow={index + 1} aria-valuemax={QUESTIONS.length}>
        <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all" style={{ width: `${((index + 1) / QUESTIONS.length) * 100}%` }} />
      </div>
      <div key={q.id} className="fade-in card">
        <h2 className="mb-4 text-xl font-semibold">{q.text}</h2>
        <div className="space-y-2">
          {q.options.map((o) => {
            const selected = answers[q.id] === o.id;
            return (
              <button key={o.id} onClick={() => setAnswers({ ...answers, [q.id]: o.id })} aria-pressed={selected}
                className={`w-full rounded-xl border p-3 text-left text-sm transition ${selected ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950" : "border-slate-200 hover:border-indigo-300 dark:border-slate-700"}`}>
                {o.text}
              </button>
            );
          })}
        </div>
      </div>
      {error && <p className="mt-3 text-sm text-red-600" role="alert">{error}</p>}
      <div className="mt-5 flex justify-between">
        <button className="btn-ghost" disabled={index === 0} onClick={() => setIndex(index - 1)}>← Назад</button>
        {last ? (
          <button className="btn-primary" disabled={!!problem || saving} onClick={finish}>
            {saving ? "Считаем…" : "Показать результат"}
          </button>
        ) : (
          <button className="btn-primary" disabled={!answers[q.id]} onClick={() => setIndex(index + 1)}>Дальше →</button>
        )}
      </div>
      {last && problem && <p className="mt-2 text-right text-xs text-slate-500">Ответьте на все вопросы — вернуться можно кнопкой «Назад».</p>}
    </div>
  );
}
