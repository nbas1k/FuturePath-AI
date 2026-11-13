// Преобразует авторское описание упражнения в строку БД: data (видит ученик) и answerKey (только сервер).
import { lText, seededShuffle } from "./engine";
import type { ExerciseDef, LText } from "./types";

export type ExerciseRow = {
  phase: string; type: string; prompt: LText; data: Record<string, unknown>; answerKey: Record<string, unknown>; explanation: LText;
  competencies: { id: string; weight: number }[]; verified: boolean;
};

export function toRow(def: ExerciseDef, rowId: string, lessonComps: string[]): ExerciseRow {
  const comps = (def.comps ?? lessonComps).map((id) => ({ id, weight: 1 }));
  const base = { phase: def.phase ?? "check", type: def.type, prompt: lText(def.prompt), explanation: lText(def.explain), competencies: comps, verified: def.type !== "project" };
  switch (def.type) {
    case "choice":
    case "case": {
      // Варианты перемешиваются детерминированно (по id задания), чтобы верный ответ не стоял всегда на одном месте.
      const perm = seededShuffle(def.options.map((_, i) => i), rowId);
      return { ...base, data: { options: perm.map((i) => lText(def.options[i])), ...(def.scenario ? { scenario: lText(def.scenario) } : {}), ...(def.optionFeedback ? { optionFeedback: perm.map((i) => lText(def.optionFeedback![i])) } : {}) }, answerKey: { correct: perm.indexOf(def.correct) } };
    }
    case "multi": {
      const perm = seededShuffle(def.options.map((_, i) => i), rowId);
      return { ...base, data: { options: perm.map((i) => lText(def.options[i])) }, answerKey: { correct: def.correct.map((c) => perm.indexOf(c)).sort((a, b) => a - b) } };
    }
    case "match": {
      const right = def.pairs.map((p, i) => ({ t: lText(p[1]), i }));
      const shuffled = seededShuffle(right, rowId);
      return { ...base, data: { left: def.pairs.map((p) => lText(p[0])), right: shuffled.map((r) => r.t) }, answerKey: { map: def.pairs.map((_, i) => shuffled.findIndex((r) => r.i === i)) } };
    }
    case "order": {
      const items = def.items.map((t, i) => ({ t: lText(t), i }));
      let shuffled = seededShuffle(items, rowId);
      if (items.length > 1 && shuffled.every((s, i) => s.i === i)) shuffled = [...shuffled.slice(1), shuffled[0]]; // не показываем уже верный порядок
      return { ...base, data: { items: shuffled.map((s) => s.t) }, answerKey: { order: items.map((_, i) => shuffled.findIndex((s) => s.i === i)) } };
    }
    case "fill":
      return { ...base, data: { blanks: def.blanks.length }, answerKey: { blanks: def.blanks } };
    case "text":
      return { ...base, data: {}, answerKey: { groups: def.groups, min: def.min } };
    case "project":
      return { ...base, data: { checklist: def.checklist.map(lText) }, answerKey: { n: def.checklist.length } };
  }
}
