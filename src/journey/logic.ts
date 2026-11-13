// Пошаговый маршрут «Мой путь». Чистая логика без базы: по фактам о пользователе определяет текущий шаг.
// Факты берутся из базы (src/backend/journeyContext.ts), поэтому прогресс сохраняется после перезагрузки.

export type JourneyFacts = {
  hasResult: boolean; // есть актуальный результат теста
  selectedProfession: string | null; // выбранная профессия
  skillsTotal: number; // сколько навыков у выбранной профессии
  skillsRated: number; // сколько из них пользователь отметил (самооценка)
  planStarted: boolean; // начат план (отмечено задание или создана карта ИИ)
  tasksDone: number; // выполнено заданий плана
  lessonsRead?: number; // прочитано уроков мини-курса выбранной профессии (этап 2)
  round2Done?: boolean; // пройдена повторная проверка после курса (этап 2)
};

export const TASKS_FOR_PROGRESS_STEP = 5; // сколько заданий нужно, чтобы считать шаг 5 пройденным

export type StepId = 1 | 2 | 3 | 4 | 5;

export type JourneyStep = {
  id: StepId;
  title: string; // короткое название
  question: string; // что делаем на этом шаге, простыми словами
  done: boolean;
  current: boolean;
  nextLabel: string; // подпись главной кнопки на этом шаге
  nextHref: string; // куда ведёт кнопка (если она ведёт на другую страницу)
};

export type Journey = {
  steps: JourneyStep[];
  current: StepId | null; // null — всё пройдено
  completed: number; // сколько шагов пройдено
  doneAll: boolean;
};

const STEP_DEFS: Omit<JourneyStep, "done" | "current">[] = [
  { id: 1, title: "Узнай свои интересы", question: "Пройди тест из 24 вопросов. Нет правильных ответов: выбирай то, что ближе тебе.", nextLabel: "Пройти тест", nextHref: "/test" },
  { id: 2, title: "Выбери профессию", question: "Посмотри, какие профессии подходят, и выбери одну, которая интересна.", nextLabel: "Выбрать профессию", nextHref: "/path" },
  { id: 3, title: "Проверь свои навыки", question: "Отметь, что ты уже умеешь из навыков выбранной профессии. Это твоя оценка, а не проверка.", nextLabel: "Отметить навыки", nextHref: "/path" },
  { id: 4, title: "Начни обучение", question: "Начни план на 30 дней: маленькие задания каждый день.", nextLabel: "Начать план на 30 дней", nextHref: "/learn" },
  { id: 5, title: "Проверь свой прогресс", question: `Выполни ${TASKS_FOR_PROGRESS_STEP} заданий плана, затем посмотри, что уже получилось.`, nextLabel: "Посмотреть прогресс", nextHref: "/profile" },
];

export function computeJourney(f: JourneyFacts): Journey {
  const raw: boolean[] = [
    f.hasResult,
    f.selectedProfession !== null,
    f.skillsTotal > 0 && f.skillsRated >= f.skillsTotal,
    f.planStarted || (f.lessonsRead ?? 0) >= 1, // начать обучение можно планом или мини-курсом
    f.tasksDone >= TASKS_FOR_PROGRESS_STEP || f.round2Done === true, // прогресс — заданиями или повторной проверкой
  ];
  // Шаги идут по порядку: шаг засчитывается, только если пройдены все предыдущие.
  // Так «3 из 5» всегда совпадает с текущим шагом, даже если старые задания уже были.
  const done: boolean[] = [];
  raw.forEach((d, i) => done.push(d && (i === 0 || done[i - 1])));
  // Текущий шаг — первый незавершённый. Шаги после него пока закрыты.
  const firstOpen = done.findIndex((d) => !d);
  const currentIndex = firstOpen === -1 ? -1 : firstOpen;
  const steps: JourneyStep[] = STEP_DEFS.map((s, i) => ({
    ...s,
    done: done[i],
    current: i === currentIndex,
  }));
  return {
    steps,
    current: currentIndex === -1 ? null : (STEP_DEFS[currentIndex].id),
    completed: done.filter(Boolean).length,
    doneAll: currentIndex === -1,
  };
}

// Подпись для шага 2–3: что именно выбрано или сколько осталось
export function skillsLeftText(f: JourneyFacts): string {
  const left = Math.max(0, f.skillsTotal - f.skillsRated);
  return left === 0 ? "Все навыки отмечены" : `Осталось отметить: ${left}`;
}
