"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { JourneyData } from "@/backend/journeyContext";
import { skillsLeftText, TASKS_FOR_PROGRESS_STEP, type StepId } from "@/journey/logic";
import { AiCoach } from "./AiCoach";

const RATINGS = [
  { value: 0, label: "Пока нет" },
  { value: 1, label: "Немного" },
  { value: 2, label: "Уверенно" },
];

// Главная кнопка шага. Показывается только для текущего шага, чтобы на экране была одна основная кнопка.
function PrimaryLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className="btn-primary">{children}</Link>;
}

export function JourneyPanel({ data }: { data: JourneyData }) {
  const router = useRouter();
  const { journey, facts, recommendations, selected, ratings: initialRatings, user } = data;
  // По умолчанию открыт текущий шаг (или последний, если всё пройдено)
  const defaultView: StepId = journey.current ?? 5;
  const [view, setView] = useState<StepId>(defaultView);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ratings, setRatings] = useState<Record<string, number>>(initialRatings);

  const step = journey.steps[view - 1];
  const isCurrent = journey.current === view;

  async function call(url: string, body: unknown): Promise<boolean> {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || "Не получилось сохранить. Попробуйте ещё раз.");
        return false;
      }
      return true;
    } catch {
      setError("Нет связи с сервером. Проверьте, что сайт запущен, и попробуйте ещё раз.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function choose(professionId: string) {
    if (await call("/api/journey/select", { professionId })) {
      router.refresh();
      setView(3); // сразу переходим к следующему шагу
    }
  }

  async function saveSkills() {
    if (!selected) return;
    if (await call("/api/journey/skills", { professionId: selected.id, ratings })) {
      router.refresh();
    }
  }

  return (
    <div className="space-y-5">
      {/* Шкала шагов: пройденные и текущий можно открыть, будущие закрыты */}
      <ol className="grid grid-cols-5 gap-2" aria-label="Шаги пути">
        {journey.steps.map((s) => {
          const open = s.done || s.current;
          const active = view === s.id;
          return (
            <li key={s.id}>
              <button
                onClick={() => open && setView(s.id)}
                disabled={!open}
                aria-current={active ? "step" : undefined}
                className={`w-full rounded-xl border p-2 text-center text-xs transition sm:text-sm ${
                  active ? "border-indigo-500 bg-indigo-50 font-semibold dark:bg-indigo-950" : "border-slate-200 dark:border-slate-700"
                } ${open ? "hover:border-indigo-400" : "cursor-not-allowed opacity-50"}`}
              >
                <span className="block text-base">{s.done ? "✓" : s.id}</span>
                <span className="hidden sm:block">{s.title}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="card fade-in space-y-4">
        <div>
          <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
            Шаг {view} из 5 {step.done ? "· выполнен" : isCurrent ? "· сейчас" : ""}
          </p>
          <h2 className="mt-1 text-xl font-bold">{step.title}</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{step.question}</p>
        </div>

        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-200" role="alert">{error}</p>}

        {/* ---- Шаг 1 ---- */}
        {view === 1 && (
          <div className="space-y-3 text-sm">
            {user.status === "ok" && <p>Тест пройден: версия {user.version === 2 ? "2 (с интересами)" : `${user.version} (старая)`}.</p>}
            {user.status === "outdated" && <p className="text-amber-700 dark:text-amber-300">Ваш прошлый результат устарел. Пройдите тест заново.</p>}
            {user.status !== "ok" && <p>Тест занимает около 5 минут.</p>}
            <div className="flex flex-wrap gap-2">
              {isCurrent && <PrimaryLink href="/test">{user.status === "ok" ? "Пройти заново" : "Пройти тест"}</PrimaryLink>}
              {user.status === "ok" && <Link href="/result" className="btn-ghost">Посмотреть результат</Link>}
            </div>
          </div>
        )}

        {/* ---- Шаг 2 ---- */}
        {view === 2 && (
          <div className="space-y-3">
            {!facts.hasResult ? (
              <p className="text-sm">Сначала пройдите тест на первом шаге, и здесь появятся подходящие профессии.</p>
            ) : (
              <>
                <p className="text-sm">Подходящие профессии по вашему тесту. Это ориентир для размышления, а не оценка способностей.</p>
                <ul className="space-y-2">
                  {recommendations.map((r) => {
                    const chosen = selected?.id === r.id;
                    return (
                      <li key={r.id} className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 ${chosen ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950" : "border-slate-200 dark:border-slate-700"}`}>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{r.title} <span className="text-sm text-indigo-600 dark:text-indigo-400">· {r.percent}%</span></p>
                          <p className="truncate text-xs text-slate-500">{r.reason}</p>
                        </div>
                        {chosen ? <span className="chip">Выбрано</span> : (
                          <button className="btn-ghost !py-1.5 text-sm" onClick={() => choose(r.id)} disabled={busy}>Выбрать</button>
                        )}
                      </li>
                    );
                  })}
                </ul>
                <Link href="/professions" className="text-sm text-indigo-600 underline dark:text-indigo-400">Открыть весь каталог и сравнить профессии</Link>
              </>
            )}
          </div>
        )}

        {/* ---- Шаг 3 ---- */}
        {view === 3 && (
          <div className="space-y-3">
            {!selected ? (
              <>
                <p className="text-sm">Сначала выберите профессию на втором шаге.</p>
                <button className="btn-ghost" onClick={() => setView(2)}>К выбору профессии</button>
              </>
            ) : (
              <>
                <p className="text-sm">Профессия: <b>{selected.title}</b>. Отметьте, что вы уже умеете. {skillsLeftText(facts)}.</p>
                <p className="text-xs text-slate-500">Это ваша самооценка, а не проверка: ответ «Уверенно» не значит, что навык подтверждён.</p>
                <ul className="space-y-2">
                  {selected.skills.map((skill) => (
                    <li key={skill} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                      <p className="mb-2 text-sm font-medium">{skill}</p>
                      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={skill}>
                        {RATINGS.map((r) => {
                          const on = ratings[skill] === r.value;
                          return (
                            <button key={r.value} role="radio" aria-checked={on} disabled={!isCurrent && step.done}
                              onClick={() => setRatings((prev) => ({ ...prev, [skill]: r.value }))}
                              className={`rounded-full border px-3 py-1 text-xs ${on ? "border-indigo-500 bg-indigo-600 text-white" : "border-slate-300 dark:border-slate-600"}`}>
                              {r.label}
                            </button>
                          );
                        })}
                      </div>
                    </li>
                  ))}
                </ul>
                {isCurrent && (
                  <button className="btn-primary" onClick={saveSkills}
                    disabled={busy || Object.keys(ratings).length === 0}>
                    {busy ? "Сохраняем…" : "Сохранить отметки"}
                  </button>
                )}
                {facts.skillsRated > 0 && (
                  <AiCoach key={`sg-${facts.skillsRated}`} url="/api/ai/skill-gap" body={{}}
                    title="Какие навыки развивать (ИИ)" buttonLabel="Подсказать" hint="Разбор по вашей самооценке. Это не проверка навыков." />
                )}
              </>
            )}
          </div>
        )}

        {/* ---- Шаг 4 ---- */}
        {view === 4 && (
          <div className="space-y-3 text-sm">
            <p>{facts.planStarted ? "План уже начат. Можно продолжать." : "Пока план не начат. Он состоит из маленьких заданий на каждый день."}</p>
            <div className="flex flex-wrap gap-2">
              {isCurrent && <PrimaryLink href="/learn">Начать план на 30 дней</PrimaryLink>}
              <Link href="/learn" className="btn-ghost">Раздел «Обучение»</Link>
            </div>
          </div>
        )}

        {/* ---- Шаг 5 ---- */}
        {view === 5 && (
          <div className="space-y-3 text-sm">
            <p>Выполнено заданий: <b>{facts.tasksDone}</b> из {TASKS_FOR_PROGRESS_STEP} нужных для проверки прогресса.</p>
            <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
              <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" style={{ width: `${Math.min(100, (facts.tasksDone / TASKS_FOR_PROGRESS_STEP) * 100)}%` }} />
            </div>
            <div className="flex flex-wrap gap-2">
              <PrimaryLink href="/profile">Посмотреть прогресс</PrimaryLink>
              <Link href="/learn" className="btn-ghost">Продолжить обучение</Link>
            </div>
          </div>
        )}

        {/* Навигация назад и подсказка о следующем шаге */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-slate-700">
          {view > 1 ? <button className="btn-ghost" onClick={() => setView((view - 1) as StepId)}>← Назад</button> : <span />}
          {journey.current && !isCurrent && view > journey.current && <span className="text-xs text-slate-500">Этот шаг пока закрыт</span>}
          {journey.doneAll && view === 5 && <span className="chip">Все шаги пройдены</span>}
        </div>
      </div>
    </div>
  );
}
