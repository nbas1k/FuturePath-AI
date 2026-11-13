"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { CycleState } from "@/backend/cycle";
import { STAGE_GROUPS, groupIndex, MIN_REFLECTION, MAX_REFLECTION, type CycleStage } from "@/cycle/logic";
import type { GradedSet } from "@/challenge/logic";
import { SkillRuler } from "@/components/SkillRuler";

const STATUS_TEXT = { fixed: "Исправлено", kept: "Верно с самого начала", still: "Пока не получается", worse: "Стало хуже" } as const;
const STATUS_STYLE = {
  fixed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  kept: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200",
  still: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  worse: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200",
} as const;

type Task = { id: string; question: string; options: string[] };

function Questions({ tasks, answers, setAnswers, hints }: { tasks: Task[]; answers: Record<string, number>; setAnswers: (f: (a: Record<string, number>) => Record<string, number>) => void; hints?: { taskId: string; choice: number; why: string }[] }) {
  return (
    <div className="space-y-4">
      {tasks.map((t, i) => {
        const hint = hints?.find((h) => h.taskId === t.id);
        return (
          <fieldset key={t.id} className="card space-y-2">
            <legend className="sr-only">Вопрос {i + 1}</legend>
            {t.id.endsWith("-c") && <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">Проверьте утверждение: подготовленный пример ответа ИИ (написан авторами, не моделью)</p>}
            <p className="font-medium">{i + 1}. {t.question}</p>
            {hint && <p className="rounded-lg bg-amber-50 p-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">Подсказка ИИ: вариант «{t.options[hint.choice]}». {hint.why} ИИ может ошибаться, проверьте сами.</p>}
            {t.options.map((o, k) => (
              <label key={k} className="flex cursor-pointer items-start gap-2 text-sm">
                <input type="radio" name={t.id} checked={answers[t.id] === k} onChange={() => setAnswers((a) => ({ ...a, [t.id]: k }))} className="mt-1" />
                <span>{o}</span>
              </label>
            ))}
          </fieldset>
        );
      })}
    </div>
  );
}

function Summary({ title, g, names }: { title: string; g: GradedSet; names: string[] }) {
  return (
    <div className="card space-y-2 text-sm">
      <p className="font-semibold">{title}: {g.score} из {g.total}</p>
      <ul className="space-y-1">
        {g.items.map((it, i) => (
          <li key={it.taskId}><span className={it.correct ? "text-emerald-600" : "text-rose-600"}>{it.correct ? "✔" : "✘"}</span> {names[i]}{!it.correct && <span className="text-slate-500"> · верно: {it.correctText}. {it.explanation}</span>}</li>
        ))}
      </ul>
    </div>
  );
}

export function CyclePanel({ professionId, professionTitle, state }: { professionId: string; professionTitle: string; state: CycleState }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [skill, setSkill] = useState<string>(state.run?.skill ?? state.suggestedSkill ?? "");
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [practice, setPractice] = useState<Record<string, number>>({});

  async function act(action: string, extra: Record<string, unknown> = {}) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/cycle", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ professionId, action, ...extra }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setError(json.error || "Не получилось. Попробуйте ещё раз."); return; }
      setAnswers({});
      router.refresh();
    } catch {
      setError("Нет связи с сервером. Попробуйте ещё раз.");
    } finally {
      setBusy(false);
    }
  }

  const stage: CycleStage = state.stage;
  const stageIndex = groupIndex(stage);
  useEffect(() => {
    const cur = document.querySelector('[aria-label="Шесть этапов AI Readiness"] [aria-current="step"]') as HTMLElement | null;
    const box = cur?.parentElement;
    if (cur && box) box.scrollTo({ left: cur.offsetLeft - 12, behavior: "auto" });
  }, [stage]);
  const [reflection, setReflection] = useState("");
  const allAnswered = (tasks: Task[]) => tasks.length > 0 && tasks.every((t) => answers[t.id] !== undefined);
  const names = state.criteria.map((c) => c.name);

  return (
    <div className="space-y-5">
      <div className="card space-y-3">
        <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">AI Readiness: подготовка к работе с ИИ</p>
        <h2 className="text-xl font-bold">{professionTitle}{state.run ? `: навык «${state.run.skill}»` : ""}</h2>
        <ol className="no-scrollbar flex gap-2 overflow-x-auto pb-1 text-xs" aria-label="Шесть этапов AI Readiness">
          {STAGE_GROUPS.map((s, i) => (
            <li key={s.label} aria-current={i === stageIndex ? "step" : undefined} className={"min-w-[84px] flex-1 border-t-4 pt-2 " + (i < stageIndex ? "border-indigo-600 text-slate-600 dark:border-indigo-300 dark:text-slate-300" : i === stageIndex ? "border-marker font-semibold text-slate-900 dark:text-white" : "border-slate-200 text-slate-400 dark:border-slate-700 dark:text-slate-500")}>
              {i < stageIndex ? "✔ " : `${i + 1}. `}{s.label}
            </li>
          ))}
        </ol>
        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-200" role="alert">{error}</p>}
      </div>

      {stage === "goal" && (
        <div className="card space-y-3">
          <p className="font-semibold">Этап 1. Выберите навык, который хотите освоить</p>
          <p className="text-sm text-slate-600 dark:text-slate-400">Мы проверим его практическим заданием без подсказок ИИ, составим план по вашим ошибкам, дадим задание вместе с ИИ и в конце проверим заново. Так будет видно, изменилось ли что-то на самом деле.</p>
          <div className="space-y-2">
            {state.skills.map((s) => (
              <label key={s.skill} className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
                <input type="radio" name="skill" checked={skill === s.skill} onChange={() => setSkill(s.skill)} />
                <span>{s.skill}</span>
                {s.completed && <span className="chip ml-auto">цикл пройден</span>}
                {!s.completed && s.skill === state.suggestedSkill && <span className="chip ml-auto">рекомендуем начать с этого</span>}
              </label>
            ))}
          </div>
          <button className="btn-primary" disabled={busy || !skill} onClick={() => void act("start", { skill })}>{busy ? "Запускаем…" : "Начать цикл по этому навыку"}</button>
        </div>
      )}

      {stage === "future" && state.future && (
        <div className="space-y-3">
          <div className="card space-y-3">
            <p className="font-semibold">Этап 1. Как ИИ меняет профессию «{state.future.title}»</p>
            <p className="text-sm">{state.future.impact}</p>
            <div className="grid gap-3 sm:grid-cols-2 text-sm">
              <div><p className="mb-1 font-medium">Что ИИ может взять на себя</p><ul className="list-disc pl-5">{state.future.automates.map((x) => <li key={x}>{x}</li>)}</ul></div>
              <div><p className="mb-1 font-medium">Что остаётся важным для человека</p><ul className="list-disc pl-5">{state.future.humanSkills.map((x) => <li key={x}>{x}</li>)}</ul></div>
            </div>
            <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-100">Это качественное описание из каталога профессий. Это не прогноз и не факт: как изменится работа, точно никто не знает. Подробные сценарии есть во вкладке «Сценарии 2030–2035».</p>
          </div>
          <button className="btn-primary" disabled={busy} onClick={() => void act("future")}>Понятно, перейти к диагностике навыка «{state.run?.skill}»</button>
        </div>
      )}

      {stage === "diag" && (
        <div className="space-y-3">
          <div className="card text-sm"><p className="font-semibold">Этап 2. Диагностика без ИИ</p><p className="text-slate-600 dark:text-slate-400">{state.diagTasks.length} задания по {state.diagTasks.length} критериям: {names.join(", ")}. Отвечайте сами: наставник на эти вопросы сейчас не отвечает. Результат сохранится как ваш начальный уровень.</p></div>
          <Questions tasks={state.diagTasks} answers={answers} setAnswers={setAnswers} />
          <button className="btn-primary" disabled={busy || !allAnswered(state.diagTasks)} onClick={() => void act("diag", { answers })}>{busy ? "Проверяем…" : "Сдать диагностику"}</button>
        </div>
      )}

      {stage !== "goal" && stage !== "future" && stage !== "diag" && state.diagResult && stage !== "proof" && (
        <Summary title="Начальный уровень (диагностика без ИИ)" g={state.diagResult} names={names} />
      )}

      {stage === "plan" && (
        <div className="space-y-3">
          <div className="card text-sm"><p className="font-semibold">Этап 3. Обучение по вашим ошибкам</p><p className="text-slate-600 dark:text-slate-400">План составлен по вашим ошибкам: для каждого пробела короткий урок и упражнение с обратной связью. Нужно выполнить: {state.plan.filter((p) => !p.result).length} из {state.plan.length}. Непонятно? Откройте вкладку «Наставник»: он объяснит тему, но не решит упражнение за вас.</p></div>
          {state.plan.map((p) => (
            <div key={p.criterionId} className="card space-y-2">
              <p className="font-semibold">Пробел: {p.name}</p>
              <p className="text-sm">{p.lesson}</p>
              <p className="font-medium">{p.exercise.question}</p>
              {p.exercise.options.map((o, k) => (
                <label key={k} className="flex items-start gap-2 text-sm">
                  <input type="radio" name={p.exercise.id} disabled={!!p.result} checked={(p.result ? p.result.answer : practice[p.exercise.id]) === k} onChange={() => setPractice((a) => ({ ...a, [p.exercise.id]: k }))} className="mt-1" />
                  <span>{o}</span>
                </label>
              ))}
              {p.result ? (
                <p className={"rounded-lg p-2 text-sm " + (p.result.correct ? "bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100" : "bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100")}>
                  {p.result.correct ? "Верно. " : `Неверно. Правильный ответ: ${p.result.correctText}. `}{p.result.explanation}
                </p>
              ) : (
                <button className="btn-ghost" disabled={busy || practice[p.exercise.id] === undefined} onClick={() => void act("practice", { taskId: p.exercise.id, answer: practice[p.exercise.id] })}>Проверить ответ</button>
              )}
            </div>
          ))}
        </div>
      )}

      {stage === "ai" && (
        <div className="space-y-3">
          <div className="card space-y-2 text-sm">
            <p className="font-semibold">Этап 4. Работа с ИИ</p>
            <p className="text-slate-600 dark:text-slate-400">Сопоставимые задания, но теперь с подсказкой настоящего ИИ. Ещё три утверждения «ИИ» подготовлены авторами: часть из них с ошибкой. ИИ может ошибаться, ваша задача проверить ответ, а не доверять слепо.</p>
            {state.ai.hints.length === 0 && (
              <div className="flex flex-wrap gap-2">
                <button className="btn-primary" disabled={busy || !state.ai.available} onClick={() => void act("ai-help")}>{busy ? "ИИ решает задания…" : "Получить подсказки ИИ"}</button>
                {state.ai.canSkip && <button className="btn-ghost" disabled={busy} onClick={() => void act("ai-skip")}>Пропустить шаг (ИИ недоступен)</button>}
              </div>
            )}
            {!state.ai.available && <p className="text-amber-700 dark:text-amber-300">ИИ сейчас не подключён. Подсказки не подделываются. Шаг можно пропустить, и это будет отмечено в итоге.</p>}
          </div>
          {state.ai.hints.length > 0 && (
            <>
              <Questions tasks={state.ai.tasks} answers={answers} setAnswers={setAnswers} hints={state.ai.hints} />
              <div className="card space-y-2 text-sm">
                <label htmlFor="reflection" className="font-medium">Объясните своё решение: как вы проверяли подсказки ИИ и в каких ответах сомневались?</label>
                <textarea id="reflection" className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-900" rows={3} maxLength={MAX_REFLECTION} value={reflection} onChange={(e) => setReflection(e.target.value)} />
                <p className="text-xs text-slate-500">{reflection.trim().length} / {MAX_REFLECTION} (минимум {MIN_REFLECTION}). Объяснение сохраняется и показывается в итоге, баллы не меняет.</p>
              </div>
              <button className="btn-primary" disabled={busy || !allAnswered(state.ai.tasks) || reflection.trim().length < MIN_REFLECTION} onClick={() => void act("ai", { answers, reflection })}>{busy ? "Проверяем…" : "Сдать задания с ИИ"}</button>
            </>
          )}
        </div>
      )}

      {stage === "retest" && (
        <div className="space-y-3">
          {state.ai.result && <Summary title="Человек + ИИ" g={state.ai.result} names={names.flatMap((n) => [n, `${n} (утверждение ИИ)`])} />}
          <div className="card text-sm"><p className="font-semibold">Этап 5. Повторная проверка без ИИ</p><p className="text-slate-600 dark:text-slate-400">Новые задания по тем же критериям: {names.join(", ")}. Отвечайте сами, без подсказок. Результат сравним с начальным.</p></div>
          <Questions tasks={state.retestTasks} answers={answers} setAnswers={setAnswers} />
          <button className="btn-primary" disabled={busy || !allAnswered(state.retestTasks)} onClick={() => void act("retest", { answers })}>{busy ? "Проверяем…" : "Сдать повторную проверку"}</button>
        </div>
      )}

      {stage === "proof" && state.proof && state.diagResult && state.retestResult && (
        <div className="space-y-4">
          <div className="card space-y-3">
            <p className="font-semibold">Этап 6. Результат по навыку «{state.run?.skill}»</p>
            <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
              <SkillRuler before={state.proof.before} after={state.proof.after} max={state.proof.total} animate />
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">Начальный результат: {state.proof.before} из {state.proof.total}. Итоговый результат: {state.proof.after} из {state.proof.total}.</p>
            </div>
            <p className="text-sm font-medium">{state.proof.growthText}</p>
            <ul className="space-y-2 text-sm">
              {state.proof.results.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-2"><span>{r.name}</span><span className={"rounded-full px-2 py-0.5 text-xs " + STATUS_STYLE[r.status]}>{STATUS_TEXT[r.status]}</span></li>
              ))}
            </ul>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 text-sm">
            <div className="card"><p className="mb-1 font-semibold">Какие ошибки исправлены</p>{state.proof.fixed.length ? <ul className="list-disc pl-5">{state.proof.fixed.map((x) => <li key={x}>{x}</li>)}</ul> : <p className="text-slate-500">Исправленных ошибок нет.</p>}</div>
            <div className="card"><p className="mb-1 font-semibold">Что ещё требует развития</p>{state.proof.stillWeak.length ? <ul className="list-disc pl-5">{state.proof.stillWeak.map((x) => <li key={x}>{x}</li>)}</ul> : <p className="text-slate-500">По этим заданиям пробелов нет.</p>}</div>
          </div>
          <div className="card space-y-2 text-sm">
            <p><b>Навык:</b> {state.proof.confirmed ? `подтверждён учебными заданиями (повторная проверка выполнена на ${state.proof.after} из ${state.proof.total}, правило: от 75%)` : "пока не подтверждён учебными заданиями, нужна ещё практика"}.</p>
            <p><b>Человек + ИИ:</b> {state.proof.aiNote}</p>
            {state.ai.reflection && <p><b>Ваше объяснение:</b> «{state.ai.reflection}»</p>}
            <p className="text-xs text-slate-500">{state.proof.honesty}</p>
          </div>
          <div className="card space-y-2 text-sm">
            <p className="font-semibold">Что изучать дальше</p>
            <ul className="list-disc pl-5">
              {state.proof.stillWeak.length > 0 && <li>Повторите критерии: {state.proof.stillWeak.join(", ")}. Спросите наставника, чтобы разобрать ошибки.</li>}
              {state.skills.filter((s) => !s.completed).length > 0 && <li>Следующий навык профессии: {state.skills.filter((s) => !s.completed).map((s) => s.skill).join(", ")}.</li>}
              <li>Посмотрите карту навыков и паспорт навыков в «Профиле»: туда попадают результаты повторной проверки.</li>
            </ul>
            {state.skills.some((s) => !s.completed) && (
              <div className="pt-2">
                <p className="mb-2 text-xs text-slate-500">Начать новый цикл:</p>
                <div className="flex flex-wrap gap-2">
                  {state.skills.filter((s) => !s.completed).map((s) => <button key={s.skill} className="btn-primary" disabled={busy} onClick={() => void act("start", { skill: s.skill })}>{s.skill}</button>)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {state.history.length > 0 && (
        <div className="card text-sm">
          <p className="mb-1 font-semibold">Пройденные циклы</p>
          <ul className="space-y-1">{state.history.map((h, i) => <li key={i}>{h.date}: «{h.skill}» — было {h.before} из {h.total}, стало {h.after} из {h.total}</li>)}</ul>
        </div>
      )}
    </div>
  );
}
