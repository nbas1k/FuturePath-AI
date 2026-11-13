// Human + AI Challenge: состояние, ответы, подсказки ИИ и сравнение. Порядок соблюдается на сервере.
import { prisma } from "./db";
import { CHALLENGES } from "@/data/challenge";
import { compareChallenge, gradeSet, type AiChoice, type Comparison, type GradedSet, type GradedTask } from "@/challenge/logic";
import { getAiConfig, isAiEnabled } from "./ai/config";
import { runAiFeature } from "./ai/run";
import { challengePrompt, validateAiHelp, type AiHelpItem } from "./ai/challengeAi";
import { checkRateLimit } from "./rateLimit";

export type ChallengePhase = "solo" | "need-ai" | "with-ai" | "done";

export type ChallengeState = {
  supported: boolean;
  phase: ChallengePhase;
  soloTasks: { id: string; skill: string; question: string; options: string[] }[]; // без правильных ответов
  aiTasks: { id: string; skill: string; question: string; options: string[] }[];
  solo: GradedSet | null;
  withAi: GradedSet | null;
  hints: { taskId: string; choice: number; why: string }[]; // подсказки ИИ (без пометки верно/неверно до конца)
  comparison: Comparison | null;
  aiChoices: AiChoice[]; // с пометкой correct: только когда phase === "done"
};

const empty: ChallengeState = { supported: false, phase: "solo", soloTasks: [], aiTasks: [], solo: null, withAi: null, hints: [], comparison: null, aiChoices: [] };

const pub = (t: { id: string; skill: string; question: string; options: string[] }) => ({ id: t.id, skill: t.skill, question: t.question, options: t.options });

function rebuild(tasks: { id: string; options: string[]; correct: number; explanation: string }[], rows: { taskId: string; answer: number; correct: boolean }[]): GradedSet | null {
  if (rows.length === 0) return null;
  const by = new Map(rows.map((r) => [r.taskId, r]));
  const items: GradedTask[] = [];
  for (const t of tasks) {
    const r = by.get(t.id);
    if (!r) return null;
    items.push({ taskId: t.id, answer: r.answer, correct: r.correct, explanation: t.explanation, correctText: t.options[t.correct] });
  }
  return { items, score: items.filter((i) => i.correct).length, total: items.length };
}

export async function loadChallenge(profileId: string, professionId: string): Promise<ChallengeState> {
  const set = CHALLENGES[professionId];
  if (!set) return empty;
  const answers = await prisma.challengeAnswer.findMany({ where: { profileId, professionId } });
  const helps = await prisma.challengeAiHelp.findMany({ where: { profileId, professionId } });
  const solo = rebuild(set.solo, answers.filter((a) => a.mode === "solo"));
  const withAi = rebuild(set.ai, answers.filter((a) => a.mode === "ai"));
  const hasHints = set.ai.every((t) => helps.some((h) => h.taskId === t.id));

  const phase: ChallengePhase = !solo ? "solo" : !hasHints ? "need-ai" : !withAi ? "with-ai" : "done";
  const aiChoices: AiChoice[] = helps.map((h) => ({ taskId: h.taskId, choice: h.choice, why: h.why, correct: h.correct }));
  const comparison = phase === "done" && solo && withAi ? compareChallenge(solo, withAi, aiChoices) : null;
  return {
    supported: true,
    phase,
    soloTasks: set.solo.map(pub),
    aiTasks: set.ai.map(pub),
    solo,
    withAi,
    hints: hasHints ? helps.map((h) => ({ taskId: h.taskId, choice: h.choice, why: h.why })) : [],
    comparison,
    aiChoices: phase === "done" ? aiChoices : [],
  };
}

