import Link from "next/link";
import { getProfile } from "@/backend/profile";
import { loadJourney } from "@/backend/journeyContext";
import { loadCycle } from "@/backend/cycle";
import { STAGE_GROUPS, groupIndex } from "@/cycle/logic";
import { COUNTS } from "@/data/features";
import { SkillRuler } from "@/components/SkillRuler";

export const dynamic = "force-dynamic";

const STAGES = [
  { t: "Цель", d: "Выберите профессию и навык. Тест профессий не нужен." },
  { t: "Диагностика", d: "Практические задания без ИИ. Начальный уровень сохраняется." },
  { t: "Обучение", d: "Мини-уроки и упражнения по вашим ошибкам, наставник рядом." },
  { t: "Работа с ИИ", d: "Задания с подсказками ИИ: проверьте их и найдите ошибки." },
  { t: "Повторная проверка", d: "Новое задание без ИИ по тем же критериям." },
  { t: "Результат", d: "Было, стало, исправленные ошибки и что изучать дальше." },
];

const TOOLS = [
  { t: "Человек + ИИ", d: "Сначала сам, потом с подсказками ИИ", href: "/learn?tab=challenge" },
  { t: "Симулятор рабочего дня", d: "Решения и их последствия", href: "/learn?tab=sim" },
  { t: "Карта навыков", d: "Что подтверждено, а что нет", href: "/learn?tab=skills" },
  { t: "AI-наставник", d: "Объяснит ошибки, не решит задание", href: "/learn?tab=mentor" },
  { t: "Тренажёр собеседований", d: "Вопросы и разбор ответов", href: "/learn?tab=interview" },
  { t: "Мягкие навыки", d: "Сложность подстраивается под вас", href: "/learn?tab=soft" },
  { t: "Паспорт навыков", d: "Отчёт для печати или PDF", href: "/profile/passport" },
  { t: "Каталог профессий", d: "108 профессий, сравнение, смена", href: "/professions" },
];

const BENEFITS = [
  "Один маршрут вместо набора разрозненных тестов",
  "Прогресс виден по одинаковым критериям: до и после обучения",
  "Ошибки ИИ показаны, а не скрыты",
  "Подтверждён только тот навык, который вы выполнили сами",
  "Честные статусы: что работает, что частично, чего ещё нет",
];

