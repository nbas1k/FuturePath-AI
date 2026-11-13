import Link from "next/link";
import { SectionTools } from "@/components/SectionTools";
import { prisma } from "@/backend/db";
import { getProfile } from "@/backend/profile";
import { getLatestState } from "@/backend/results";
import { loadJourney } from "@/backend/journeyContext";
import { CabinetActions } from "@/components/CabinetActions";
import { TASKS_FOR_PROGRESS_STEP } from "@/journey/logic";
import { SKILL_RATING_LABELS } from "@/journey/labels";
import { CareerMap } from "@/components/CareerMap";
import { loadProgress } from "@/backend/analytics";
import { ProgressPanel } from "@/components/ProgressPanel";

export const dynamic = "force-dynamic";
export const metadata = { title: "Профиль — FuturePath AI" };

// Раздел «Профиль»: прогресс, паспорт навыков (самооценка) и настройки. Бывший «Кабинет».
export default async function ProfilePage() {
  const profile = await getProfile();
  if (!profile) {
    return (
      <div className="card mx-auto max-w-xl text-center">
        <h1 className="h2 mb-2">Ваш профиль</h1>
        <p className="mb-4 text-sm text-slate-500">Профиль создаётся, когда вы проходите тест. Начнём?</p>
        <Link href="/path" className="btn-primary">Начать мой путь</Link>
      </div>
    );
  }
  const data = await loadJourney();
  const latest = await getLatestState(profile.id);
  const attempts = await prisma.testResult.count({ where: { profileId: profile.id } });
  const doneSteps = data.journey.completed;
  const progress = data.selected ? await loadProgress(profile.id, data.selected.id) : null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="h2 mb-1">Профиль</h1>
        <p className="text-sm text-slate-500">Здесь ваш прогресс и настройки. Всё, что вы отметили, сохраняется.</p>
      </div>

      <CareerMap />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card"><p className="text-xs text-slate-500">Имя</p><p className="text-lg font-semibold">{profile.name}</p></div>
        <div className="card"><p className="text-xs text-slate-500">Шагов пути пройдено</p><p className="text-lg font-semibold">{doneSteps} из 5</p></div>
        <div className="card"><p className="text-xs text-slate-500">Заданий выполнено</p><p className="text-lg font-semibold">{data.facts.tasksDone} (нужно {TASKS_FOR_PROGRESS_STEP} для шага 5)</p></div>
      </div>

      <section className="card space-y-2">
        <h2 className="font-semibold">Выбранная профессия</h2>
        {data.selected ? (
          <p className="text-sm">{data.selected.title}. <Link href="/path" className="text-indigo-600 underline dark:text-indigo-400">Открыть путь</Link></p>
        ) : (
          <p className="text-sm text-slate-500">Пока не выбрана. <Link href="/path" className="text-indigo-600 underline dark:text-indigo-400">Выбрать на шаге 2</Link></p>
        )}
      </section>

      {progress && (
        <section className="card space-y-3">
          <h2 className="font-semibold">Прогресс обучения</h2>
          <ProgressPanel data={progress} />
        </section>
      )}

      {progress && (
        <section className="card space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">Паспорт навыков</h2>
              <p className="text-sm text-slate-500">Подтверждено заданиями: {progress.confirmedSkills.length}. Достижений: {progress.achievements.filter((a) => a.done).length} из {progress.achievements.length}.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/profile/passport" className="btn-primary">Открыть паспорт и отчёт</Link>
              <Link href="/profile/portfolio" className="btn-ghost">Портфолио проектов</Link>
            </div>
          </div>
        </section>
      )}

      <section className="card space-y-3">
        <h2 className="font-semibold">Самооценка навыков</h2>
        <p className="text-xs text-slate-500">Это ваша самооценка по навыкам выбранной профессии. Это не проверка уровня.</p>
        {data.selected ? (
          <ul className="space-y-1 text-sm">
            {data.selected.skills.map((s) => {
              const r = data.ratings[s];
              return (
                <li key={s} className="flex justify-between gap-3 border-b border-slate-100 py-1 dark:border-slate-800">
                  <span>{s}</span>
                  <span className="text-slate-500">{r === undefined ? "не отмечено" : SKILL_RATING_LABELS[r as 0 | 1 | 2]}</span>
                </li>
              );
            })}
          </ul>
        ) : <p className="text-sm text-slate-500">Появится после выбора профессии.</p>}
      </section>

      <section className="card">
        <h2 className="mb-2 font-semibold">Последний результат теста</h2>
        {latest.status === "ok" ? (
          <>
            <p className="text-sm">Топ-3 направления: {latest.result.top.map((d) => `${d.name} (${d.percent}%)`).join(", ")}</p>
            <p className="mt-1 text-xs text-slate-500">Версия теста: {latest.version} · пройдено раз: {attempts}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/result" className="btn-ghost">Открыть результат</Link>
            </div>
          </>
        ) : latest.status === "outdated" ? (
          <p className="text-sm text-amber-700 dark:text-amber-300">Результат устарел. <Link href="/test" className="underline">Пройти тест заново</Link></p>
        ) : (
          <p className="text-sm text-slate-500">Результата пока нет. <Link href="/test" className="text-indigo-600 underline">Пройти тест</Link></p>
        )}
      </section>

      <section className="card">
        <h2 className="mb-2 font-semibold">Настройки</h2>
        <CabinetActions name={profile.name} />
      </section>

      <p className="text-xs text-slate-500">
        Это демо-профиль: пароля нет, он привязан к cookie этого браузера. Если очистить cookie, доступ к данным пропадёт.
      </p>

      <SectionTools section="profile" title="Инструменты раздела «Профиль»" />
    </div>
  );
}
