// Progress Analytics и Skills Passport: чистые функции (без базы и ИИ).
import { CONFIRM_THRESHOLD } from "@/skills/map";

export type SkillEvent = { at: number; taskKey: string; skill: string; correct: boolean };

// Сколько навыков было «подтверждено» после каждого решённого задания по времени.
// Для одного задания учитывается последняя попытка. Правило то же, что в карте навыков: от 75% верных.
export function confirmedOverTime(events: SkillEvent[]): { at: number; confirmed: number }[] {
  const sorted = [...events].sort((a, b) => a.at - b.at);
  const latest = new Map<string, SkillEvent>();
  const out: { at: number; confirmed: number }[] = [];
  for (const e of sorted) {
    latest.set(e.taskKey, e);
    const bySkill = new Map<string, { ok: number; n: number }>();
    for (const v of latest.values()) {
      const s = bySkill.get(v.skill) ?? { ok: 0, n: 0 };
      s.n++;
      if (v.correct) s.ok++;
      bySkill.set(v.skill, s);
    }
    const confirmed = [...bySkill.values()].filter((s) => Math.round((s.ok / s.n) * 100) >= CONFIRM_THRESHOLD).length;
    out.push({ at: e.at, confirmed });
  }
  return out;
}

export type Trend = { first: number; last: number; delta: number; count: number; word: "выросло" | "снизилось" | "без изменений" };

// Сравнение первой и последней попытки. Если попытка одна — сравнивать нечего (null).
export function firstLast(values: number[]): Trend | null {
  if (values.length < 2) return null;
  const first = values[0];
  const last = values[values.length - 1];
  const delta = Math.round((last - first) * 10) / 10;
  return { first, last, delta, count: values.length, word: delta > 0 ? "выросло" : delta < 0 ? "снизилось" : "без изменений" };
}

export type PassportFacts = {
  testDone: boolean;
  professionChosen: boolean;
  courseDone: boolean;
  challengeDone: boolean;
  simDone: boolean;
  interviewDone: boolean;
  confirmedSkills: number;
  mentorMessages: number;
};

// Достижения выдаются по фактам из базы, а не за вход на сайт
export function achievements(f: PassportFacts): { id: string; title: string; done: boolean }[] {
  return [
    { id: "test", title: "Прошёл профориентационный тест", done: f.testDone },
    { id: "profession", title: "Выбрал профессию", done: f.professionChosen },
    { id: "course", title: "Прошёл мини-курс и повторную проверку", done: f.courseDone },
    { id: "challenge", title: "Прошёл Human + AI Challenge", done: f.challengeDone },
    { id: "sim", title: "Прошёл рабочий день в симуляторе", done: f.simDone },
    { id: "interview", title: "Прошёл пробное собеседование", done: f.interviewDone },
    { id: "skill", title: "Подтвердил заданиями хотя бы один навык", done: f.confirmedSkills > 0 },
    { id: "mentor", title: "Поговорил с AI-наставником", done: f.mentorMessages > 0 },
  ];
}