export async function submitSolo(profileId: string, professionId: string, answers: Record<string, unknown>): Promise<{ ok: true; graded: GradedSet } | { ok: false; error: string }> {
  const set = CHALLENGES[professionId];
  if (!set) return { ok: false, error: "Для этой профессии задания пока не готовы" };
  const state = await loadChallenge(profileId, professionId);
  if (state.phase !== "solo") return { ok: false, error: "Самостоятельная часть уже пройдена" };
  const g = gradeSet(set.solo, answers);
  if (!g.ok) return g;
  await prisma.$transaction(
    g.graded.items.map((it) =>
      prisma.challengeAnswer.upsert({
        where: { profileId_professionId_mode_taskId: { profileId, professionId, mode: "solo", taskId: it.taskId } },
        update: { answer: it.answer, correct: it.correct },
        create: { profileId, professionId, mode: "solo", taskId: it.taskId, answer: it.answer, correct: it.correct },
      }),
    ),
  );
  return g;
}

// Просим настоящий ИИ решить задания набора «с ИИ». Подделывать подсказки нельзя:
// если ИИ недоступен или ответ не по формату, возвращаем понятную ошибку.
export async function requestAiHelp(profileId: string, professionId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const set = CHALLENGES[professionId];
  if (!set) return { ok: false, error: "Для этой профессии задания пока не готовы" };
  const state = await loadChallenge(profileId, professionId);
  if (state.phase === "solo") return { ok: false, error: "Сначала пройдите задания самостоятельно" };
  if (state.phase !== "need-ai") return { ok: true }; // подсказки уже получены (повторно не генерируем)

  const config = getAiConfig();
  if (!isAiEnabled(config)) return { ok: false, error: "ИИ сейчас не подключён, поэтому задание с ИИ пройти нельзя. Подсказки не подделываются." };
  const limit = checkRateLimit(`ai:${profileId}`, config.rateLimitPerHour);
  if (!limit.ok) return { ok: false, error: `Лимит запросов к ИИ исчерпан. Повторите через ${Math.ceil(limit.retryAfterSec / 60)} мин.` };

  const outcome = await runAiFeature<AiHelpItem[] | null>({
    config,
    prompt: challengePrompt(set.ai),
    maxTokens: 900,
    validate: (raw) => validateAiHelp(raw, set.ai),
    fallback: () => null,
  });
  if (outcome.mode !== "ai" || !outcome.data) return { ok: false, error: `Не удалось получить подсказки ИИ: ${outcome.mode === "fallback" ? outcome.reason : "ошибка"}` };

  await prisma.$transaction(
    outcome.data.map((h) => {
      const task = set.ai.find((t) => t.id === h.taskId)!;
      return prisma.challengeAiHelp.upsert({
        where: { profileId_professionId_taskId: { profileId, professionId, taskId: h.taskId } },
        update: {},
        create: { profileId, professionId, taskId: h.taskId, choice: h.choice, why: h.why, correct: h.choice === task.correct },
      });
    }),
  );
  return { ok: true };
}

export async function submitWithAi(profileId: string, professionId: string, answers: Record<string, unknown>): Promise<{ ok: true; graded: GradedSet } | { ok: false; error: string }> {
  const set = CHALLENGES[professionId];
  if (!set) return { ok: false, error: "Для этой профессии задания пока не готовы" };
  const state = await loadChallenge(profileId, professionId);
  if (state.phase === "solo") return { ok: false, error: "Сначала пройдите задания самостоятельно" };
  if (state.phase === "need-ai") return { ok: false, error: "Сначала получите подсказки ИИ" };
  if (state.phase === "done") return { ok: false, error: "Эта часть уже пройдена" };
  const g = gradeSet(set.ai, answers);
  if (!g.ok) return g;
  await prisma.$transaction(
    g.graded.items.map((it) =>
      prisma.challengeAnswer.upsert({
        where: { profileId_professionId_mode_taskId: { profileId, professionId, mode: "ai", taskId: it.taskId } },
        update: { answer: it.answer, correct: it.correct },
        create: { profileId, professionId, mode: "ai", taskId: it.taskId, answer: it.answer, correct: it.correct },
      }),
    ),
  );
  return g;
}
