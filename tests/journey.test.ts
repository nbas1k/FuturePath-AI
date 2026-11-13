import { describe, it, expect } from "vitest";
import { computeJourney, TASKS_FOR_PROGRESS_STEP, type JourneyFacts } from "@/journey/logic";

const empty: JourneyFacts = { hasResult: false, selectedProfession: null, skillsTotal: 0, skillsRated: 0, planStarted: false, tasksDone: 0 };

describe("пошаговый маршрут", () => {
  it("новый пользователь — текущий шаг 1 «Узнай интересы»", () => {
    const j = computeJourney(empty);
    expect(j.current).toBe(1);
    expect(j.completed).toBe(0);
    expect(j.steps[0].current).toBe(true);
    expect(j.steps[0].nextHref).toBe("/test");
    expect(j.doneAll).toBe(false);
  });

  it("после теста текущий шаг 2 «Выбери профессию»", () => {
    const j = computeJourney({ ...empty, hasResult: true });
    expect(j.current).toBe(2);
    expect(j.steps[0].done).toBe(true);
    expect(j.steps[1].current).toBe(true);
  });

  it("после выбора профессии текущий шаг 3 с оставшимися навыками", () => {
    const j = computeJourney({ ...empty, hasResult: true, selectedProfession: "doctor", skillsTotal: 6, skillsRated: 0 });
    expect(j.current).toBe(3);
  });

  it("шаг 3 не засчитывается, пока не отмечены все навыки", () => {
    const j = computeJourney({ ...empty, hasResult: true, selectedProfession: "doctor", skillsTotal: 6, skillsRated: 5 });
    expect(j.current).toBe(3);
    expect(j.steps[2].done).toBe(false);
  });

  it("все навыки отмечены — текущий шаг 4 «Начни обучение»", () => {
    const j = computeJourney({ ...empty, hasResult: true, selectedProfession: "doctor", skillsTotal: 6, skillsRated: 6 });
    expect(j.current).toBe(4);
    expect(j.steps[3].nextHref).toBe("/learn");
  });

  it("план начат — текущий шаг 5, пока не выполнено достаточно заданий", () => {
    const j = computeJourney({ ...empty, hasResult: true, selectedProfession: "doctor", skillsTotal: 6, skillsRated: 6, planStarted: true, tasksDone: 1 });
    expect(j.current).toBe(5);
    expect(j.steps[4].done).toBe(false);
  });

  it(`шаг 5 пройден после ${TASKS_FOR_PROGRESS_STEP} заданий, всё пройдено`, () => {
    const j = computeJourney({ hasResult: true, selectedProfession: "doctor", skillsTotal: 6, skillsRated: 6, planStarted: true, tasksDone: TASKS_FOR_PROGRESS_STEP });
    expect(j.doneAll).toBe(true);
    expect(j.current).toBeNull();
    expect(j.completed).toBe(5);
  });

  it("шаги после текущего не отмечаются пройденными (нет «перескока»)", () => {
    // Задания есть, но результата нет: шаг 1 текущий, остальные не пройдены
    const j = computeJourney({ ...empty, planStarted: true, tasksDone: 9 });
    expect(j.current).toBe(1);
    expect(j.steps[0].done).toBe(false);
  });

  it("у каждого шага есть понятный вопрос и подпись кнопки", () => {
    const j = computeJourney(empty);
    j.steps.forEach((s) => {
      expect(s.question.length).toBeGreaterThan(10);
      expect(s.nextLabel.length).toBeGreaterThan(3);
    });
  });
});

describe("последовательность шагов", () => {
  it("старые задания без выбранной профессии не засчитывают шаги 4 и 5", () => {
    const j = computeJourney({ ...empty, hasResult: true, planStarted: true, tasksDone: 9 });
    expect(j.completed).toBe(1);
    expect(j.current).toBe(2);
    expect(j.steps[3].done).toBe(false);
  });
});

describe("обучение и повторная проверка влияют на шаги 4 и 5", () => {
  it("первый прочитанный урок засчитывает шаг 4", () => {
    const j = computeJourney({ hasResult: true, selectedProfession: "software-developer", skillsTotal: 5, skillsRated: 5, planStarted: false, tasksDone: 0, lessonsRead: 1 });
    expect(j.steps[3].done).toBe(true);
    expect(j.current).toBe(5);
  });
  it("повторная проверка засчитывает шаг 5", () => {
    const j = computeJourney({ hasResult: true, selectedProfession: "software-developer", skillsTotal: 5, skillsRated: 5, planStarted: true, tasksDone: 0, lessonsRead: 3, round2Done: true });
    expect(j.doneAll).toBe(true);
  });
});
