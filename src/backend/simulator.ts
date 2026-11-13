// Job Simulator: прохождение «одного дня в профессии». Порядок ситуаций проверяет сервер.
import { prisma } from "./db";
import { SIMS, type Effects } from "@/data/simulator";
import { bestOption, metricsFromChoices, summarize, type Verdict } from "@/simulator/logic";

export type SimHistoryItem = {
  situation: string;
  chosen: string;
  consequence: string;
  effects: Effects;
  wasBest: boolean;
  best: string; // лучший вариант (показывается после выбора)
};

export type SimState = {
  supported: boolean;
  title: string;
  intro: string;
  run: { id: string; finished: boolean } | null;
  step: number; // номер текущей ситуации (с 0)
  total: number;
  current: { text: string; options: string[] } | null; // без последствий
  history: SimHistoryItem[];
  metrics: Effects | null;
  verdict: Verdict | null;
  finishedRuns: number; // сколько раз пройдено до конца
};

const none: SimState = { supported: false, title: "", intro: "", run: null, step: 0, total: 0, current: null, history: [], metrics: null, verdict: null, finishedRuns: 0 };

function parseChoices(raw: string): number[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((n) => Number.isInteger(n)) : [];
  } catch {
    return [];
  }
}

export async function loadSim(profileId: string, professionId: string): Promise<SimState> {
  const sc = SIMS[professionId];
  if (!sc) return none;
  const finishedRuns = await prisma.simRun.count({ where: { profileId, professionId, finished: true } });
  const run = await prisma.simRun.findFirst({ where: { profileId, professionId }, orderBy: { createdAt: "desc" } });
  const base = { supported: true, title: sc.title, intro: sc.intro, total: sc.situations.length, finishedRuns };
  if (!run) return { ...base, run: null, step: 0, current: null, history: [], metrics: null, verdict: null };

  const choices = parseChoices(run.choices);
  const m = metricsFromChoices(sc, choices);
  if (!m.ok) return { ...base, run: { id: run.id, finished: run.finished }, step: 0, current: null, history: [], metrics: null, verdict: null };

  const history: SimHistoryItem[] = choices.map((c, i) => {
    const s = sc.situations[i];
    const best = bestOption(s);
    return { situation: s.text, chosen: s.options[c].text, consequence: s.options[c].consequence, effects: s.options[c].effects, wasBest: c === best, best: s.options[best].text };
  });
  const finished = run.finished || choices.length >= sc.situations.length;
  const next = sc.situations[choices.length];
  return {
    ...base,
    run: { id: run.id, finished },
    step: choices.length,
    current: finished || !next ? null : { text: next.text, options: next.options.map((o) => o.text) },
    history,
    metrics: m.metrics,
    verdict: finished ? summarize(m.metrics) : null,
  };
}

// Начинает новое прохождение (если предыдущее не закончено — продолжает его)
export async function startRun(profileId: string, professionId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!SIMS[professionId]) return { ok: false, error: "Для этой профессии симулятор пока не готов" };
  const last = await prisma.simRun.findFirst({ where: { profileId, professionId }, orderBy: { createdAt: "desc" } });
  if (last && !last.finished) return { ok: true };
  await prisma.simRun.create({ data: { profileId, professionId } });
  return { ok: true };
}

// Принимает выбор в текущей ситуации. Нельзя пропустить ситуацию или выбрать дважды.
export async function choose(
  profileId: string,
  professionId: string,
  situationIndex: unknown,
  optionIndex: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const sc = SIMS[professionId];
  if (!sc) return { ok: false, error: "Для этой профессии симулятор пока не готов" };
  const run = await prisma.simRun.findFirst({ where: { profileId, professionId }, orderBy: { createdAt: "desc" } });
  if (!run || run.finished) return { ok: false, error: "Сначала начните симулятор" };
  const choices = parseChoices(run.choices);
  if (situationIndex !== choices.length) return { ok: false, error: "Эта ситуация уже пройдена или ещё не открыта" };
  const situation = sc.situations[choices.length];
  if (!situation || !Number.isInteger(optionIndex) || (optionIndex as number) < 0 || (optionIndex as number) >= situation.options.length) {
    return { ok: false, error: "Выберите один из вариантов" };
  }
  const next = [...choices, optionIndex as number];
  await prisma.simRun.update({
    where: { id: run.id },
    data: { choices: JSON.stringify(next), finished: next.length >= sc.situations.length },
  });
  return { ok: true };
}
