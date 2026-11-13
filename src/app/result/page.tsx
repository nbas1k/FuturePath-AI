import Link from "next/link";
import { getProfile } from "@/backend/profile";
import { getLatestState } from "@/backend/results";
import { ResultChart } from "@/components/ResultChart";
import { AiExplain } from "@/components/AiExplain";
import { recommendDiverse } from "@/recommendation-engine";
import { TopProfessions } from "@/components/TopProfessions";

export const dynamic = "force-dynamic"; // читает cookie, поэтому не кэшируем
export const metadata = { title: "Результат — FuturePath AI" };

export default async function ResultPage() {
  const profile = await getProfile();
  const latest = profile ? await getLatestState(profile.id) : { status: "none" as const };
  if (latest.status === "none") {
    return (
      <div className="card mx-auto max-w-xl text-center">
        <h1 className="h2 mb-2">Результата пока нет</h1>
        <p className="mb-4 text-sm text-slate-500">Пройдите тест — он занимает около 5 минут.</p>
        <Link href="/test" className="btn-primary">Пройти тест</Link>
      </div>
    );
  }
  if (latest.status === "outdated") {
    return (
      <div className="card mx-auto max-w-xl text-center">
        <h1 className="h2 mb-2">Результат устарел</h1>
        <p className="mb-4 text-sm text-slate-500">
          Вопросы теста изменились с тех пор, как вы его проходили, поэтому старые ответы больше не подходят и баллы не пересчитываются. Пройдите тест заново.
        </p>
        <Link href="/test" className="btn-primary">Пройти тест заново</Link>
      </div>
    );
  }
  const { result } = latest;
  const selectedId = profile?.selectedProfession ?? null;
  return (
    <div className="space-y-6">
      <h1 className="h2">Результат теста и подходящие профессии</h1>
      {latest.version < 2 && (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          Этот результат получен по первой версии теста (18 вопросов), без учёта интересов по 18 направлениям.
          Старый результат сохранён. <Link href="/test" className="underline">Пройдите обновлённый тест</Link>, чтобы подбор учитывал интересы.
        </p>
      )}
      <TopProfessions matches={recommendDiverse(result, 5, 2)} selectedId={selectedId} hasInterests={result.hasInterests} />

      <h2 className="text-xl font-semibold">Ваши сильные направления</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        {result.top.map((d, i) => (
          <div key={d.id} className="card fade-in" style={{ animationDelay: `${i * 100}ms` }}>
            <span className="chip">№{i + 1}</span>
            <h2 className="mt-2 text-xl font-bold">{d.name}</h2>
            <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{d.percent}%</p>
            <p className="text-xs text-slate-500">{d.score} из {d.max} баллов</p>
          </div>
        ))}
      </div>

      <section className="card">
        <h2 className="mb-2 text-lg font-semibold">Баллы по всем направлениям</h2>
        <ResultChart data={result.directions.map((d) => ({ name: d.name, percent: d.percent }))} />
      </section>

      <section className="card">
        <h2 className="mb-3 text-lg font-semibold">Почему именно так: какие ответы повлияли</h2>
        <div className="space-y-4">
          {result.top.map((d) => (
            <div key={d.id}>
              <h3 className="font-medium">{d.name}</h3>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-400">
                {d.contributions.slice(0, 4).map((c) => (
                  <li key={c.questionId}>«{c.optionText}» — вопрос {c.questionId.replace("q", "")}, {c.points === 1 ? "+1 балл" : `+${c.points} балла`}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <AiExplain />

      <div className="flex flex-wrap gap-3">
        <Link href="/plan" className="btn-primary">Мой план на 30 дней</Link>
        <Link href="/test" className="btn-ghost">Пройти заново</Link>
      </div>
      <p className="text-xs text-slate-500">Процент — доля баллов от максимально возможных для направления. Это ориентир для размышления, а не диагноз.</p>
    </div>
  );
}
