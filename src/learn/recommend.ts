// Один рекомендуемый следующий шаг в разделе «Обучение». Чистая логика, без базы.
export type LearnTab = "course" | "challenge" | "sim" | "interview" | "soft" | "skills" | "mentor" | "resources" | "scenarios" | "cycle" | "goal";

export type LearnFacts = {
  hasCourse: boolean;
  hasChallenge: boolean;
  hasSim: boolean;
  round1Done: boolean;
  lessonsRead: number;
  lessonsTotal: number;
  round2Done: boolean;
  challengePhase: "solo" | "need-ai" | "with-ai" | "done" | null; // null — для профессии нет заданий
  simFinishedRuns: number;
  hasInterview?: boolean;
  interviewDone?: boolean;
  hasCycle?: boolean; // есть единый цикл обучения для профессии
  cycleDone?: boolean; // хотя бы один цикл завершён
  cycleStage?: string; // текущий шаг цикла
  softDone?: boolean; // false — упражнение ещё не пройдено; undefined — не учитывается
};

export type Recommendation = { tab: LearnTab; title: string; text: string };

export function recommendNext(f: LearnFacts): Recommendation {
  // Главный маршрут: цикл «диагностика → обучение → человек + ИИ → повторная проверка → доказательство»
  if (f.hasCycle && !f.cycleDone) {
    const text = f.cycleStage === "goal" ? "Выберите навык, который хотите освоить." : f.cycleStage === "future" ? "Посмотрите, как ИИ меняет профессию." : f.cycleStage === "diag" ? "Пройдите диагностику без подсказок ИИ." : f.cycleStage === "plan" ? "Выполните упражнения по своим ошибкам." : f.cycleStage === "ai" ? "Решите задания вместе с подсказками ИИ." : "Пройдите повторную проверку без ИИ.";
    return { tab: "cycle", title: "Продолжите свой цикл подготовки", text };
  }
  if (f.hasCourse && !f.round1Done) {
    return { tab: "course", title: "Пройдите первую проверку", text: "Сначала проверим, что вы уже знаете. Это 4 вопроса." };
  }
  if (f.hasCourse && f.lessonsRead < f.lessonsTotal) {
    return { tab: "course", title: "Прочитайте мини-курс", text: `Прочитано уроков: ${f.lessonsRead} из ${f.lessonsTotal}.` };
  }
  if (f.hasCourse && !f.round2Done) {
    return { tab: "course", title: "Пройдите повторную проверку", text: "Курс прочитан. Проверим, что изменилось." };
  }
  if (f.hasChallenge && f.challengePhase !== "done") {
    const text = f.challengePhase === "solo" ? "Решите задания сами, без ИИ." : f.challengePhase === "need-ai" ? "Получите подсказки ИИ к похожим заданиям." : "Решите задания с подсказками ИИ.";
    return { tab: "challenge", title: "Сравните себя с ИИ", text };
  }
  if (f.hasSim && f.simFinishedRuns === 0) {
    return { tab: "sim", title: "Попробуйте рабочий день", text: "Четыре ситуации с решениями и последствиями." };
  }
  if (f.hasInterview && !f.interviewDone) {
    return { tab: "interview", title: "Пройдите пробное собеседование", text: "Несколько вопросов по профессии и разбор ответов." };
  }
  if (f.softDone === false) {
    return { tab: "soft", title: "Потренируйте мягкие навыки", text: "Шесть рабочих ситуаций, сложность подстраивается под ваши ответы." };
  }
  return { tab: "skills", title: "Посмотрите карту навыков", text: "Вы увидите, какие навыки подтверждены, а какие стоит развивать." };
}
