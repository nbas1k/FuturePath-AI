"use client";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ProgressData } from "@/backend/analytics";
import type { Trend } from "@/analytics/logic";
import { SkillRuler } from "@/components/SkillRuler";

function TrendLine({ label, t, unit }: { label: string; t: Trend | null; unit: string }) {
  if (!t) return <li className="text-slate-500">{label}: попытка одна, сравнивать пока не с чем.</li>;
  return <li>{label}: первая попытка {t.first}{unit}, последняя {t.last}{unit}. Результат {t.word}{t.delta !== 0 ? ` на ${Math.abs(t.delta)}${unit}` : ""} (попыток: {t.count}).</li>;
}

export function ProgressPanel({ data }: { data: ProgressData }) {
  const bars: { name: string; "Сам": number | null; "С подсказками ИИ": number | null; "Решил ИИ": number | null }[] = [];
  if (data.course.round1 !== null) bars.push({ name: "Курс: первая проверка", "Сам": data.course.round1, "С подсказками ИИ": null, "Решил ИИ": null });
  if (data.course.round2 !== null) bars.push({ name: "Курс: повторная", "Сам": data.course.round2, "С подсказками ИИ": null, "Решил ИИ": null });
  if (data.challenge.solo !== null) bars.push({ name: "Human + AI Challenge", "Сам": data.challenge.solo, "С подсказками ИИ": data.challenge.withAi, "Решил ИИ": data.challenge.ai });

  const hasAny = bars.length > 0 || data.sims.length > 0 || data.interviews.length > 0 || data.cycles.length > 0;
  if (!hasAny) {
    return <p className="text-sm text-slate-500">Графиков пока нет: они появятся, когда вы пройдёте первые задания в разделе «Обучение».</p>;
  }

  return (
    <div className="space-y-6">
      {data.cycles.length > 0 && (
        <div>
          <h3 className="mb-1 text-sm font-semibold">Циклы AI Readiness: до и после</h3>
          <p className="mb-3 text-xs text-slate-500">Реальные результаты ваших диагностик и повторных проверок без ИИ. Это 3 задания на навык: индикатор динамики, а не доказательство освоения.</p>
          <ul className="space-y-4">
            {data.cycles.map((c, i) => (
              <li key={i} className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                <p className="text-sm font-medium">«{c.skill}» <span className="font-normal text-slate-500">· {c.date}</span></p>
                <div className="mt-2 max-w-xl"><SkillRuler before={c.before} after={c.after} max={c.total} /></div>
                <p className="mt-1 text-xs text-slate-500">До: {c.before} из {c.total}. После: {c.after} из {c.total}.</p>
              </li>
            ))}
          </ul>
        </div>
      )}
      {bars.length > 0 && (
        <div>
          <h3 className="mb-1 text-sm font-semibold">Результаты заданий (верных ответов)</h3>
          <p className="mb-2 text-xs text-slate-500">Самостоятельные результаты и результаты с подсказками ИИ показаны отдельно. Подтверждение навыков считается только по самостоятельным.</p>
          <div className="h-60" role="img" aria-label="Столбчатая диаграмма результатов заданий">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bars}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} domain={[0, Math.max(data.course.total, data.challenge.total, 1)]} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Сам" fill="#14595F" />
                <Bar dataKey="С подсказками ИИ" fill="#f59e0b" />
                <Bar dataKey="Решил ИИ" fill="#94a3b8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {data.skillsOverTime.length > 1 && (
        <div>
          <h3 className="mb-1 text-sm font-semibold">Подтверждённые навыки по ходу заданий</h3>
          <div className="h-48" role="img" aria-label="График числа подтверждённых навыков">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.skillsOverTime}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="step" tick={{ fontSize: 11 }} label={{ value: "Решённое задание по порядку", position: "insideBottom", offset: -2, fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="stepAfter" dataKey="confirmed" name="Подтверждено навыков" stroke="#10b981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {(data.sims.length > 0 || data.interviews.length > 0) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {data.sims.length > 0 && (
            <div>
              <h3 className="mb-1 text-sm font-semibold">Рабочий день: сумма метрик из 30</h3>
              <div className="h-40" role="img" aria-label="График прохождений симулятора">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.sims.map((s, i) => ({ n: i + 1, total: s.total }))}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="n" /><YAxis domain={[0, 30]} /><Tooltip />
                    <Line dataKey="total" name="Сумма" stroke="#14595F" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          {data.interviews.length > 0 && (
            <div>
              <h3 className="mb-1 text-sm font-semibold">Собеседование, % от максимума</h3>
              <div className="h-40" role="img" aria-label="График попыток собеседования">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.interviews.map((s, i) => ({ n: i + 1, percent: s.percent }))}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="n" /><YAxis domain={[0, 100]} /><Tooltip />
                    <Line dataKey="percent" name="Процент" stroke="#4FB3A9" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      <div>
        <h3 className="mb-1 text-sm font-semibold">Первая и последняя попытка</h3>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          <TrendLine label="Курс (первая и повторная проверка)" t={data.trends.course} unit="" />
          <TrendLine label="Симулятор" t={data.trends.sim} unit="" />
          <TrendLine label="Собеседование" t={data.trends.interview} unit="%" />
        </ul>
      </div>

      <div>
        <h3 className="mb-1 text-sm font-semibold">История обучения</h3>
        {data.history.length === 0 ? <p className="text-sm text-slate-500">Пока пусто.</p> : (
          <ul className="space-y-1 text-sm">{data.history.slice(0, 12).map((h, i) => <li key={i}><span className="text-slate-500">{h.date}</span> · {h.text}</li>)}</ul>
        )}
      </div>
    </div>
  );
}
