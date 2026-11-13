// Короткие конструкторы упражнений для авторов контента. Тексты — только русские строки (переводы добавляются по мере готовности).
import type { ExerciseDef, LessonDef, ModuleDef, Phase, TheoryBlock } from "@/learn/types";

type P = Phase;
export const choice = (phase: P, prompt: string, options: string[], correct: number, explain: string): ExerciseDef => ({ type: "choice", phase, prompt, options, correct, explain });
export const multi = (phase: P, prompt: string, options: string[], correct: number[], explain: string): ExerciseDef => ({ type: "multi", phase, prompt, options, correct, explain });
export const match = (phase: P, prompt: string, pairs: [string, string][], explain: string): ExerciseDef => ({ type: "match", phase, prompt, pairs, explain });
export const order = (phase: P, prompt: string, items: string[], explain: string): ExerciseDef => ({ type: "order", phase, prompt, items, explain });
export const fill = (phase: P, prompt: string, blanks: string[][], explain: string): ExerciseDef => ({ type: "fill", phase, prompt, blanks, explain });
export const text = (phase: P, prompt: string, groups: string[][], min: number, explain: string): ExerciseDef => ({ type: "text", phase, prompt, groups, min, explain });
export const kase = (phase: P, scenario: string, prompt: string, options: string[], correct: number, explain: string, feedback?: string[]): ExerciseDef => ({ type: "case", phase, scenario, prompt, options, correct, explain, ...(feedback ? { optionFeedback: feedback } : {}) });
export const project = (prompt: string, checklist: string[], explain: string): ExerciseDef => ({ type: "project", phase: "check", prompt, checklist, explain });

export const explain = (t: string): TheoryBlock => ({ kind: "explain", text: t });
export const example = (t: string): TheoryBlock => ({ kind: "example", text: t });

export const lesson = (id: string, title: string, comps: string[], theory: TheoryBlock[], objectives: string[], exercises: ExerciseDef[], minutes = 6): LessonDef => ({ id, title, minutes, objectives, theory, comps, exercises });
export const module_ = (id: string, title: string, summary: string, lessons: LessonDef[]): ModuleDef => ({ id, title, summary, lessons });
