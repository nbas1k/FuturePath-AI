import Link from "next/link";
import { getProfile } from "@/backend/profile";
import { getLatestState } from "@/backend/results";
import { loadSkillMap } from "@/backend/skillMap";
import { loadCycle } from "@/backend/cycle";
import { professionById } from "@/data/professions";
import { STAGE_GROUPS, groupIndex } from "@/cycle/logic";
import { SkillRuler } from "@/components/SkillRuler";

// Единая карьерная карта: профессия, причины рекомендации, результаты диагностики, развитые навыки, пробелы и план.
// Всё берётся из сохранённых данных профиля, поэтому между посещениями ничего не теряется. Ничего не выдумывается.
export async function CareerMap() {
  const profile = await getProfile();
  const prof = profile?.selectedProfession ? professionById(profile.selectedProfession) : undefined;
  if (!profile || !prof) {
    return (
      <section className="rounded-xl border-2 border-slate-900 p-5 dark:border-slate-200" aria-labelledby="career-title">
        <h2 id="career-title" className="text-xl font-semibold">Моя карьерная карта</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Карта появится, когда вы выберете профессию. Если не знаете какую, пройдите тест и получите топ-5 с объяснением. Если уже знаете, выберите её сразу.</p>
        <div className="mt-4 flex flex-wrap gap-3"><Link href="/test" className="btn-primary">Пройти профориентацию</Link><Link href="/learn?tab=cycle" className="btn-ghost">Я уже знаю профессию</Link></div>
      </section>
    );
  }

  const test = await getLatestState(profile.id);
  const match = test.status === "ok" ? test.result.professions.find((m) => m.profession.id === prof.id) : undefined;
  const skills = await loadSkillMap(profile.id, prof.id);
  const cycle = await loadCycle(profile.id, prof.id);

  const confirmed = skills?.map.rows.filter((r) => r.status === "confirmed") ?? [];
  const gaps = skills?.map.rows.filter((r) => r.status === "gap" || r.status === "overestimated") ?? [];
  const inProgress = cycle.supported && cycle.run && cycle.stage !== "proof";
  const gi = inProgress ? groupIndex(cycle.stage) : -1;
  const todoSkills = cycle.supported ? cycle.skills.filter((s) => !s.completed).map((s) => s.skill) : [];

  return (
    <section className="space-y-5 rounded-xl border-2 border-slate-900 bg-white p-5 dark:border-slate-200 dark:bg-slate-900" aria-labelledby="career-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="career-title" className="text-xl font-semibold">Моя карьерная карта</h2>
          <p className="mt-1 text-sm text-slate-500">Профессия: <b className="text-slate-900 dark:text-slate-100">{prof.title}</b></p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link href="/learn?tab=cycle" className="btn-ghost !py-1.5">Сменить или продолжить</Link>
          <Link href={`/professions/${prof.id}`} className="btn-ghost !py-1.5">О профессии</Link>
        </div>
      </div>

      <div className="grid gap-5 text-sm sm:grid-cols-2">
        <div>
          <h3 className="mb-1 font-semibold">Почему эта профессия</h3>
          {match ? (
            <>
              <p className="text-slate-600 dark:text-slate-400">Совпадение с вашим тестом: {match.percent}% (ориентир, не оценка способностей).</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-slate-600 dark:text-slate-400">{match.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
            </>
          ) : test.status === "ok" ? (
            <p className="text-slate-600 dark:text-slate-400">Эта профессия не входила в ваш подбор, вы выбрали её сами. Результат теста: <Link href="/result" className="underline">топ-5 профессий</Link>.</p>
          ) : (
            <p className="text-slate-600 dark:text-slate-400">Вы выбрали профессию сами, тест не проходился. Если хотите проверить выбор, <Link href="/test" className="underline">пройдите тест</Link>.</p>
          )}
        </div>

        <div>
          <h3 className="mb-1 font-semibold">Результаты диагностики</h3>
          {cycle.history.length === 0 ? (
            <p className="text-slate-600 dark:text-slate-400">{cycle.supported ? "Завершённых циклов пока нет." : "Для этой профессии пока нет полного цикла диагностики."}</p>
          ) : (
            <ul className="space-y-3">
              {cycle.history.map((h, i) => (
                <li key={i}>
                  <p className="font-medium">«{h.skill}» <span className="font-normal text-slate-500">· {h.date}</span></p>
                  <div className="max-w-xs"><SkillRuler before={h.before} after={h.after} max={h.total} /></div>
                </li>
              ))}
            </ul>
          )}
          {cycle.history.length > 0 && <p className="mt-1 text-xs text-slate-500">По 3 заданиям на навык: индикатор динамики, а не доказательство освоения.</p>}
        </div>

        <div>
          <h3 className="mb-1 font-semibold">Развитые навыки (подтверждены заданиями)</h3>
          {confirmed.length ? <ul className="list-disc space-y-1 pl-5">{confirmed.map((r) => <li key={r.skill}>{r.skill}</li>)}</ul> : <p className="text-slate-600 dark:text-slate-400">Пока нет. Навык подтверждается самостоятельными заданиями; самооценка подтверждением не считается.</p>}
        </div>

        <div>
          <h3 className="mb-1 font-semibold">Оставшиеся пробелы</h3>
          {gaps.length || todoSkills.length ? (
            <ul className="list-disc space-y-1 pl-5">
              {gaps.map((r) => <li key={r.skill}>{r.skill} — {r.status === "overestimated" ? "самооценка выше результата заданий" : "нужно развивать"}</li>)}
              {todoSkills.filter((s) => !gaps.some((g) => g.skill === s)).map((s) => <li key={s}>{s} — цикл ещё не пройден</li>)}
            </ul>
          ) : <p className="text-slate-600 dark:text-slate-400">По проверенным заданиям пробелов нет. Остальные навыки профессии заданиями пока не проверены.</p>}
        </div>
      </div>

      <div className="rounded-lg bg-slate-100 p-4 dark:bg-slate-800">
        <h3 className="mb-1 font-semibold">Персональный план дальше</h3>
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          {inProgress && <li>Продолжить цикл по навыку «{cycle.run!.skill}»: сейчас этап {gi + 1} из {STAGE_GROUPS.length} ({STAGE_GROUPS[gi].label.toLowerCase()}). <Link href="/learn?tab=cycle" className="underline">Продолжить</Link></li>}
          {!inProgress && cycle.suggestedSkill && <li>Пройти диагностику и повторную проверку по навыку «{cycle.suggestedSkill}». <Link href="/learn?tab=cycle" className="underline">Начать</Link></li>}
          {gaps.length > 0 && <li>Повторить задания по навыкам с пробелами и спросить <Link href="/learn?tab=mentor" className="underline">AI-наставника</Link>, чтобы разобрать ошибки.</li>}
          <li>Отработать мягкие навыки и собеседование: <Link href="/learn?tab=soft" className="underline">мягкие навыки</Link>{cycle.supported ? <>, <Link href="/learn?tab=interview" className="underline">собеседование</Link></> : null}.</li>
          <li>Посмотреть <Link href="/learn?tab=scenarios" className="underline">сценарии профессии</Link> и <Link href="/learn?tab=resources" className="underline">ресурсы</Link> для самостоятельного изучения.</li>
          <li>Собрать <Link href="/profile/passport" className="underline">паспорт навыков</Link> и <Link href="/profile/portfolio" className="underline">портфолио</Link>.</li>
        </ol>
      </div>
    </section>
  );
}
