// Единый цикл обучения: состояние и действия. Порядок шагов и правильные ответы только на сервере.
import { prisma } from "./db";
import { professionById } from "@/data/professions";
import { CYCLES, findSkill } from "@/data/cycle";
import type { CycleCriterion, CycleTask } from "@/data/cycle/types";
import { checkTask, CHECKS } from "@/data/cycle/checks";
import { gradeSet, type GradedSet } from "@/challenge/logic";
import { buildProof, cycleStage, validateReflection, type CycleFacts, type CycleStage, type Proof } from "@/cycle/logic";
import { getAiConfig, isAiEnabled } from "./ai/config";
import { runAiFeature } from "./ai/run";
import { challengePrompt, validateAiHelp, type AiHelpItem } from "./ai/challengeAi";
import { checkRateLimit } from "./rateLimit";

type PubTask = { id: string; question: string; options: string[] };
const pub = (t: CycleTask): PubTask => ({ id: t.id, question: t.question, options: t.options });

export type PlanItem = {
  criterionId: string;
  name: string;
  lesson: string;
  exercise: PubTask;
  result: { answer: number; correct: boolean; explanation: string; correctText: string } | null;
};

export type CycleState = {
  supported: boolean;
  skills: { skill: string; completed: boolean }[];
  suggestedSkill: string | null; // с какого навыка начать: самая низкая самооценка среди ещё не пройденных, иначе первый в списке
  run: { id: string; skill: string } | null;
  stage: CycleStage;
  future: { title: string; impact: string; automates: string[]; humanSkills: string[] } | null;
  criteria: { id: string; name: string }[];
  diagTasks: PubTask[];
  diagResult: GradedSet | null;
  plan: PlanItem[];
  ai: { available: boolean; canSkip: boolean; skipped: boolean; reflection: string | null; tasks: PubTask[]; hints: { taskId: string; choice: number; why: string }[]; result: GradedSet | null };
  retestTasks: PubTask[];
  retestResult: GradedSet | null;
  proof: Proof | null;
  history: { skill: string; before: number; after: number; total: number; date: string }[];
};

const empty: CycleState = {
  supported: false, skills: [], suggestedSkill: null, run: null, stage: "goal", future: null, criteria: [], diagTasks: [], diagResult: null, plan: [],
  ai: { available: false, canSkip: false, skipped: false, reflection: null, tasks: [], hints: [], result: null }, retestTasks: [], retestResult: null, proof: null, history: [],
};

function gradedFrom(tasks: CycleTask[], rows: { taskId: string; answer: number; correct: boolean }[]): GradedSet | null {
  const by = new Map(rows.map((r) => [r.taskId, r]));
  if (!tasks.every((t) => by.has(t.id))) return null;
  const items = tasks.map((t) => {
    const r = by.get(t.id)!;
    return { taskId: t.id, answer: r.answer, correct: r.correct, explanation: t.explanation, correctText: t.options[t.correct] };
  });
  return { items, score: items.filter((i) => i.correct).length, total: items.length };
}

async function latestRun(profileId: string, professionId: string) {
  return prisma.cycleRun.findFirst({ where: { profileId, professionId }, orderBy: { createdAt: "desc" }, include: { answers: true, hints: true } });
}

type Run = NonNullable<Awaited<ReturnType<typeof latestRun>>>;

