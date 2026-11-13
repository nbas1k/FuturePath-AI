// Единый цикл обучения: стадии и доказательство прогресса. Чистые функции, без базы и без ИИ.
import type { CycleCriterion } from "@/data/cycle/types";

export type CycleStage = "goal" | "future" | "diag" | "plan" | "ai" | "retest" | "proof";

export const STAGE_LABELS: { id: CycleStage; label: string }[] = [
  { id: "goal", label: "Цель" },
  { id: "future", label: "Будущее профессии" },
  { id: "diag", label: "Диагностика" },
  { id: "plan", label: "План и обучение" },
  { id: "ai", label: "Человек + ИИ" },
  { id: "retest", label: "Повторная проверка" },
  { id: "proof", label: "Доказательство" },
];

// Шесть этапов AI Readiness для пользователя. Внутри этапа «Цель» два экрана: выбор навыка и взгляд на будущее профессии.
export const STAGE_GROUPS: { label: string; stages: CycleStage[] }[] = [
  { label: "Цель", stages: ["goal", "future"] },
  { label: "Диагностика", stages: ["diag"] },
  { label: "Обучение", stages: ["plan"] },
  { label: "Работа с ИИ", stages: ["ai"] },
  { label: "Повторная проверка", stages: ["retest"] },
  { label: "Результат", stages: ["proof"] },
];
export const groupIndex = (stage: CycleStage) => STAGE_GROUPS.findIndex((g) => g.stages.includes(stage));

export const MIN_REFLECTION = 20;
export const MAX_REFLECTION = 600;
export function validateReflection(v: unknown): { ok: true; text: string } | { ok: false; error: string } {
  if (typeof v !== "string") return { ok: false, error: "Объясните своё решение текстом" };
  const t = v.trim();
  if (t.length < MIN_REFLECTION) return { ok: false, error: `Объясните решение подробнее: хотя бы ${MIN_REFLECTION} символов` };
  if (t.length > MAX_REFLECTION) return { ok: false, error: `Объяснение слишком длинное: не больше ${MAX_REFLECTION} символов` };
  return { ok: true, text: t };
}

export type CycleFacts = {
  hasRun: boolean;
  futureSeen: boolean;
  diagAnswered: number;
  criteriaTotal: number;
  practiceNeeded: number; // сколько упражнений нужно (по числу ошибок диагностики)
  practiceDone: number;
  aiFinished: boolean; // подсказки получены и ответы даны, либо шаг пропущен из-за недоступности ИИ
  retestAnswered: number;
};

// Порядок шагов жёсткий: пропустить шаг нельзя (проверяется на сервере)
export function cycleStage(f: CycleFacts): CycleStage {
  if (!f.hasRun) return "goal";
  if (!f.futureSeen) return "future";
  if (f.diagAnswered < f.criteriaTotal) return "diag";
  if (f.practiceDone < f.practiceNeeded) return "plan";
  if (!f.aiFinished) return "ai";
  if (f.retestAnswered < f.criteriaTotal) return "retest";
  return "proof";
}

export type Answered = { taskId: string; answer: number; correct: boolean };
export type AiHint = { taskId: string; choice: number; correct: boolean };

export type CriterionResult = {
  id: string;
  name: string;
  before: boolean; // верно в диагностике
  after: boolean; // верно в повторной проверке
  status: "fixed" | "kept" | "still" | "worse";
};

export type Proof = {
  total: number;
  before: number;
  after: number;
  results: CriterionResult[];
  fixed: string[]; // исправленные ошибки
  stillWeak: string[]; // что остаётся слабым
  kept: string[];
  worse: string[];
  ceiling: boolean; // начальный результат уже максимальный
  confirmed: boolean; // навык подтверждён: все повторные задания верны (правило от 75%)
  growthText: string;
  aiNote: string;
  honesty: string;
};

export const CONFIRM_PCT = 75;

