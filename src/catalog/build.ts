// Каталог профессий 2.0: старые данные профессий + данные этапа 4. Всё детерминированно, без ИИ.
// ВАЖНО: матрица компетенций и универсальные навыки частично ВЫВЕДЕНЫ из исходных данных (порядок навыков, профиль категории,
// код Холланда). Это черновик для ознакомления, он не проходил экспертную проверку (reviewStatus = "draft").
import { PROFESSIONS, LEVEL_LABELS, type Profession } from "@/data/professions";
import { subjectAreaName } from "@/data/categories";
import { CYCLE_PROFESSIONS } from "@/data/cycle";
import { professionProfile } from "@/assessment/careerProfiles";
import { LETTERS, type Letter } from "@/assessment/items";
import { CATEGORY_TO_DIRECTION, DIRECTION_OVERRIDES, type CareerDirection } from "./directions";
import { EXTRA_BY_ID, type Extra } from "./extras";

export const UNIVERSAL_SKILLS = ["communication", "critical", "creativity", "problem", "teamwork", "emotional", "digital", "time", "leadership", "adaptability", "financial", "selflearning"] as const;
export type UniversalSkill = (typeof UNIVERSAL_SKILLS)[number];

export type Readiness = "intro" | "cycle";
export type Titles = { ru: string; kk: string; en: string };

export type Career = {
  id: string;
  direction: CareerDirection;
  category: string;
  titles: Titles;
  description: string;
  tasks: string[];
  competencies: { id: string; name: string; level: 1 | 2 | 3 }[]; // профессиональные, уникальный набор профессии
  universal: Record<UniversalSkill, 1 | 2 | 3>;
  topUniversal: UniversalSkill[]; // 4 самых важных
  prerequisites: { subjects: string[]; education: string };
  examples: string[]; // примеры реальных задач и проектов
  route: { study: string[]; growth: string[] };
  holland: string; // код RIASEC
  readiness: Readiness;
  reviewStatus: "draft"; // экспертной проверки не было
  challenge: { question: string; options: string[]; why: string };
};

const hash = (s: string) => { let h = 0; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };

// Детерминированная ротация вариантов ответа, чтобы верный не стоял всегда на одном месте.
export function rotateChallenge(e: Extra): { options: string[]; correct: number } {
  const n = e.options.length;
  const shift = hash(e.id) % n;
  const options = e.options.map((_, i) => e.options[(i + n - shift) % n]);
  return { options, correct: (e.correct + shift) % n };
}

export function codeToRiasec(code: string): Record<Letter, number> {
  const out = Object.fromEntries(LETTERS.map((l) => [l, 0])) as Record<Letter, number>;
  [...code].slice(0, 3).forEach((ch, i) => { if ((LETTERS as readonly string[]).includes(ch)) out[ch as Letter] = 3 - i; });
  return out;
}

const bucket = (v: number): 1 | 2 | 3 => (v >= 0.67 ? 3 : v >= 0.4 ? 2 : 1);

function universalScores(p: Profession): Record<UniversalSkill, number> {
  const prof = professionProfile(p);
  const n = prof.needs, c = prof.conditions, r = prof.riasec;
  const clamp = (x: number) => Math.max(0, Math.min(1, x));
  return {
    communication: clamp(0.6 * n.verbal + 0.4 * n.people),
    critical: clamp(0.5 * n.logic + 0.5 * n.research),
    creativity: clamp(n.creative),
    problem: clamp(0.5 * n.logic + 0.2 * n.numeric + 0.3 * n.tech),
    teamwork: clamp(n.people),
    emotional: clamp(0.6 * n.people + 0.4 * (r.S / 3)),
    digital: clamp(n.tech),
    time: clamp(n.organize),
    leadership: clamp(r.E / 3),
    adaptability: clamp(0.6 * ((c.variety - 1) / 4) + 0.4 * ((c.pace - 1) / 4)),
    financial: clamp(0.6 * n.numeric + 0.4 * (r.C / 3)),
    selflearning: clamp(0.6 * n.research + 0.4 * (r.I / 3)),
  };
}

export function directionOf(p: Profession): CareerDirection {
  return DIRECTION_OVERRIDES[p.id] ?? CATEGORY_TO_DIRECTION[p.category];
}

function build(p: Profession): Career {
  const e = EXTRA_BY_ID.get(p.id);
  if (!e) throw new Error(`Нет данных каталога для профессии ${p.id}`);
  const scores = universalScores(p);
  const universal = Object.fromEntries(UNIVERSAL_SKILLS.map((s) => [s, bucket(scores[s])])) as Career["universal"];
  const topUniversal = [...UNIVERSAL_SKILLS].sort((a, b) => scores[b] - scores[a] || UNIVERSAL_SKILLS.indexOf(a) - UNIVERSAL_SKILLS.indexOf(b)).slice(0, 4);
  const rot = rotateChallenge(e);
  return {
    id: p.id,
    direction: directionOf(p),
    category: p.category,
    titles: { ru: p.title, kk: e.kk, en: e.en },
    description: p.description,
    tasks: p.tasks,
    competencies: p.skills.map((name, i) => ({ id: `${p.id}:c${i + 1}`, name, level: (i < 2 ? 3 : i < 4 ? 2 : 1) as 1 | 2 | 3 })),
    universal,
    topUniversal,
    prerequisites: { subjects: p.subjects.map(subjectAreaName), education: LEVEL_LABELS[p.level] },
    examples: p.projects,
    route: { study: p.study, growth: p.growth },
    holland: e.code,
    readiness: CYCLE_PROFESSIONS.includes(p.id) ? "cycle" : "intro",
    reviewStatus: "draft",
    challenge: { question: e.q, options: rot.options, why: e.why },
  };
}

export const CAREERS: Career[] = PROFESSIONS.map(build);
export const CAREER_BY_ID = new Map(CAREERS.map((c) => [c.id, c]));
export const getCareer = (id: string) => CAREER_BY_ID.get(id);
export const careerTitle = (c: Career, lang: "ru" | "kk" | "en") => c.titles[lang];

// Проверка ответа на вводное задание. Верный ответ знает только сервер.
export function checkChallenge(id: string, choice: number): { ok: true; correct: boolean; correctIndex: number; why: string } | { ok: false } {
  const e = EXTRA_BY_ID.get(id);
  if (!e || !Number.isInteger(choice) || choice < 0 || choice >= e.options.length) return { ok: false };
  const rot = rotateChallenge(e);
  return { ok: true, correct: choice === rot.correct, correctIndex: rot.correct, why: e.why };
}