function analyse(run: Run | null, criteria: CycleCriterion[]) {
  const rows = (phase: string) => (run?.answers ?? []).filter((a) => a.phase === phase);
  const diag = rows("diag");
  const wrongCriteria = criteria.filter((c) => diag.find((a) => a.taskId === c.diag.id)?.correct === false);
  const practice = rows("practice");
  const hasHints = !!run && criteria.every((c) => run.hints.some((h) => h.taskId === c.ai.id));
  const aiRows = rows("ai");
  const aiTasks = run ? aiStepTasks(criteria, run.skill) : [];
  const aiDone = !!run && (run.aiSkipped || (hasHints && aiTasks.every((t) => aiRows.some((a) => a.taskId === t.id))));
  const facts: CycleFacts = {
    hasRun: !!run,
    futureSeen: !!run?.futureSeen,
    diagAnswered: criteria.filter((c) => diag.some((a) => a.taskId === c.diag.id)).length,
    criteriaTotal: criteria.length,
    practiceNeeded: wrongCriteria.length,
    practiceDone: wrongCriteria.filter((c) => practice.some((a) => a.taskId === c.practice.id)).length,
    aiFinished: aiDone,
    retestAnswered: criteria.filter((c) => rows("retest").some((a) => a.taskId === c.retest.id)).length,
  };
  return { facts, diag, wrongCriteria, practice, hasHints, aiRows, retest: rows("retest"), stage: cycleStage(facts) };
}

export async function loadCycle(profileId: string, professionId: string): Promise<CycleState> {
  const content = CYCLES[professionId];
  const prof = professionById(professionId);
  if (!content || !prof) return empty;

  const runs = await prisma.cycleRun.findMany({ where: { profileId, professionId }, orderBy: { createdAt: "asc" }, include: { answers: true, hints: true } });
  const run = runs[runs.length - 1] ?? null;
  const skillDef = run ? findSkill(professionId, run.skill) : undefined;
  const criteria = skillDef?.criteria ?? [];

  // история завершённых циклов
  const history: CycleState["history"] = [];
  for (const r of runs) {
    const sd = findSkill(professionId, r.skill);
    if (!sd) continue;
    const a = analyse(r as Run, sd.criteria);
    if (a.stage !== "proof") continue;
    const p = buildProof(sd.criteria, a.diag, a.retest, [], [], r.aiSkipped);
    history.push({ skill: r.skill, before: p.before, after: p.after, total: p.total, date: r.createdAt.toISOString().slice(0, 10) });
  }
  const completedSkills = new Set(history.map((h) => h.skill));
  const skills = content.skills.map((s) => ({ skill: s.skill, completed: completedSkills.has(s.skill) }));
  const checks = await prisma.skillCheck.findMany({ where: { profileId, professionId }, select: { skill: true, rating: true } });
  const rating = new Map(checks.map((c) => [c.skill, c.rating]));
  const todo = skills.filter((s) => !s.completed);
  const suggestedSkill = todo.length ? [...todo].sort((a, b) => (rating.get(a.skill) ?? 3) - (rating.get(b.skill) ?? 3))[0].skill : null;

  const base: CycleState = { ...empty, supported: true, skills, suggestedSkill, history };
  if (!run || !skillDef) return base;

  const a = analyse(run as Run, criteria);
  const stage = a.stage;
  const config = getAiConfig();
  const aiEnabled = isAiEnabled(config);

  const state: CycleState = {
    ...base,
    run: { id: run.id, skill: run.skill },
    stage,
    future: { title: prof.title, impact: prof.aiImpact, automates: prof.aiAutomates, humanSkills: prof.humanSkills },
    criteria: criteria.map((c) => ({ id: c.id, name: c.name })),
    diagTasks: stage === "diag" ? criteria.map((c) => pub(c.diag)) : [],
    diagResult: gradedFrom(criteria.map((c) => c.diag), a.diag),
    plan: a.wrongCriteria.map((c) => {
      const r = a.practice.find((x) => x.taskId === c.practice.id);
      return {
        criterionId: c.id, name: c.name, lesson: c.lesson, exercise: pub(c.practice),
        result: r ? { answer: r.answer, correct: r.correct, explanation: c.practice.explanation, correctText: c.practice.options[c.practice.correct] } : null,
      };
    }),
    ai: {
      available: aiEnabled,
      canSkip: !aiEnabled || run.aiFailures > 0,
      skipped: run.aiSkipped,
      reflection: run.aiReflection,
      tasks: stage === "ai" || stage === "retest" || stage === "proof" ? aiStepTasks(criteria, run.skill).map(pub) : [],
      hints: a.hasHints ? run.hints.map((h) => ({ taskId: h.taskId, choice: h.choice, why: h.why })) : [],
      result: gradedFrom(aiStepTasks(criteria, run.skill), a.aiRows),
    },
    retestTasks: stage === "retest" ? criteria.map((c) => pub(c.retest)) : [],
    retestResult: gradedFrom(criteria.map((c) => c.retest), a.retest),
    proof: null,
  };
  if (stage === "proof") {
    const hints = run.hints.map((h) => ({ taskId: h.taskId, choice: h.choice, correct: h.correct }));
    state.proof = buildProof(criteria, a.diag, a.retest, hints, a.aiRows, run.aiSkipped, criteria.map((c) => ({ taskId: `${c.id}-c`, flawed: CHECKS[c.id].flawed })));
  }
  return state;
}

