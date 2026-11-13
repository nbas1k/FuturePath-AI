"use client";
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Legend } from "recharts";
import type { SkillMapData } from "@/backend/skillMap";
import { STATUS_LABEL, type SkillStatus } from "@/skills/map";

const SELF_PCT: Record<number, number> = { 0: 0, 1: 50, 2: 100 };
const SELF_LABEL: Record<number, string> = { 0: "Пока нет", 1: "Немного", 2: "Уверенно" };

const STATUS_STYLE: Record<SkillStatus, string> = {
  confirmed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  gap: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  overestimated: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200",
  unchecked: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

const STATUS_ADVICE: Record<SkillStatus, string> = {
  confirmed: "Хорошо. Можно переходить к другим навыкам.",
  gap: "Повторите уроки и задания по этому навыку.",
  overestimated: "Вы отметили «уверенно», но задания решены хуже. Повторите задания.",
  unchecked: "На платформе нет заданий для этого навыка. Нужна практика другими способами.",
};

export function SkillMapPanel({ data }: { data: SkillMapData }) {
  const { map } = data;
  const chart = map.rows.map((r) => ({
    skill: r.skill.length > 22 ? r.skill.slice(0, 20) + "…" : r.skill,
    "Самооценка": r.self === null ? 0 : SELF_PCT[r.self],
    "Подтверждено заданиями": r.verifiedPct ?? 0,
  }));

  return (
    <div className="space-y-5">
      <div className="card space-y-2">
        <h2 className="text-xl font-bold">Карта навыков: {data.profession.title}</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Самооценка — то, что вы отметили сами. «Подтверждено заданиями» — доля верных ответов на задания, которые вы решили самостоятельно (подтверждение от 75%). Ответы «с подсказкой ИИ» в подтверждение не идут.
        </p>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="chip">Подтверждено: {map.confirmed}</span>
          <span className="chip">Нужно развивать: {map.gaps}</span>
          <span className="chip">Нет заданий: {map.unchecked}</span>
        </div>
      </div>

      <div className="card">
        <div className="h-72 w-full" aria-label="Карта навыков: самооценка и подтверждение">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={chart} outerRadius="70%">
              <PolarGrid stroke="#94a3b8" strokeOpacity={0.4} />
              <PolarAngleAxis dataKey="skill" tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
              <Radar name="Самооценка" dataKey="Самооценка" stroke="#4FB3A9" fill="#4FB3A9" fillOpacity={0.25} isAnimationActive={false} />
              <Radar name="Подтверждено заданиями" dataKey="Подтверждено заданиями" stroke="#14595F" fill="#14595F" fillOpacity={0.35} isAnimationActive={false} />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-1 text-xs text-slate-500">Навык без отметки или без заданий показан в центре диаграммы (это «нет данных», а не нулевой уровень).</p>
      </div>

      <ul className="space-y-3">
        {map.rows.map((r) => (
          <li key={r.skill} className="card space-y-2 !p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium">{r.skill}</p>
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLE[r.status]}`}>{STATUS_LABEL[r.status]}</span>
            </div>
            <div className="grid gap-2 text-xs sm:grid-cols-2">
              <p>Самооценка: <b>{r.self === null ? "не отмечена" : SELF_LABEL[r.self]}</b></p>
              <p>Подтверждение: <b>{r.verifiedPct === null ? "нет заданий" : `${r.verifiedPct}% верно (заданий: ${r.tasks})`}</b></p>
            </div>
            <p className="text-xs text-slate-500">{STATUS_ADVICE[r.status]}</p>
          </li>
        ))}
      </ul>

      {map.nextSkill && (
        <p className="rounded-xl bg-indigo-50 p-3 text-sm dark:bg-indigo-950">
          <b>С чего начать:</b> {map.nextSkill}.
        </p>
      )}
    </div>
  );
}
