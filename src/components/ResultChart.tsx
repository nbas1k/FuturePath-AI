"use client";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// Столбчатая диаграмма: процент по каждому направлению
export function ResultChart({ data }: { data: { name: string; percent: number }[] }) {
  const colors = ["#14595F", "#1F7479", "#4FB3A9", "#A9D2D3", "#75B5B8", "#D2E8E8"];
  return (
    <div className="h-64 w-full" aria-label="Диаграмма баллов по направлениям">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.3} />
          <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#94a3b8" }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "#94a3b8" }} unit="%" />
          <Tooltip formatter={(v) => [`${v}%`, "Совпадение"]} />
          <Bar dataKey="percent" radius={[6, 6, 0, 0]} isAnimationActive={false}>
            {data.map((_, i) => <Cell key={i} fill={colors[i] ?? colors[5]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
