import Link from "next/link";
import { PROFESSIONS, LEVEL_LABELS, LEVEL_DIFFICULTY, professionById, type Profession } from "@/data/professions";
import { categoryName, subjectAreaName } from "@/data/categories";
import { loadUserResult } from "@/backend/catalogContext";

export const dynamic = "force-dynamic";
export const metadata = { title: "Сравнение профессий — FuturePath AI" };

function List({ items }: { items: string[] }) {
  return <ul className="list-disc space-y-1 pl-5">{items.map((t) => <li key={t}>{t}</li>)}</ul>;
}

// Строки таблицы: название и функция, которая берёт нужные данные из профессии
function rowsFor(p: Profession, interest: number | null, overall: number | null) {
  return {
    category: categoryName(p.category),
    tasks: <List items={p.tasks} />,
    skills: <List items={p.skills} />,
    difficulty: `${LEVEL_LABELS[p.level]} · ${"●".repeat(LEVEL_DIFFICULTY[p.level])}${"○".repeat(3 - LEVEL_DIFFICULTY[p.level])}`,
    ai: (
      <>
        <p>{p.aiImpact}</p>
        <p className="mt-2 text-xs text-slate-500">Автоматизировать могут: {p.aiAutomates.join("; ")}.</p>
      </>
    ),
    study: <List items={p.study} />,
    interest: interest === null ? "Нет данных: нужен обновлённый тест" : `${interest}%`,
    overall: overall === null ? "Пройдите тест, чтобы увидеть" : `${overall}%`,
    subjects: p.subjects.map(subjectAreaName).join("; "),
  };
}

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ a?: string; b?: string }> }) {
  const { a, b } = await searchParams;
  const pa = a ? professionById(a) : undefined;
  const pb = b ? professionById(b) : undefined;
  const user = await loadUserResult();
  const ok = user.status === "ok" ? user.result : null;
  const matchOf = (id: string) => ok?.professions.find((m) => m.profession.id === id);

  const labels: [string, keyof ReturnType<typeof rowsFor>][] = [
    ["Направление", "category"],
    ["Основные задачи", "tasks"],
    ["Необходимые навыки", "skills"],
    ["Сложность подготовки", "difficulty"],
    ["Влияние ИИ", "ai"],
    ["Направления обучения", "study"],
    ["Школьные предметы", "subjects"],
    ["Совпадение с вашими интересами", "interest"],
    ["Общее совпадение (ориентир)", "overall"],
  ];

  return (
    <div className="space-y-5">
      <Link href="/professions" className="text-sm text-indigo-600 dark:text-indigo-400">← Каталог</Link>
      <h1 className="h2">Сравнение профессий</h1>

      <form method="get" className="card flex flex-wrap items-end gap-3 !p-4">
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
          Первая профессия
          <select name="a" defaultValue={a ?? ""} className="rounded-xl border border-slate-300 bg-white p-2.5 dark:border-slate-700 dark:bg-slate-900">
            <option value="">Выберите…</option>
            {PROFESSIONS.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        </label>
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
          Вторая профессия
          <select name="b" defaultValue={b ?? ""} className="rounded-xl border border-slate-300 bg-white p-2.5 dark:border-slate-700 dark:bg-slate-900">
            <option value="">Выберите…</option>
            {PROFESSIONS.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        </label>
        <button type="submit" className="btn-primary">Сравнить</button>
      </form>

      {!pa || !pb ? (
        <p className="text-sm text-slate-500">Выберите две профессии, чтобы увидеть таблицу сравнения.</p>
      ) : (
        <div className="card overflow-x-auto !p-0">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="bg-slate-100 text-left dark:bg-slate-800">
                <th className="w-1/4 p-3 font-semibold">Параметр</th>
                <th className="p-3 font-semibold">{pa.title}</th>
                <th className="p-3 font-semibold">{pb.title}</th>
              </tr>
            </thead>
            <tbody>
              {labels.map(([label, key]) => {
                const ra = rowsFor(pa, matchOf(pa.id)?.parts.interest ?? null, matchOf(pa.id)?.percent ?? null);
                const rb = rowsFor(pb, matchOf(pb.id)?.parts.interest ?? null, matchOf(pb.id)?.percent ?? null);
                return (
                  <tr key={key} className="border-t border-slate-200 align-top dark:border-slate-700">
                    <td className="p-3 font-medium">{label}</td>
                    <td className="p-3">{ra[key]}</td>
                    <td className="p-3">{rb[key]}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-slate-500">
        Совпадение — ориентир для размышления. Оно не оценивает способности и не предсказывает успех. Описания составлены авторами проекта; зарплат и статистики здесь нет.
      </p>
    </div>
  );
}
