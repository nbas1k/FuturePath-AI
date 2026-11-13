import Link from "next/link";
import { getProfile } from "@/backend/profile";
import { loadProgress } from "@/backend/analytics";
import { loadSkillMap } from "@/backend/skillMap";
import { STATUS_LABEL } from "@/skills/map";
import { PrintButton } from "@/components/PrintButton";

export const dynamic = "force-dynamic";
export const metadata = { title: "Паспорт навыков — FuturePath AI" };

// Паспорт навыков: только то, что подтверждено заданиями, плюс самооценка отдельно. Можно распечатать как отчёт.
export default async function PassportPage() {
  const profile = await getProfile();
  if (!profile?.selectedProfession) {
    return (
      <div className="card mx-auto max-w-xl text-center">
        <h1 className="h2 mb-2">Паспорт навыков</h1>
        <p className="mb-4 text-sm text-slate-500">Паспорт строится по выбранной профессии. Сначала пройдите тест и выберите профессию.</p>
        <Link href="/path" className="btn-primary">Мой путь</Link>
      </div>
    );
  }
  const data = await loadProgress(profile.id, profile.selectedProfession);
  const skills = await loadSkillMap(profile.id, profile.selectedProfession);
  if (!data || !skills) return <p className="text-sm">Профессия не найдена в каталоге.</p>;
  const today = new Date().toISOString().slice(0, 10);
  const lastSim = data.sims[data.sims.length - 1];
  const lastInt = data.interviews[data.interviews.length - 1];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/profile" className="text-sm text-indigo-600 underline dark:text-indigo-400">← Профиль</Link>
        <PrintButton />
      </div>

      <header className="card space-y-1">
        <h1 className="h2">Паспорт навыков: {profile.name}</h1>
        <p className="text-sm text-slate-500">Профессия: {data.profession.title} · дата отчёта: {today}</p>
        <p className="text-xs text-slate-500">Учебный отчёт платформы FuturePath AI. Это не диплом и не сертификат: навык подтверждается решёнными самостоятельно заданиями (от 75% верных), а не оценкой профессионального уровня.</p>
      </header>

      <section className="card space-y-2">
        <h2 className="font-semibold">Подтверждённые навыки ({data.confirmedSkills.length} из {skills.map.rows.length})</h2>
        {data.confirmedSkills.length ? <ul className="list-disc pl-5 text-sm">{data.confirmedSkills.map((s) => <li key={s}>{s}</li>)}</ul> : <p className="text-sm text-slate-500">Пока нет подтверждённых навыков. Они появятся после самостоятельных заданий в разделе «Обучение».</p>}
      </section>

      <section className="card space-y-2">
        <h2 className="font-semibold">Все навыки профессии</h2>
        <div className="overflow-x-auto"><table className="w-full min-w-[480px] text-sm">
          <thead><tr className="text-left text-xs text-slate-500"><th className="py-1">Навык</th><th>Самооценка</th><th>Задания</th><th>Статус</th></tr></thead>
          <tbody>
            {skills.map.rows.map((r) => (
              <tr key={r.skill} className="border-t border-slate-100 dark:border-slate-800">
                <td className="py-1 pr-2">{r.skill}</td>
                <td>{r.self === null ? "не отмечено" : ["пока нет", "немного", "уверенно"][r.self]}</td>
                <td>{r.verifiedPct === null ? "нет заданий" : `${r.verifiedPct}% (${r.tasks})`}</td>
                <td>{STATUS_LABEL[r.status]}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </section>

      <section className="card space-y-1 text-sm">
        <h2 className="font-semibold">Циклы подготовки (диагностика → обучение → повторная проверка)</h2>
        {data.cycles.length ? <ul className="list-disc pl-5">{data.cycles.map((c, i) => <li key={i}>{c.date}: «{c.skill}» — начальный результат {c.before} из {c.total}, итоговый {c.after} из {c.total}</li>)}</ul> : <p className="text-slate-500">Завершённых циклов пока нет.</p>}
        <p className="text-xs text-slate-500">Это по {data.cycles.length ? "3 заданиям на навык" : "заданиям цикла"}: учебный индикатор динамики, а не оценка владения навыком.</p>
      </section>

      <section className="card space-y-1 text-sm">
        <h2 className="font-semibold">Курсы и задания</h2>
        {data.course.exists ? (
          <p>Мини-курс: прочитано уроков {data.course.lessonsRead} из {data.course.lessonsTotal}; проверки: {data.course.round1 ?? "не пройдена"} → {data.course.round2 ?? "не пройдена"} из {data.course.total}. {data.course.done ? "Курс завершён." : "Курс не завершён."}</p>
        ) : <p className="text-slate-500">Для этой профессии мини-курса пока нет.</p>}
        {data.challenge.exists && (
          <p>Human + AI Challenge: сам {data.challenge.solo ?? "—"}, с подсказками ИИ {data.challenge.withAi ?? "—"}, ИИ без человека {data.challenge.ai ?? "—"} из {data.challenge.total}.</p>
        )}
      </section>

      <section className="card space-y-1 text-sm">
        <h2 className="font-semibold">Симулятор и собеседование</h2>
        <p>{lastSim ? `Рабочий день: последний результат ${lastSim.total} из 30 (прохождений: ${data.sims.length}).` : "Рабочий день пока не пройден."}</p>
        <p>{lastInt ? `Пробное собеседование: последний результат ${lastInt.total} из ${lastInt.max} (попыток: ${data.interviews.length}). Оценку поставил ИИ, она может быть неточной.` : "Пробное собеседование пока не пройдено."}</p>
      </section>

      <section className="card space-y-1">
        <h2 className="font-semibold">Достижения</h2>
        <ul className="space-y-1 text-sm">{data.achievements.map((a) => <li key={a.id}>{a.done ? "✔" : "○"} {a.title}</li>)}</ul>
      </section>
    </div>
  );
}
