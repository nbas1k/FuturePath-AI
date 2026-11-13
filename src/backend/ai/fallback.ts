// Резервный режим БЕЗ ИИ: тексты собираются по правилам из результата теста и каталога.
// Здесь нет выдуманных фактов: только баллы, выбранные ответы и описания из каталога.
import { DIRECTIONS } from "@/data/directions";
import { buildPlan, type PlanDay } from "@/data/plan";
import type { Profession } from "@/data/professions";
import type { Result } from "@/recommendation-engine";
import type { AnalysisOutput, RoadmapOutput, SimulatorOutput } from "./schemas";

export function analysisFallback(result: Result): AnalysisOutput {
  const names = result.top.map((d) => d.name);
  const skills = [...new Set(result.professions.slice(0, 3).flatMap((p) => p.profession.skills))].slice(0, 6);
  // Ресурсы — только виды обучения из каталога (без ссылок и названий курсов)
  const studies = [...new Set(result.professions.slice(0, 3).flatMap((p) => p.profession.study))].slice(0, 4);
  return {
    summary:
      `По результату теста сильнее всего выражены направления: ${names.join(", ")}. ` +
      "Это текст, собранный по правилам из баллов и ответов, а не ответ ИИ.",
    strengths: result.top.map((d) => `${d.name}: ${d.contributions[0]?.optionText ?? "выбранные ответы"}`),
    interests: result.top.map((d) => DIRECTIONS.find((x) => x.id === d.id)?.short ?? d.name),
    skills: skills.length >= 2 ? skills : ["Логическое мышление", "Умение учиться новому"],
    // Навыки, которые нужны выбранным профессиям. Что у вас уже есть, по тесту не измерено.
    missingSkills: skills.length >= 2 ? skills.slice(0, 5) : ["Логическое мышление", "Умение учиться новому"],
    resources: studies.length >= 1 ? studies : ["Школьные кружки и факультативы по интересующему направлению"],
  };
}

// План на 30 дней по правилам (тот же, что на странице «План»), но в формате дорожной карты
export function roadmapFallback(top: Parameters<typeof buildPlan>[0]): RoadmapOutput {
  const days: PlanDay[] = buildPlan(top);
  return {
    days: days.map((p) => ({
      day: p.day,
      title: `День ${p.day}${p.direction ? ` · ${DIRECTIONS.find((d) => d.id === p.direction)?.name ?? ""}` : ""}`,
      task: p.task,
    })),
  };
}

// Для симулятора резерв берёт готовые формулировки из каталога
export function simulatorFallback(profession: Profession): SimulatorOutput {
  return {
    summary: `${profession.aiImpact} (Текст из каталога, а не ответ ИИ.)`,
    automates: profession.aiAutomates,
    humanSkills: profession.humanSkills,
    advice: "Поговорите с человеком этой профессии и попробуйте одно задание из плана на 30 дней.",
  };
}
