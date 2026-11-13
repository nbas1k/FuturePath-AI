import Link from "next/link";
import { COUNTS, featuresIn, STATUS_LABELS, type FeatureSection } from "@/data/features";

// Инструменты раздела: рабочие функции со ссылками, нереализованные показаны честно без кнопки запуска.
export function SectionTools({ section, title = "Инструменты этого раздела" }: { section: FeatureSection; title?: string }) {
  const list = featuresIn(section);
  return (
    <section className="space-y-3" aria-label={title}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold">{title}</h2>
        <Link href="/features" className="text-sm text-indigo-600 underline dark:text-indigo-400">Все возможности ({COUNTS.ready + COUNTS.partial} из 27 доступны)</Link>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {list.map((f) => (
          <li key={f.n} className={"card space-y-1 border-l-4 !p-4 " + (f.status === "ready" ? "!border-l-indigo-600 dark:!border-l-indigo-300" : f.status === "partial" ? "!border-l-marker" : "!border-l-slate-300 dark:!border-l-slate-700")}>
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium">{f.title}</p>
              <span className={"shrink-0 rounded px-2 py-0.5 text-xs font-medium " + (f.status === "ready" ? "bg-indigo-50 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200" : f.status === "partial" ? "bg-marker-soft text-marker-ink dark:bg-amber-950 dark:text-amber-200" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300")}>{STATUS_LABELS[f.status]}</span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">{f.desc}</p>
            {f.href ? <Link href={f.href} className="inline-block text-sm text-indigo-600 underline dark:text-indigo-400">Открыть</Link> : <p className="text-xs text-slate-500">{f.limit}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}