type R = { ok: true } | { ok: false; error: string };

// Шаг «Человек + ИИ»: на каждый критерий задание с подсказкой ИИ и подготовленное утверждение «ИИ утверждает …»
const aiStepTasks = (cs: CycleCriterion[], skill: string) => cs.flatMap((c) => [c.ai, checkTask(c.id, skill)]);

export async function startCycle(profileId: string, professionId: string, skill: unknown): Promise<R> {
  if (typeof skill !== "string" || !findSkill(professionId, skill)) return { ok: false, error: "Выберите навык из списка" };
  const run = await latestRun(profileId, professionId);
  if (run) {
    const sd = findSkill(professionId, run.skill);
    const a = sd ? analyse(run, sd.criteria) : null;
    if (a && a.stage !== "proof") {
      if (a.diag.length > 0) return { ok: false, error: "Сначала завершите текущий цикл" };
      // диагностика ещё не начата: можно сменить навык
      await prisma.cycleRun.update({ where: { id: run.id }, data: { skill } });
      return { ok: true };
    }
  }
  await prisma.cycleRun.create({ data: { profileId, professionId, skill } });
  return { ok: true };
}

async function current(profileId: string, professionId: string) {
  const run = await latestRun(profileId, professionId);
  if (!run) return null;
  const sd = findSkill(professionId, run.skill);
  if (!sd) return null;
  return { run, criteria: sd.criteria, a: analyse(run, sd.criteria) };
}

export async function markFuture(profileId: string, professionId: string): Promise<R> {
  const c = await current(profileId, professionId);
  if (!c) return { ok: false, error: "Сначала выберите навык" };
  if (c.a.stage !== "future") return { ok: true };
  await prisma.cycleRun.update({ where: { id: c.run.id }, data: { futureSeen: true } });
  return { ok: true };
}

async function saveSet(runId: string, phase: string, g: GradedSet) {
  await prisma.$transaction(
    g.items.map((it) => prisma.cycleAnswer.upsert({
      where: { runId_phase_taskId: { runId, phase, taskId: it.taskId } },
      update: {},
      create: { runId, phase, taskId: it.taskId, answer: it.answer, correct: it.correct },
    })),
  );
}

export async function submitPhase(profileId: string, professionId: string, phase: "diag" | "ai" | "retest", answers: unknown, reflection?: unknown): Promise<R> {
  const c = await current(profileId, professionId);
  if (!c) return { ok: false, error: "Сначала выберите навык" };
  const expected: CycleStage = phase;
  if (c.a.stage !== expected) return { ok: false, error: "Сейчас этот шаг недоступен" };
  if (!answers || typeof answers !== "object") return { ok: false, error: "Ответьте на все вопросы" };
  if (phase === "ai" && !c.a.hasHints) return { ok: false, error: "Сначала получите подсказки ИИ" };
  const tasks = phase === "ai" ? aiStepTasks(c.criteria, c.run.skill) : criteria(c.criteria, phase);
  // Шаг с ИИ: нужно ещё объяснить, как проверяли подсказки (сохраняется и показывается в итоге, баллы не меняет)
  let note: string | null = null;
  if (phase === "ai") {
    const r = validateReflection(reflection);
    if (!r.ok) return r;
    note = r.text;
  }
  const g = gradeSet(tasks, answers as Record<string, unknown>);
  if (!g.ok) return g;
  await saveSet(c.run.id, phase, g.graded);
  if (note) await prisma.cycleRun.update({ where: { id: c.run.id }, data: { aiReflection: note } });
  return { ok: true };
}

