"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { TrackState } from "@/backend/track";
import type { Graded } from "@/track/logic";
import { improvement } from "@/track/logic";
import { AiCoach } from "./AiCoach";

type Props = { professionId: string; professionTitle: string; track: TrackState };

// Вопросы одного раунда. После проверки показываем результат с пояснениями.
function Quiz({ tasks, round, graded, professionId, onDone }: {
  tasks: TrackState["tasks"]; round: 1 | 2; graded: Graded | null; professionId: string; onDone: () => void;
}) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const complete = tasks.every((t) => answers[t.id] !== undefined);

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/track/practice", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ professionId, answers }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setError(json.error || "Не получилось проверить. Попробуйте ещё раз."); return; }
      onDone();
    } catch {
      setError("Нет связи с сервером. Попробуйте ещё раз.");
    } finally {
      setBusy(false);
    }
  }

  if (graded) {
    return (
      <div className="space-y-3">
        <p className="text-sm font-semibold">Результат: {graded.score} из {graded.total}</p>
        <ul className="space-y-3">
          {graded.items.map((it) => {
            const t = tasks.find((x) => x.id === it.taskId);
            return (
              <li key={it.taskId} className={`rounded-xl border p-3 text-sm ${it.correct ? "border-emerald-400" : "border-amber-400"}`}>
                <p className="font-medium">{it.correct ? "✓ Верно" : "✗ Пока не так"}. {t?.question}</p>
                <p className="mt-1 text-xs text-slate-500">Ваш ответ: {t?.options[it.answer]}</p>
                {!it.correct && <p className="text-xs text-slate-500">Правильный ответ: {it.correctText}</p>}
                <p className="mt-1 text-xs">{it.explanation}</p>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tasks.map((t, i) => (
        <fieldset key={t.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
          <legend className="px-1 text-sm font-medium">{i + 1}. {t.question}</legend>
          <div className="mt-2 space-y-2">
            {t.options.map((o, idx) => (
              <label key={idx} className={`flex cursor-pointer items-start gap-2 rounded-lg border p-2 text-sm ${answers[t.id] === idx ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950" : "border-slate-200 dark:border-slate-700"}`}>
                <input type="radio" name={`${round}-${t.id}`} checked={answers[t.id] === idx} onChange={() => setAnswers({ ...answers, [t.id]: idx })} className="mt-1 accent-indigo-600" />
                <span>{o}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
      <button className="btn-primary" disabled={!complete || busy} onClick={submit}>
        {busy ? "Проверяем…" : complete ? "Проверить ответы" : `Ответьте на все вопросы (${Object.keys(answers).length} из ${tasks.length})`}
      </button>
    </div>
  );
}

export function TrackPanel({ professionId, professionTitle, track }: Props) {
  const router = useRouter();
  const [error, setError] = useState("");
  const refresh = () => router.refresh();

  async function readLesson(lessonId: string) {
    setError("");
    const res = await fetch("/api/track/lesson", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ professionId, lessonId }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { setError(json.error || "Не получилось отметить урок."); return; }
    refresh();
  }

  const s = track.status;
  const allLessons = track.lessons.length > 0 && track.lessonsRead === track.lessons.length;

  return (
    <div className="space-y-5">
      <div className="card space-y-2">
        <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">Тренировка по профессии</p>
        <h2 className="text-xl font-bold">{professionTitle}</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Порядок: проверка → мини-курс → повторная проверка → прогресс. Это проверка знаний по теме, а не проверка профессионального уровня.
        </p>
        <p className="rounded-lg bg-slate-100 p-3 text-sm dark:bg-slate-800"><b>Сейчас:</b> {s.reason || "—"}</p>
        {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
      </div>

      {/* 1. Первая проверка */}
      <section className="card space-y-3" aria-labelledby="r1">
        <h3 id="r1" className="font-semibold">1. Первая проверка</h3>
        {track.round1 === null && !s.canRound1 ? (
          <p className="text-sm text-slate-500">Пройдена перед курсом.</p>
        ) : null}
        {s.canRound1 && <Quiz tasks={track.tasks} round={1} graded={null} professionId={professionId} onDone={refresh} />}
        {track.round1 && <Quiz tasks={track.tasks} round={1} graded={track.round1} professionId={professionId} onDone={refresh} />}
        {track.round1 && (
          <AiCoach key={`c1-${track.round1.score}`} url="/api/ai/training-feedback" body={{ kind: "round1" }}
            title="Разобрать ошибки с ИИ" buttonLabel="Разобрать" hint="Объяснит, что повторить после первой проверки." />
        )}
      </section>

      {/* 2. Мини-курс */}
      <section className="card space-y-3" aria-labelledby="course">
        <h3 id="course" className="font-semibold">2. Мини-курс: {track.lessonsRead} из {track.lessons.length} уроков</h3>
        <ul className="space-y-3">
          {track.lessons.map((l) => (
            <li key={l.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{l.title}</p>
                {l.read ? <span className="chip">✓ Прочитано</span> : (
                  <button className="btn-ghost !py-1.5 text-sm" onClick={() => readLesson(l.id)} disabled={track.round1 === null}>
                    Отметить как прочитано
                  </button>
                )}
              </div>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-400">
                {l.text.map((t) => <li key={t}>{t}</li>)}
              </ul>
            </li>
          ))}
        </ul>
        {track.round1 === null && <p className="text-xs text-slate-500">Курс откроется после первой проверки.</p>}
      </section>

      {/* 3. Повторная проверка */}
      <section className="card space-y-3" aria-labelledby="r2">
        <h3 id="r2" className="font-semibold">3. Повторная проверка</h3>
        {!allLessons && !track.round2 && <p className="text-sm text-slate-500">Откроется после того, как прочитаете все уроки курса.</p>}
        {s.canRound2 && <Quiz tasks={track.tasks} round={2} graded={null} professionId={professionId} onDone={refresh} />}
        {track.round2 && <Quiz tasks={track.tasks} round={2} graded={track.round2} professionId={professionId} onDone={refresh} />}
        {track.round2 && (
          <AiCoach key={`c2-${track.round2.score}`} url="/api/ai/training-feedback" body={{ kind: "round2" }}
            title="Разобрать повторную проверку с ИИ" buttonLabel="Разобрать" hint="Покажет, что закрепилось и что ещё повторить." />
        )}
      </section>

      {/* 4. Прогресс */}
      <section className="card space-y-3" aria-labelledby="prog">
        <h3 id="prog" className="font-semibold">4. Прогресс</h3>
        {track.round1 === null ? (
          <p className="text-sm text-slate-500">Пройдите первую проверку, и здесь появится ваш прогресс.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-100 p-3 dark:bg-slate-800"><p className="text-xs text-slate-500">До курса</p><p className="text-lg font-semibold">{track.round1.score} из {track.round1.total}</p></div>
            <div className="rounded-xl bg-slate-100 p-3 dark:bg-slate-800"><p className="text-xs text-slate-500">После курса</p><p className="text-lg font-semibold">{track.round2 ? `${track.round2.score} из ${track.round2.total}` : "ещё не проверено"}</p></div>
            <div className="rounded-xl bg-slate-100 p-3 dark:bg-slate-800"><p className="text-xs text-slate-500">Изменение</p><p className="text-lg font-semibold">{track.round2 ? improvement(track.round1.score, track.round2.score) : "—"}</p></div>
          </div>
        )}
        {track.round1 && track.round2 && (
          <AiCoach key={`p-${track.round1.score}-${track.round2.score}`} url="/api/ai/training-feedback" body={{ kind: "progress" }}
            title="Итог прогресса с ИИ" buttonLabel="Посмотреть итог" hint="Сравнит результаты до и после курса." />
        )}
      </section>
    </div>
  );
}
