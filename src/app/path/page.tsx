import { loadJourney } from "@/backend/journeyContext";
import Link from "next/link";
import { getProfile } from "@/backend/profile";
import { loadCycle } from "@/backend/cycle";
import { STAGE_GROUPS, groupIndex } from "@/cycle/logic";
import { SectionTools } from "@/components/SectionTools";
import { JourneyPanel } from "@/components/JourneyPanel";

export const dynamic = "force-dynamic";
export const metadata = { title: "Мой путь — FuturePath AI" };

export default async function PathPage() {
  const data = await loadJourney();
  const { journey } = data;
  const profile = data.selected ? await getProfile() : null;
  const cycle = profile && data.selected ? await loadCycle(profile.id, data.selected.id) : null;
  const stageIdx = cycle?.supported ? groupIndex(cycle.stage) : -1;
  const headline = journey.doneAll
    ? "Все шаги пройдены. Можно продолжать обучение."
    : `Шаг ${journey.current} из 5 — ${journey.steps[(journey.current ?? 1) - 1].title}`;
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <p className="text-sm text-slate-500">Пройдено шагов: {journey.completed} из 5</p>
        <h1 className="h2 mt-1">Мой путь</h1>
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{headline}</p>
        <p className="mt-1 text-sm text-slate-500">Идите по шагам сверху вниз. Пройденные шаги можно открыть, чтобы посмотреть или поменять ответ.</p>
      </div>
      {!data.selected && (
        <div className="card flex flex-wrap items-center justify-between gap-3 border-indigo-300 bg-indigo-50/60 dark:border-indigo-800 dark:bg-indigo-950/40">
          <div>
            <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">Главный маршрут</p>
            <p className="font-semibold">Подготовка к работе с ИИ</p>
            <p className="text-sm text-slate-600 dark:text-slate-400">Выберите профессию и навык, проверьте себя без ИИ, подтяните пробелы и проверьте заново. Тест не нужен.</p>
          </div>
          <Link href="/learn" className="btn-primary">Выбрать цель</Link>
        </div>
      )}
      {cycle?.supported && data.selected && (
        <div className="card flex flex-wrap items-center justify-between gap-3 border-indigo-300 bg-indigo-50/60 dark:border-indigo-800 dark:bg-indigo-950/40">
          <div>
            <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">Главный маршрут</p>
            <p className="font-semibold">Подготовка к работе с ИИ: {data.selected.title}</p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {cycle.run ? `Навык «${cycle.run.skill}». Сейчас: ${STAGE_GROUPS[stageIdx].label.toLowerCase()} (этап ${stageIdx + 1} из ${STAGE_GROUPS.length}).` : "Выберите навык, проверьте его на практике, подтяните пробелы и проверьте заново."}
            </p>
          </div>
          <Link href="/learn" className="btn-primary">{cycle.run ? "Продолжить цикл" : "Начать цикл"}</Link>
        </div>
      )}
      <section className="space-y-2">
        <h2 className="font-semibold">Подбор профессии по интересам (необязательно)</h2>
        <p className="text-sm text-slate-500">Тест и подбор помогают выбрать направление. Для подготовки к работе с ИИ они не нужны.</p>
        <JourneyPanel data={data} />
      </section>
      <SectionTools section="path" title="Инструменты раздела «Мой путь»" />
    </div>
  );
}
