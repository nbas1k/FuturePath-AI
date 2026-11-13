// Типы авторского контента (то, что пишут в src/content) и строк БД.
// Любой текст: строка (только русский) или объект { ru, en?, kk? }. Недостающие языки берутся с русского (явный fallback).
export type L = string | { ru: string; en?: string; kk?: string };
export type LText = { ru: string; en?: string; kk?: string };
export type Lang = "ru" | "kk" | "en";

export type Phase = "first" | "harder" | "apply" | "check";
export const EXERCISE_TYPES = ["choice", "case", "multi", "match", "order", "fill", "text", "project"] as const;
export type ExerciseType = (typeof EXERCISE_TYPES)[number];
// Зарезервированные типы: логика появится на этапах 8–9, пока их нельзя выполнить, и мы честно об этом говорим.
export const RESERVED_TYPES = ["voice", "ai_dialog", "code"] as const;

type Base = { phase?: Phase; prompt: L; explain: L; comps?: string[]; id?: string };
export type ExerciseDef =
  | (Base & { type: "choice" | "case"; scenario?: L; options: L[]; correct: number; optionFeedback?: L[] })
  | (Base & { type: "multi"; options: L[]; correct: number[] })
  | (Base & { type: "match"; pairs: [L, L][] })
  | (Base & { type: "order"; items: L[] }) // перечислены в ПРАВИЛЬНОМ порядке, перемешивает система
  | (Base & { type: "fill"; blanks: string[][] }) // в prompt места пропусков отмечены ___
  | (Base & { type: "text"; groups: string[][]; min: number }) // группы ключевых слов (основы слов); минимум групп
  | (Base & { type: "project"; checklist: L[] });

export type TheoryBlock = { kind: "explain" | "example"; text: L };
export type LessonDef = { id: string; title: L; minutes?: number; objectives: L[]; theory: TheoryBlock[]; comps: string[]; maxXp?: number; exercises: ExerciseDef[] };
export type ModuleDef = { id: string; title: L; summary?: L; lessons: LessonDef[]; expertReviewed?: boolean };
export type TrackDef = { id: string; kind: "career" | "skill"; modules: ModuleDef[] };
