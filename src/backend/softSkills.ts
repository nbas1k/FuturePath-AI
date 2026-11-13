// Soft Skills Lab: состояние и выбор вариантов. Следующую ситуацию выбирает сервер (адаптивно), браузер её не подсказывает.
import { prisma } from "./db";
import { SOFT_ROUNDS, SOFT_SITUATIONS } from "@/data/softSkills";
import { pickNext, summarizeSoft, type Played, type SoftSummary } from "@/softskills/logic";

export type SoftState = {
  phase: "none" | "playing" | "done";
  round: number; // номер текущей ситуации, с 1
  total: number;
  current: { id: string; text: string; options: string[]; level: number } | null; // без баллов
  review: { text: string; chosen: string; points: number; why: string; best: string }[]; // разбор уже пройденных
  summary: SoftSummary | null;
  attempts: number;
};

function parse(s: string): Played[] {
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export async function loadSoft(profileId: string | null): Promise<SoftState> {
  if (!profileId) return { phase: "none", round: 0, current: null, review: [], summary: null, total: SOFT_ROUNDS, attempts: 0 };
  const runs = await prisma.softRun.findMany({ where: { profileId }, orderBy: { createdAt: "desc" } });
  const run = runs[0];
  const base = { total: SOFT_ROUNDS, attempts: runs.filter((r) => parse(r.choices).length >= SOFT_ROUNDS).length };
  if (!run) return { phase: "none", round: 0, current: null, review: [], summary: null, ...base };
  const played = parse(run.choices);
  const review = played.map((p) => {
    const s = SOFT_SITUATIONS.find((x) => x.id === p.id)!;
    const o = s.options[p.option];
    const best = s.options.reduce((a, b) => (b.points > a.points ? b : a));
    return { text: s.text, chosen: o.text, points: o.points, why: o.why, best: best.text };
  });
  if (played.length >= SOFT_ROUNDS) return { phase: "done", round: SOFT_ROUNDS, current: null, review, summary: summarizeSoft(played), ...base };
  const next = pickNext(played);
  if (!next) return { phase: "none", round: 0, current: null, review: [], summary: null, ...base };
  return { phase: "playing", round: played.length + 1, current: { id: next.id, text: next.text, options: next.options.map((o) => o.text), level: next.level }, review, summary: null, ...base };
}

// Начать новое прохождение (незавершённое продолжается)
export async function startSoft(profileId: string): Promise<{ ok: true }> {
  const s = await loadSoft(profileId);
  if (s.phase === "playing") return { ok: true };
  await prisma.softRun.create({ data: { profileId } });
  return { ok: true };
}

export async function chooseSoft(profileId: string, situationId: unknown, option: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  const run = await prisma.softRun.findFirst({ where: { profileId }, orderBy: { createdAt: "desc" } });
  if (!run) return { ok: false, error: "Сначала начните упражнение" };
  const played = parse(run.choices);
  if (played.length >= SOFT_ROUNDS) return { ok: false, error: "Упражнение уже пройдено" };
  const next = pickNext(played);
  if (!next) return { ok: false, error: "Не удалось выбрать ситуацию" };
  if (situationId !== next.id) return { ok: false, error: "Эта ситуация сейчас недоступна" };
  if (!Number.isInteger(option) || (option as number) < 0 || (option as number) >= next.options.length) return { ok: false, error: "Неверный вариант" };
  played.push({ id: next.id, option: option as number });
  await prisma.softRun.update({ where: { id: run.id }, data: { choices: JSON.stringify(played) } });
  return { ok: true };
}
