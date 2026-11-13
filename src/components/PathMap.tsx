import Link from "next/link";
import { Check, Lock, Star, RotateCcw, Play } from "lucide-react";
import type { TrackView } from "@/backend/learn";
import { lessonSlug } from "@/learn/slug";

type T = (key: any, vars?: Record<string, string | number>) => string;
const OFFSETS = [0, 36, 56, 36, 0, -36, -56, -36]; // зигзаг узлов, px

// Вертикальная карта уроков: соединённые круглые узлы, состояния как в ТЗ.
export function PathMap({ track, t }: { track: TrackView; t: T }) {
  let n = 0;
  return (
    <div className="space-y-8">
      {track.modules.map((m) => (
        <section key={m.id} aria-labelledby={`h-${m.id}`}>
          <header className="rounded-2xl bg-indigo-600 p-4 text-white">
            <h2 id={`h-${m.id}`} className="text-lg font-extrabold">{m.title}</h2>
            {m.summary && <p className="text-sm text-indigo-50">{m.summary}</p>}
            {!m.expertReviewed && <p className="mt-1 text-xs text-indigo-100">{t("learn.draft")}</p>}
          </header>
          <ol className="flex flex-col items-center py-4">
            {m.lessons.map((l, i) => {
              const off = OFFSETS[(n++) % OFFSETS.length];
              const locked = l.state === "locked";
              const style =
                l.state === "completed" ? "bg-amber-400 border-amber-600 text-amber-950"
                : l.state === "needs_review" ? "bg-orange-400 border-orange-600 text-orange-950"
                : l.state === "available" || l.state === "in_progress" ? "bg-indigo-500 border-indigo-800 text-white"
                : "bg-slate-200 border-slate-300 text-slate-500 dark:bg-slate-800 dark:border-slate-700";
              const Icon = l.state === "completed" ? Check : l.state === "needs_review" ? RotateCcw : l.state === "in_progress" ? Play : locked ? Lock : Star;
              const label = `${l.title}. ${t(`learn.state.${l.state}`)}`;
              const node = (
                <span className={`flex h-[72px] w-[72px] items-center justify-center rounded-full border-b-8 ${style} ${l.state === "in_progress" ? "ring-4 ring-indigo-200 dark:ring-indigo-800" : ""}`}>
                  <Icon size={30} aria-hidden />
                </span>
              );
              return (
                <li key={l.id} className="relative flex flex-col items-center" style={{ transform: `translateX(${off}px)` }}>
                  {i > 0 && <span aria-hidden className="mb-1 h-5 w-1 rounded bg-slate-200 dark:bg-slate-700" />}
                  {(l.state === "available" || l.state === "in_progress") && <span className="mb-1 rounded-xl border-2 border-indigo-300 bg-white px-3 py-0.5 text-xs font-extrabold text-indigo-700 dark:border-indigo-700 dark:bg-slate-900 dark:text-indigo-300">{t("learn.start")}</span>}
                  {locked ? (
                    <span role="img" aria-label={label} aria-disabled="true">{node}</span>
                  ) : (
                    <Link href={`/learn/lesson/${lessonSlug(l.id)}`} aria-label={label} className="rounded-full outline-offset-4">{node}</Link>
                  )}
                  <span className="mt-1 max-w-[180px] text-center text-sm font-bold">{l.title}</span>
                  <span className="text-xs font-semibold text-slate-500">{t("learn.minutes", { n: l.minutes })}{l.bestScore !== null ? ` · ${Math.round(l.bestScore * 100)}%` : ""}</span>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
