// Чистая логика симуляций: применение шага и итоговый отчёт. Детерминированно, без ИИ.
import type { Credit, SimDef, SimReport, SimState, SimStep } from "./types";

export type StepResult =
  | { ok: true; feedback: string; replies?: { text: string; reply: string }[]; correct?: boolean; vars: Record<string, number> }
  | { ok: false; error: string };

export const initialState = (def: SimDef): SimState => ({ answers: {}, vars: { ...(def.stateVars ?? {}) } });

const addCredit = (acc: Record<string, number>, c?: Credit) => { for (const [k, v] of Object.entries(c ?? {})) acc[k] = (acc[k] ?? 0) + v; };

// Потолок баллов по критерию: сумма положительных вкладов, которые можно набрать лучшим выбором на каждом шаге.
export function maxCredit(def: SimDef): Record<string, number> {
  const m: Record<string, number> = {};
  for (const s of def.steps) {
    if (s.kind === "pick") {
      const best: Record<string, number> = {};
      for (const o of s.options) for (const [k, v] of Object.entries(o.credit ?? {})) best[k] = Math.max(best[k] ?? 0, v);
      addCredit(m, best);
    } else if (s.kind === "multi") {
      const pos: Record<string, number> = {};
      for (const o of s.options) for (const [k, v] of Object.entries(o.credit ?? {})) if (v > 0) pos[k] = (pos[k] ?? 0) + v;
      addCredit(m, pos);
    } else addCredit(m, s.credit);
  }
  return m;
}

export function creditFor(def: SimDef, answers: SimState["answers"]): Record<string, number> {
  const got: Record<string, number> = {};
  for (const s of def.steps) {
    const a = answers[s.id];
    if (a === undefined) continue;
    if (s.kind === "pick" && Number.isInteger(a)) addCredit(got, s.options[a as number]?.credit);
    else if (s.kind === "multi" && Array.isArray(a)) for (const i of a as number[]) addCredit(got, s.options[i]?.credit);
    else if (s.kind === "number" && typeof a === "number" && Math.abs(a - s.expected) <= s.tolerance) addCredit(got, s.credit);
  }
  return got;
}

export function applyStep(def: SimDef, state: SimState, stepId: string, answer: unknown): { state: SimState; result: StepResult } {
  const step = def.steps.find((s) => s.id === stepId);
  if (!step) return { state, result: { ok: false, error: "Шаг не найден" } };
  if (state.answers[stepId] !== undefined) return { state, result: { ok: false, error: "Этот шаг уже выполнен" } };
  // Шаги идут по порядку: нельзя перепрыгнуть вперёд
  const idx = def.steps.indexOf(step);
  if (def.steps.slice(0, idx).some((s) => state.answers[s.id] === undefined)) return { state, result: { ok: false, error: "Сначала выполните предыдущие шаги" } };

  const vars = { ...state.vars };
  let result: StepResult;
  if (step.kind === "pick") {
    if (!Number.isInteger(answer) || (answer as number) < 0 || (answer as number) >= step.options.length) return { state, result: { ok: false, error: "Некорректный выбор" } };
    const o = step.options[answer as number];
    for (const [k, v] of Object.entries(o.effects ?? {})) vars[k] = (vars[k] ?? 0) + v;
    result = { ok: true, feedback: o.feedback, vars };
  } else if (step.kind === "multi") {
    const a = answer as unknown;
    if (!Array.isArray(a) || a.some((x) => !Number.isInteger(x) || x < 0 || x >= step.options.length) || new Set(a).size !== a.length || a.length === 0 || a.length > step.max) return { state, result: { ok: false, error: `Выберите от 1 до ${step.max} вариантов` } };
    result = { ok: true, feedback: "", replies: (a as number[]).map((i) => ({ text: step.options[i].text, reply: step.options[i].reply })), vars };
  } else {
    if (typeof answer !== "number" || !Number.isFinite(answer)) return { state, result: { ok: false, error: "Введите число" } };
    const ok = Math.abs(answer - step.expected) <= step.tolerance;
    result = { ok: true, correct: ok, feedback: ok ? step.feedbackOk : `${step.feedbackBad} ${step.hint}`, vars };
  }
  return { state: { answers: { ...state.answers, [stepId]: answer }, vars }, result };
}

export function buildReport(def: SimDef, state: SimState): SimReport {
  const max = maxCredit(def);
  const got = creditFor(def, state.answers);
  const criteria = def.criteria.map((c) => ({ id: c.id, label: c.label, score: max[c.id] > 0 ? Math.max(0, Math.min(1, (got[c.id] ?? 0) / max[c.id])) : 0 }));
  const wsum = def.criteria.reduce((s, c) => s + c.weight, 0);
  const score = criteria.reduce((s, c, i) => s + c.score * def.criteria[i].weight, 0) / (wsum || 1);
  return {
    score,
    criteria,
    strengths: criteria.filter((c) => c.score >= 0.8).map((c) => c.label),
    improvements: criteria.filter((c) => c.score < 0.6).map((c) => c.label),
    vars: state.vars,
  };
}

export const isComplete = (def: SimDef, state: SimState) => def.steps.every((s) => state.answers[s.id] !== undefined);
export const xpForSim = (maxXp: number, score: number) => (score >= 0.5 ? Math.round(maxXp * score) : 0);
export type { SimStep };