const criteria = (cs: CycleCriterion[], phase: "diag" | "ai" | "retest") => cs.map((x) => x[phase]);

export async function submitPractice(profileId: string, professionId: string, taskId: unknown, answer: unknown): Promise<R> {
  const c = await current(profileId, professionId);
  if (!c) return { ok: false, error: "Сначала выберите навык" };
  if (c.a.stage !== "plan") return { ok: false, error: "Сейчас этот шаг недоступен" };
  const crit = c.a.wrongCriteria.find((x) => x.practice.id === taskId);
  if (!crit) return { ok: false, error: "Это упражнение не входит в ваш план" };
  const t = crit.practice;
  if (!Number.isInteger(answer) || (answer as number) < 0 || (answer as number) >= t.options.length) return { ok: false, error: "Выберите вариант ответа" };
  await prisma.cycleAnswer.upsert({
    where: { runId_phase_taskId: { runId: c.run.id, phase: "practice", taskId: t.id } },
    update: {},
    create: { runId: c.run.id, phase: "practice", taskId: t.id, answer: answer as number, correct: answer === t.correct },
  });
  return { ok: true };
}

export async function requestCycleAi(profileId: string, professionId: string): Promise<R> {
  const c = await current(profileId, professionId);
  if (!c) return { ok: false, error: "Сначала выберите навык" };
  if (c.a.stage !== "ai") return { ok: false, error: "Сейчас этот шаг недоступен" };
  if (c.a.hasHints) return { ok: true };
  const config = getAiConfig();
  if (!isAiEnabled(config)) return { ok: false, error: "ИИ сейчас не подключён. Подсказки не подделываются: этот шаг можно пропустить." };
  const limit = checkRateLimit(`ai:${profileId}`, config.rateLimitPerHour);
  if (!limit.ok) return { ok: false, error: `Лимит запросов к ИИ исчерпан. Повторите через ${Math.ceil(limit.retryAfterSec / 60)} мин.` };
  const tasks = criteria(c.criteria, "ai");
  const out = await runAiFeature<AiHelpItem[] | null>({ config, prompt: challengePrompt(tasks), maxTokens: 1200, validate: (raw) => validateAiHelp(raw, tasks), fallback: () => null });
  if (out.mode !== "ai" || !out.data) {
    await prisma.cycleRun.update({ where: { id: c.run.id }, data: { aiFailures: { increment: 1 } } });
    return { ok: false, error: `Не удалось получить подсказки ИИ: ${out.mode === "fallback" ? out.reason : "ошибка"}` };
  }
  await prisma.$transaction(
    out.data.map((h) => {
      const t = tasks.find((x) => x.id === h.taskId)!;
      return prisma.cycleAiHelp.upsert({ where: { runId_taskId: { runId: c.run.id, taskId: h.taskId } }, update: {}, create: { runId: c.run.id, taskId: h.taskId, choice: h.choice, why: h.why, correct: h.choice === t.correct } });
    }),
  );
  return { ok: true };
}

// Пропуск шага с ИИ разрешён только когда ИИ недоступен или запрос уже не удался. Это записывается и показывается в итоге.
export async function skipCycleAi(profileId: string, professionId: string): Promise<R> {
  const c = await current(profileId, professionId);
  if (!c) return { ok: false, error: "Сначала выберите навык" };
  if (c.a.stage !== "ai") return { ok: false, error: "Сейчас этот шаг недоступен" };
  if (isAiEnabled(getAiConfig()) && c.run.aiFailures === 0) return { ok: false, error: "ИИ доступен: пропуск возможен только после неудачной попытки получить подсказки" };
  await prisma.cycleRun.update({ where: { id: c.run.id }, data: { aiSkipped: true } });
  return { ok: true };
}
