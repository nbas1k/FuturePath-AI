// Линейка навыка: шкала с делениями, отметка «до», отметка «после» и жёлтый маркер между ними.
// Чистая разметка без логики: числа приходят снаружи. Если «после» не больше «до», маркер не рисуется (улучшения нет, и мы его не показываем).
export function SkillRuler({ before, after, max, labelBefore = "До", labelAfter = "После", animate = false }: { before: number; after: number | null; max: number; labelBefore?: string; labelAfter?: string; animate?: boolean }) {
  const ratio = (n: number) => Math.min(1, Math.max(0, n / max));
  const pct = (n: number) => `${ratio(n) * 100}%`;
  const improved = after !== null && after > before;
  // Подпись у края не должна выходить за шкалу: у правого края выравниваем вправо, у левого влево
  const shift = (n: number) => (ratio(n) > 0.85 ? "-100%" : ratio(n) < 0.15 ? "0%" : "-50%");
  // Если отметки близко, подпись «до» поднимаем выше, чтобы тексты не накладывались
  const close = after !== null && Math.abs(ratio(after) - ratio(before)) < 0.3;
  return (
    <figure className="select-none" aria-label={after === null ? `${labelBefore}: ${before} из ${max}` : `${labelBefore}: ${before} из ${max}, ${labelAfter.toLowerCase()}: ${after} из ${max}`}>
      <div className={"relative " + (close ? "h-[88px]" : "h-16")}>
        <div className="ruler-track absolute inset-x-0 bottom-3 h-5 border-b-2 border-slate-900 dark:border-slate-200" />
        {improved && (
          <div className={"absolute bottom-[10px] h-2.5 rounded-sm bg-marker " + (animate ? "ruler-sweep" : "")} style={{ left: pct(before), width: `calc(${pct(after!)} - ${pct(before)})` }} />
        )}
        <div className="absolute bottom-0 w-0" style={{ left: pct(before) }}>
          <div className="absolute bottom-0 h-10 w-0.5 -translate-x-1/2 bg-slate-500" />
          <span className={"absolute whitespace-nowrap text-xs font-medium text-slate-500 " + (close ? "bottom-[68px]" : "bottom-[46px]")} style={{ transform: `translateX(${shift(before)})` }}>{labelBefore}: {before}</span>
        </div>
        {after !== null && (
          <div className="absolute bottom-0 w-0" style={{ left: pct(after) }}>
            <div className="absolute bottom-0 h-10 w-1 -translate-x-1/2 rounded-full bg-indigo-600 dark:bg-indigo-300" />
            <span className="absolute bottom-[46px] whitespace-nowrap text-xs font-semibold text-indigo-700 dark:text-indigo-200" style={{ transform: `translateX(${shift(after)})` }}>{labelAfter}: {after}</span>
          </div>
        )}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-slate-500"><span>0</span><span>{max}</span></div>
    </figure>
  );
}