export type CheckInfo = { taskId: string; flawed: boolean };

export function buildProof(criteria: CycleCriterion[], diag: Answered[], retest: Answered[], hints: AiHint[], aiAnswers: Answered[], aiSkipped: boolean, checks?: CheckInfo[]): Proof {
  const d = new Map(diag.map((a) => [a.taskId, a.correct]));
  const r = new Map(retest.map((a) => [a.taskId, a.correct]));
  const results: CriterionResult[] = criteria.map((c) => {
    const before = d.get(c.diag.id) === true;
    const after = r.get(c.retest.id) === true;
    const status: CriterionResult["status"] = !before && after ? "fixed" : before && after ? "kept" : before && !after ? "worse" : "still";
    return { id: c.id, name: c.name, before, after, status };
  });
  const total = criteria.length;
  const before = results.filter((x) => x.before).length;
  const after = results.filter((x) => x.after).length;
  const ceiling = before === total;

  const growthText = ceiling && after === total
    ? `Начальный результат уже был максимальным (${before} из ${total}), поэтому рост показать нельзя. Повторная проверка подтвердила уровень.`
    : after > before ? `Результат вырос с ${before} до ${after} из ${total}.`
    : after === before ? `Результат не изменился: ${before} из ${total}. Роста по этим заданиям нет.`
    : `Результат снизился с ${before} до ${after} из ${total}. Стоит повторить материал.`;

  let aiNote: string;
  if (aiSkipped) aiNote = "Шаг «Человек + ИИ» пропущен: ИИ был недоступен. Умение замечать ошибки ИИ не проверено.";
  else {
    const hint = new Map(hints.map((h) => [h.taskId, h]));
    let wrong = 0, followedWrong = 0, caught = 0;
    for (const a of aiAnswers) {
      const h = hint.get(a.taskId);
      if (!h || h.correct) continue;
      wrong++;
      if (a.answer === h.choice) followedWrong++; else caught++;
    }
    const real = wrong === 0
      ? "Настоящий ИИ в этих заданиях не ошибся."
      : `Настоящий ИИ ошибся в ${wrong} из ${hints.length} заданий: вы заметили ошибку в ${caught}, а приняли неверную подсказку в ${followedWrong}.`;
    if (!checks) {
      aiNote = wrong === 0 ? "ИИ в этих заданиях не ошибся, поэтому проверить, замечаете ли вы ошибки ИИ, не удалось." : `ИИ ошибся в ${wrong} из ${aiAnswers.length} заданий. Вы заметили ошибку в ${caught}, а приняли неверную подсказку в ${followedWrong}.`;
    } else {
      const byId = new Map(aiAnswers.map((a) => [a.taskId, a.answer]));
      const flawed = checks.filter((c) => c.flawed);
      const caughtC = flawed.filter((c) => byId.get(c.taskId) === 1).length;
      const rejectedRight = checks.filter((c) => !c.flawed && byId.get(c.taskId) === 1).length;
      aiNote = `${real} Кроме того, в ${checks.length} подготовленных авторами утверждениях «ИИ» было ${flawed.length} с ошибкой: вы заметили ${caughtC}.` + (rejectedRight > 0 ? ` Верных утверждений отвергнуто: ${rejectedRight}.` : "");
    }
  }

  return {
    total, before, after, results,
    fixed: results.filter((x) => x.status === "fixed").map((x) => x.name),
    stillWeak: results.filter((x) => !x.after).map((x) => x.name),
    kept: results.filter((x) => x.status === "kept").map((x) => x.name),
    worse: results.filter((x) => x.status === "worse").map((x) => x.name),
    ceiling,
    confirmed: Math.round((after / total) * 100) >= CONFIRM_PCT,
    growthText,
    aiNote,
    honesty: `Это ${total} задания по навыку: учебный индикатор динамики. Он не доказывает, что навык или профессия освоены.`,
  };
}
