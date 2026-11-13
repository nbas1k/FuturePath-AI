import Link from "next/link";
import { notFound } from "next/navigation";
import { PROFESSIONS, LEVEL_LABELS, LEVEL_DIFFICULTY, professionById } from "@/data/professions";
import { categoryName, subjectAreaName } from "@/data/categories";
import { contextFromResult, loadUserResult } from "@/backend/catalogContext";
import { FavoriteButton } from "@/components/FavoriteButton";

export function generateStaticParams() {
  return PROFESSIONS.map((p) => ({ id: p.id }));
}

export const dynamicParams = false;

function Section({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="card">
      <h2 className="mb-2 font-semibold">{title}</h2>
      <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-400">{items.map((t) => <li key={t}>{t}</li>)}</ul>
    </section>
  );
}

export default async function ProfessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = professionById(id);
  if (!p) notFound();

  const user = await loadUserResult();
  const ctx = contextFromResult(user);
  const match = user.status === "ok" ? user.result.professions.find((m) => m.profession.id === p.id) : undefined;
  const sameCategory = PROFESSIONS.filter((x) => x.category === p.category && x.id !== p.id).slice(0, 4);
  const difficulty = LEVEL_DIFFICULTY[p.level];

  return (
    <div className="space-y-5">
      <Link href="/professions" className="text-sm text-indigo-600 dark:text-indigo-400">← Все профессии</Link>

      <header className="space-y-2">
        <span className="chip">{categoryName(p.category)}</span>
        <h1 className="h2">{p.title}</h1>
        <p className="text-slate-600 dark:text-slate-400">{p.description}</p>
        <div className="flex flex-wrap gap-2 pt-1">
          <FavoriteButton id={p.id} />
          <Link href={`/compare?a=${p.id}`} className="btn-ghost">Сравнить с другой профессией</Link>
          <Link href={`/professions/switch?to=${p.id}`} className="btn-ghost">Перейти с моей профессии</Link>
        </div>
      </header>

      {/* Почему подходит: только если есть результат. Это ориентир, а не оценка способностей. */}
      <section className="card space-y-3">
        <h2 className="font-semibold">Почему эта профессия в подборе</h2>
        {match ? (
          <>
            <p className="text-sm">Совпадение: <b>{match.percent}%</b> (ориентир для размышления, а не оценка способностей и не вероятность успеха).</p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-400">
              {match.reasons.map((r) => <li key={r}>{r}</li>)}
            </ul>
          </>
        ) : (
          <p className="text-sm text-slate-500">
            {ctx.matches ? "Для этой профессии совпадение не посчитано." : <>Пройдите <Link href="/test" className="text-indigo-600 underline">тест</Link>, и здесь появится, почему профессия подходит именно вам.</>}
          </p>
        )}
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <Section title="Основные обязанности" items={p.tasks} />
        <Section title="Необходимые навыки" items={p.skills} />
        <Section title="Примеры практических проектов" items={p.projects} />
        <Section title="Возможные направления обучения" items={p.study} />
      </div>

      <section className="card space-y-3">
        <h2 className="font-semibold">Уровень подготовки и школа</h2>
        <p className="text-sm">{LEVEL_LABELS[p.level]}. Сложность подготовки: {"●".repeat(difficulty)}{"○".repeat(3 - difficulty)} (1 — проще, 3 — сложнее).</p>
        <p className="text-sm">Подходящие школьные предметы: {p.subjects.map(subjectAreaName).join("; ")}.</p>
      </section>

      <section className="card space-y-3">
        <h2 className="font-semibold">Влияние искусственного интеллекта</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">{p.aiImpact}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Section title="Что ИИ может автоматизировать" items={p.aiAutomates} />
          <Section title="Что останется важным для человека" items={p.humanSkills} />
        </div>
        <p className="text-xs text-slate-500">Это качественное описание авторов проекта, а не статистика и не прогноз рынка труда.</p>
      </section>

      <Section title="Возможности карьерного роста" items={p.growth} />

      {sameCategory.length > 0 && (
        <section className="card">
          <h2 className="mb-2 font-semibold">Похожие профессии в этом направлении</h2>
          <div className="flex flex-wrap gap-2">
            {sameCategory.map((x) => (
              <Link key={x.id} href={`/professions/${x.id}`} className="chip hover:bg-indigo-100 dark:hover:bg-indigo-900">{x.title}</Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
