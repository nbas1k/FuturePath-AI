// Голосовая практика: оценка СОДЕРЖАНИЯ ответа по рубрике. Оценивается только текст (расшифровка или введённый текст).
// Уверенность, эмоции и личные качества по голосу НЕ оцениваются. Аудио на сервер не отправляется и не хранится.
export type VoicePrompt = {
  id: string; title: string; kind: "communication" | "interview" | "speech" | "professional";
  question: string; tips: string[];
  concepts: { label: string; any: string[] }[]; // профессиональные понятия/элементы ответа (основы слов)
  minWords: number;
};

export const VOICE_PROMPTS: VoicePrompt[] = [
  { id: "voice-intro", title: "Расскажите о себе", kind: "communication", question: "Представьтесь и расскажите, чем вы увлекаетесь и чему хотите научиться.", tips: ["Начните с главной мысли", "Приведите пример", "Закончите выводом"], concepts: [{ label: "кто вы", any: ["меня зовут", "я учусь", "я студент", "я школьник"] }, { label: "увлечения", any: ["увлека", "люблю", "интересу"] }, { label: "цель обучения", any: ["хочу научиться", "хочу", "цель", "планирую"] }], minWords: 25 },
  { id: "voice-interview", title: "Собеседование: почему вы", kind: "interview", question: "Почему вы хотите работать в выбранной профессии и чем можете быть полезны?", tips: ["Назовите причину", "Приведите опыт или пример", "Назовите пользу для команды"], concepts: [{ label: "мотивация", any: ["потому что", "мне интересно", "привлека", "мотив"] }, { label: "опыт или пример", any: ["например", "проект", "опыт", "делал", "участвовал"] }, { label: "польза", any: ["польз", "могу помочь", "принесу", "команд", "результат"] }], minWords: 35 },
  { id: "voice-speech", title: "Короткое выступление", kind: "speech", question: "Выступите в течение минуты: почему важно проверять информацию в интернете.", tips: ["Тезис", "Два довода", "Вывод"], concepts: [{ label: "тезис", any: ["важно", "нужно проверя", "следует проверя"] }, { label: "довод", any: ["потому что", "так как", "ошибк", "фейк", "недостовер"] }, { label: "источник", any: ["источник", "автор", "подтвержд"] }, { label: "вывод", any: ["итак", "в итоге", "вывод", "поэтому"] }], minWords: 40 },
  { id: "voice-patient", title: "Разговор с пациентом (учебный)", kind: "professional", question: "Объясните пациенту простыми словами, зачем нужно мыть руки перед едой. Это учебная ситуация.", tips: ["Простой язык", "Причина", "Пример или шаги"], concepts: [{ label: "микробы/инфекции", any: ["микроб", "бактер", "инфекц", "грязь", "болезн"] }, { label: "защита здоровья", any: ["здоров", "защит", "заболе", "не заболеть"] }, { label: "как правильно", any: ["мыло", "вод", "секунд", "тереть", "намыл"] }], minWords: 25 },
];
export const VOICE_BY_ID = new Map(VOICE_PROMPTS.map((p) => [p.id, p]));

export type VoiceScore = {
  criteria: { id: "relevance" | "structure" | "clarity" | "completeness" | "terms"; label: string; score: number }[];
  total: number; hit: string[]; missed: string[]; words: number;
};

const norm = (s: string) => s.toLowerCase().replace(/ё/g, "е").replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
const STRUCTURE = ["во-первых", "во первых", "во-вторых", "во вторых", "например", "итак", "в итоге", "поэтому", "потому что", "наконец", "первое", "второе", "вывод"];

// Детерминированная проверка по рубрике. Одинаковый текст — одинаковый результат.
export function scoreVoice(p: VoicePrompt, transcript: string): VoiceScore {
  const text = norm(transcript);
  const words = text ? text.split(" ").length : 0;
  const hit = p.concepts.filter((c) => c.any.some((k) => text.includes(norm(k)))).map((c) => c.label);
  const missed = p.concepts.filter((c) => !hit.includes(c.label)).map((c) => c.label);
  const sentences = transcript.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean).length || (words ? 1 : 0);
  const avg = sentences ? words / sentences : 0;
  const markers = STRUCTURE.filter((m) => text.includes(norm(m))).length;
  const clamp = (x: number) => Math.max(0, Math.min(1, x));
  const criteria = [
    { id: "relevance" as const, label: "Соответствие заданию", score: clamp(hit.length / p.concepts.length) },
    { id: "structure" as const, label: "Структура мысли", score: clamp(markers / 3) },
    { id: "clarity" as const, label: "Ясность объяснения", score: words === 0 ? 0 : avg >= 5 && avg <= 25 ? 1 : avg < 5 ? 0.5 : clamp(1 - (avg - 25) / 25) },
    { id: "completeness" as const, label: "Полнота ответа", score: clamp(words / p.minWords) },
    { id: "terms" as const, label: "Профессиональные понятия", score: clamp(hit.length / Math.max(1, p.concepts.length - 1)) },
  ];
  return { criteria, total: criteria.reduce((s, c) => s + c.score, 0) / criteria.length, hit, missed, words };
}

export const MAX_TRANSCRIPT = 3000;
