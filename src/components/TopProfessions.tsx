import Link from "next/link";
import { LEVEL_LABELS } from "@/data/professions";
import { CYCLES } from "@/data/cycle";
import type { ProfessionMatch } from "@/recommendation-engine";
import { ChooseProfessionButton } from "@/components/ChooseProfessionButton";

// Топ-5 профессий из каталога 108 с объяснением. Данные берутся из правил подбора и каталога, ничего не выдумывается:
// зарплат, вакансий и прогнозов рынка здесь нет.
export function TopProfessions({ matches, selectedId, hasInterests }: { matches: ProfessionMatch[]; selectedId: string | null; hasInterests: boolean }) {
  return (
    <section className="space-y-5" aria-labelledby="top5-title">
      <div>
        <h2 id="top5-title" className="text-2xl font-semibold">Топ-5 профессий для вас</h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
          Подбор считают правила по вашим ответам, без ИИ. Процент совпадения — ориентир для размышления, а не оценка способностей и не прогноз успеха. Выберите профессию, и мы сразу предложим начать AI Readiness.
        </p>
      </div>

      <ol className="space-y-5">
        {matches.map((m, i) => {
          const p = m.profession;
          const hasCycle = Boolean(CYCLES[p.id]);
          return (
            <li key={p.id} className="rounded-xl border border-slate-300 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-500">№{i + 1} из 5</p>
                  <h3 className="text-xl font-semibold"><Link href={`/professions/${p.id}`} className="hover:underline">{p.title}</Link></h3>
                </div>
                <p className="text-right"><span className="text-3xl font-semibold text-indigo-600 dark:text-indigo-300">{m.percent}%</span><span className="block text-xs text-slate-500">совпадение</span></p>
              </div>

              <div className="mt-4 grid gap-5 text-sm sm:grid-cols-2">
                <div>
                  <h4 className="mb-1 font-semibold">Почему подходит и что совпало</h4>
                  <ul className="list-disc space-y-1 pl-5 text-slate-600 dark:text-slate-400">{m.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
                  <p className="mt-2 text-xs text-slate-500">
                    Интересы: {m.parts.interest === null ? "в этой версии теста не оценивались" : `${m.parts.interest}%`}; направление: {m.parts.direction}%; школьный предмет: {m.parts.requirement === 100 ? "подходит" : "не совпал или не выбран"}.
                  </p>
                </div>
                <div>
                  <h4 className="mb-1 font-semibold">Какие навыки нужно развивать</h4>
                  <ul className="list-disc space-y-1 pl-5 text-slate-600 dark:text-slate-400">{p.skills.slice(0, 5).map((s) => <li key={s}>{s}</li>)}</ul>
                </div>
                <div>
                  <h4 className="mb-1 font-semibold">Какие задачи может изменить ИИ</h4>
                  <ul className="list-disc space-y-1 pl-5 text-slate-600 dark:text-slate-400">{p.aiAutomates.slice(0, 3).map((s) => <li key={s}>{s}</li>)}</ul>
                </div>
                <div>
                  <h4 className="mb-1 font-semibold">Какие человеческие навыки останутся важными</h4>
                  <ul className="list-disc space-y-1 pl-5 text-slate-600 dark:text-slate-400">{p.humanSkills.slice(0, 3).map((s) => <li key={s}>{s}</li>)}</ul>
                </div>
              </div>

              <div className="mt-4 rounded-lg bg-slate-100 p-3 text-xs leading-relaxed text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <b>Ограничения рекомендации:</b> это совпадение по вашим ответам теста, а не проверка способностей. Описание профессии составлено авторами как ориентир, в нём нет зарплат, вакансий и прогнозов рынка. {hasInterests ? "" : "Тест версии 1 не учитывал интересы по направлениям. "}
                {hasCycle ? "Для этой профессии есть полный цикл AI Readiness: диагностика, обучение, работа с ИИ и повторная проверка." : "Для этой профессии пока нет полного цикла AI Readiness: доступны мягкие навыки, карта навыков, сценарии, ресурсы и наставник."}
              </div>

              <div className="mt-4 max-w-sm"><ChooseProfessionButton professionId={p.id} title={p.title} selected={selectedId === p.id} /></div>
            </li>
          );
        })}
      </ol>

      <div>
        <h3 className="mb-2 text-lg font-semibold">Сравнение рекомендованных профессий</h3>
        <div className="overflow-x-auto rounded-xl border border-slate-300 dark:border-slate-700">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-300 dark:border-slate-700">
                <th scope="col" className="p-3 font-medium text-slate-500">Что сравниваем</th>
                {matches.map((m) => <th key={m.profession.id} scope="col" className="p-3 font-semibold">{m.profession.title}</th>)}
              </tr>
            </thead>
            <tbody className="align-top">
              <tr className="border-b border-slate-200 dark:border-slate-800"><th scope="row" className="p-3 font-medium text-slate-500">Совпадение</th>{matches.map((m) => <td key={m.profession.id} className="p-3">{m.percent}%</td>)}</tr>
              <tr className="border-b border-slate-200 dark:border-slate-800"><th scope="row" className="p-3 font-medium text-slate-500">Подготовка</th>{matches.map((m) => <td key={m.profession.id} className="p-3">{LEVEL_LABELS[m.profession.level]}</td>)}</tr>
              <tr className="border-b border-slate-200 dark:border-slate-800"><th scope="row" className="p-3 font-medium text-slate-500">Ключевые навыки</th>{matches.map((m) => <td key={m.profession.id} className="p-3">{m.profession.skills.slice(0, 3).join("; ")}</td>)}</tr>
              <tr className="border-b border-slate-200 dark:border-slate-800"><th scope="row" className="p-3 font-medium text-slate-500">ИИ может взять на себя</th>{matches.map((m) => <td key={m.profession.id} className="p-3">{m.profession.aiAutomates[0]}</td>)}</tr>
              <tr className="border-b border-slate-200 dark:border-slate-800"><th scope="row" className="p-3 font-medium text-slate-500">Останется важным человеку</th>{matches.map((m) => <td key={m.profession.id} className="p-3">{m.profession.humanSkills[0]}</td>)}</tr>
              <tr><th scope="row" className="p-3 font-medium text-slate-500">Полный цикл AI Readiness</th>{matches.map((m) => <td key={m.profession.id} className="p-3">{CYCLES[m.profession.id] ? "есть" : "пока нет"}</td>)}</tr>
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-500">Любые две профессии можно сравнить подробнее на странице <Link href="/compare" className="underline">«Сравнение»</Link>.</p>
      </div>
    </section>
  );
}