export default async function Home() {
  const profile = await getProfile();
  const data = await loadJourney();
  const selected = data.selected;
  const cycle = profile && selected ? await loadCycle(profile.id, selected.id) : null;
  const gi = cycle?.supported && cycle.run ? groupIndex(cycle.stage) : -1;
  const done = cycle?.history.length ?? 0;
  const hasTest = data.user.status === "ok";

  return (
    <div className="space-y-16 sm:space-y-20">
      {/* Первый экран: слева обещание и действие, справа линейка с примером измерения */}
      <section className="relative -mx-4 overflow-hidden px-4 pb-4 pt-6 sm:pt-12">
        <div className="paper-grid pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative grid items-center gap-10 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <h1 className="max-w-xl font-display text-4xl font-semibold leading-[1.08] tracking-display sm:text-5xl lg:text-[56px]">
              Подготовься к работе в эпоху ИИ
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-slate-600 dark:text-slate-400">
              Проверь свои навыки, научись работать с искусственным интеллектом и узнай, насколько ты готов к профессии будущего.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2" role="group" aria-label="С чего начать">
              <div className="flex flex-col rounded-xl border-2 border-slate-900 bg-white p-5 dark:border-slate-200 dark:bg-slate-900">
                <h2 className="text-lg font-semibold">Не знаю, какую профессию выбрать</h2>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">Пройдите тест интересов: получите топ-5 профессий с объяснением, что совпало и что изменит ИИ, и сразу начните подготовку.</p>
                <Link href={hasTest ? "/result" : "/test"} className="btn-primary mt-4">{hasTest ? "Посмотреть мои профессии" : "Пройти профориентацию"}</Link>
              </div>
              <div className="flex flex-col rounded-xl border border-slate-300 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
                <h2 className="text-lg font-semibold">Уже знаю свою профессию</h2>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">Выберите профессию и навык без теста: диагностика, обучение, практика с ИИ и повторная проверка.</p>
                <Link href="/learn?tab=cycle" className="btn-ghost mt-4">Проверить свои навыки</Link>
              </div>
            </div>
            <p className="mt-4 text-sm">
              <Link href="/features" className="font-medium text-slate-700 underline decoration-marker decoration-2 underline-offset-4 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">Посмотреть все возможности</Link>
              <span className="text-slate-500"> · тест нужен только тем, кто ещё не определился</span>
            </p>
          </div>

          <div className="rounded-xl border border-slate-300 bg-white p-5 dark:border-slate-700 dark:bg-slate-900 sm:p-6" aria-labelledby="example-title">
            <div className="flex items-center justify-between gap-3">
              <h2 id="example-title" className="text-base font-semibold">Как выглядит результат</h2>
              <span className="rounded bg-marker px-2 py-0.5 text-xs font-bold text-marker-ink">Пример</span>
            </div>
            <p className="mt-1 text-sm text-slate-500">Навык «Логическое мышление», 3 задания</p>
            <div className="mt-6"><SkillRuler before={1} after={3} max={3} animate /></div>
            <p className="mt-4 border-t border-slate-200 pt-3 text-xs leading-relaxed text-slate-500 dark:border-slate-800">
              Пример из тестового прохождения, а не результаты реальных пользователей и не статистика платформы. 3 задания показывают динамику, но не доказывают освоение навыка.
            </p>
          </div>
        </div>
      </section>

      {cycle?.supported && selected && (
        <section className="rounded-xl border-2 border-slate-900 bg-white p-5 dark:border-slate-200 dark:bg-slate-900" aria-labelledby="progress-title">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 id="progress-title" className="text-lg font-semibold">Ваш прогресс: {selected.title}</h2>
              {cycle.run ? (
                <>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Навык «{cycle.run.skill}». Сейчас: этап {gi + 1} из {STAGE_GROUPS.length}, {STAGE_GROUPS[gi].label.toLowerCase()}. Завершённых циклов: {done}.</p>
                  <div className="mt-3 flex gap-1" aria-hidden>
                    {STAGE_GROUPS.map((g, i) => <span key={g.label} className={"h-1.5 w-10 rounded-full sm:w-14 " + (i < gi ? "bg-indigo-600 dark:bg-indigo-300" : i === gi ? "bg-marker" : "bg-slate-200 dark:bg-slate-700")} />)}
                  </div>
                </>
              ) : <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Цель выбрана. Следующий шаг: выбрать навык и пройти диагностику.</p>}
            </div>
            <Link href="/learn?tab=cycle" className="btn-primary">{cycle.run && cycle.stage === "proof" ? "Выбрать новый навык для проверки" : "Продолжить цикл"}</Link>
          </div>
        </section>
      )}

      {/* Шесть этапов: это последовательность, поэтому нумерация оправдана */}
      <section aria-labelledby="how-title">
        <h2 id="how-title" className="text-2xl font-semibold sm:text-3xl">Шесть этапов AI Readiness</h2>
        <p className="mt-2 max-w-xl text-slate-600 dark:text-slate-400">Один пользователь, одна задача: проверить и развить навыки для работы с ИИ. Всё остальное помогает этому маршруту.</p>
        <ol className="mt-8 grid gap-x-10 border-t border-slate-300 dark:border-slate-700 sm:grid-cols-2 lg:grid-cols-3">
          {STAGES.map((s, i) => (
            <li key={s.t} className="flex gap-4 border-b border-slate-200 py-5 dark:border-slate-800">
              <span className="font-display text-3xl font-semibold leading-none text-slate-300 dark:text-slate-600" aria-hidden>{i + 1}</span>
              <div>
                <h3 className="text-base font-semibold">{s.t}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{s.d}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="tools-title">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="tools-title" className="text-2xl font-semibold sm:text-3xl">Инструменты</h2>
          <Link href="/features" className="text-sm font-medium text-slate-700 underline decoration-marker decoration-2 underline-offset-4 dark:text-slate-300">Все 27 возможностей: работает {COUNTS.ready}, частично {COUNTS.partial}</Link>
        </div>
        <ul className="grid border-t border-slate-300 dark:border-slate-700 sm:grid-cols-2 sm:gap-x-10">
          {TOOLS.map((t) => (
            <li key={t.t} className="border-b border-slate-200 dark:border-slate-800">
              <Link href={t.href} className="group flex items-baseline justify-between gap-4 py-4">
                <span><span className="block font-semibold group-hover:text-indigo-600 dark:group-hover:text-indigo-300">{t.t}</span><span className="block text-sm text-slate-500">{t.d}</span></span>
                <span aria-hidden className="text-slate-400 transition-transform group-hover:translate-x-0.5">›</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="benefits-title" className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <h2 id="benefits-title" className="text-2xl font-semibold sm:text-3xl">Чем отличается</h2>
        <ul className="space-y-3">
          {BENEFITS.map((b) => (
            <li key={b} className="flex gap-3 text-slate-700 dark:text-slate-300"><span className="mt-2 h-2 w-2 shrink-0 rounded-sm bg-marker" aria-hidden />{b}</li>
          ))}
        </ul>
      </section>

      <section>
        <details className="rounded-xl border border-slate-200 p-5 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-400">
          <summary className="cursor-pointer font-semibold text-slate-900 dark:text-slate-100">О проекте</summary>
          <div className="mt-3 max-w-2xl space-y-2 leading-relaxed">
            <p>FuturePath AI — учебный прототип для хакатона National Founder Cup, зона THE HUMAN FUTURE. Проблема: требования к навыкам меняются быстрее, чем молодые люди успевают адаптироваться к ИИ.</p>
            <p>Полный цикл подготовки сейчас есть для трёх профессий: разработчик программ, UX/UI-дизайнер, маркетолог. Для остальных доступны каталог, мягкие навыки, карта навыков, сценарии, ресурсы и наставник.</p>
            <p>ИИ подключён через облачный API Groq (модель Qwen). Если ИИ недоступен, сайт честно сообщает об этом и не подделывает ответы.</p>
            <p>Профориентационный тест остаётся дополнительным инструментом на странице «Мой путь».</p>
          </div>
        </details>
      </section>
    </div>
  );
}
