import { ru, type MessageKey } from "./messages/ru";
import { en } from "./messages/en";
import { kk } from "./messages/kk";

export type { MessageKey };
export const LANGS = ["ru", "kk", "en"] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = "ru";
export const LANG_COOKIE = "fp_lang";
export const LANG_LABELS: Record<Lang, string> = { ru: "Русский", kk: "Қазақша", en: "English" };

const DICTS: Record<Lang, Partial<Record<MessageKey, string>>> = { ru, kk, en };

export function isLang(v: unknown): v is Lang {
  return typeof v === "string" && (LANGS as readonly string[]).includes(v);
}

// Явный fallback: если в выбранном языке нет строки, берётся русская (язык-источник).
// Тест i18n.test.ts следит, чтобы en и kk содержали все ключи, поэтому fallback — страховка, а не норма.
export function translate(lang: Lang, key: MessageKey, vars?: Record<string, string | number>): string {
  const raw = DICTS[lang][key] ?? ru[key];
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, k: string) => (k in vars ? String(vars[k]) : `{${k}}`));
}

export function dictionaryFor(lang: Lang): Record<MessageKey, string> {
  const out = {} as Record<MessageKey, string>;
  for (const key of Object.keys(ru) as MessageKey[]) out[key] = DICTS[lang][key] ?? ru[key];
  return out;
}
