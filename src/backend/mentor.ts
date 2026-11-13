// AI Mentor: история диалога и отправка сообщения. Сохраняется только успешный обмен.
import { prisma } from "./db";
import { professionById } from "@/data/professions";
import { CHALLENGES } from "@/data/challenge";
import { TRACKS } from "@/data/track";
import { CYCLES } from "@/data/cycle";
import { checkTask } from "@/data/cycle/checks";
import { getLatestState } from "./results";
import { loadSkillMap } from "./skillMap";
import { loadChallenge } from "./challenge";
import { loadTrack } from "./track";
import { getAiConfig, isAiEnabled } from "./ai/config";
import { runAiFeature } from "./ai/run";
import { checkRateLimit } from "./rateLimit";
import { mentorPrompt, validateMentor, type MentorContext } from "./ai/mentorAi";
import { ACTIVE_TASK_REPLY, quotesActiveTask, validateMessage } from "@/mentor/logic";

export type MentorMsg = { id: string; role: "user" | "assistant" | "rule"; content: string };
export type MentorState = { aiAvailable: boolean; messages: MentorMsg[] };

const HISTORY_FOR_AI = 8;

export async function loadMentor(profileId: string, professionId: string): Promise<MentorState> {
  const rows = await prisma.mentorMessage.findMany({ where: { profileId, professionId }, orderBy: { createdAt: "asc" }, take: 100 });
  return { aiAvailable: isAiEnabled(getAiConfig()), messages: rows.map((r) => ({ id: r.id, role: r.role as MentorMsg["role"], content: r.content })) };
}

// Вопросы заданий, на которые человек ещё не ответил: на них наставник готовых ответов не даёт
async function activeQuestions(profileId: string, professionId: string): Promise<string[]> {
  const out: string[] = [];
  const track = TRACKS[professionId];
  if (track) {
    const t = await loadTrack(profileId, professionId);
    if (!t.round1 || !t.round2) out.push(...track.tasks.map((x) => x.question));
  }
  const set = CHALLENGES[professionId];
  if (set) {
    const c = await loadChallenge(profileId, professionId);
    if (c.phase === "solo") out.push(...set.solo.map((x) => x.question));
    if (c.phase === "need-ai" || c.phase === "with-ai") out.push(...set.ai.map((x) => x.question));
  }
  // Цикл обучения: вопросы, на которые человек ещё не ответил (диагностика, упражнения, задания с ИИ, повторная проверка)
  const cyc = CYCLES[professionId];
  if (cyc) {
    const done = new Set((await prisma.cycleAnswer.findMany({ where: { run: { profileId, professionId } }, select: { taskId: true } })).map((a) => a.taskId));
    for (const sk of cyc.skills) for (const c of sk.criteria) for (const t of [c.diag, c.practice, c.ai, c.retest, checkTask(c.id, sk.skill)]) if (!done.has(t.id)) out.push(t.question);
  }
  return out;
}

async function buildContext(profileId: string, professionId: string): Promise<MentorContext> {
  const prof = professionById(professionId);
  const state = await getLatestState(profileId);
  const map = await loadSkillMap(profileId, professionId);
  const rows = map?.map.rows ?? [];
  // Ошибки диагностики в текущем цикле (названия критериев, без ответов на задания)
  const run = await prisma.cycleRun.findFirst({ where: { profileId, professionId }, orderBy: { createdAt: "desc" }, include: { answers: true } });
  const cycleGaps: string[] = [];
  const sd = run ? CYCLES[professionId]?.skills.find((x) => x.skill === run.skill) : undefined;
  if (run && sd) for (const c of sd.criteria) if (run.answers.find((a) => a.phase === "diag" && a.taskId === c.diag.id)?.correct === false) cycleGaps.push(`${c.name} (навык «${sd.skill}»)`);
  return {
    professionTitle: prof?.title ?? professionId,
    topDirections: state.status === "ok" ? state.result.top.map((d) => d.name) : [],
    confirmed: rows.filter((r) => r.status === "confirmed").map((r) => r.skill),
    gaps: [...rows.filter((r) => r.status === "gap").map((r) => r.skill), ...cycleGaps],
    overestimated: rows.filter((r) => r.status === "overestimated").map((r) => r.skill),
  };
}

export async function sendMentorMessage(profileId: string, professionId: string, message: unknown): Promise<{ ok: true; kind: "ai" | "rule" } | { ok: false; error: string }> {
  const m = validateMessage(message);
  if (!m.ok) return m;

  // Правило без ИИ: просьба решить активное задание
  const active = await activeQuestions(profileId, professionId);
  if (quotesActiveTask(m.text, active)) {
    await prisma.mentorMessage.createMany({
      data: [
        { profileId, professionId, role: "user", content: m.text },
        { profileId, professionId, role: "rule", content: ACTIVE_TASK_REPLY },
      ],
    });
    return { ok: true, kind: "rule" };
  }

  const config = getAiConfig();
  if (!isAiEnabled(config)) return { ok: false, error: "ИИ сейчас не подключён, поэтому наставник недоступен. Ответы не подделываются." };
  const limit = checkRateLimit(`ai:${profileId}`, config.rateLimitPerHour);
  if (!limit.ok) return { ok: false, error: `Лимит запросов к ИИ исчерпан. Повторите через ${Math.ceil(limit.retryAfterSec / 60)} мин.` };

  const past = await prisma.mentorMessage.findMany({ where: { profileId, professionId, role: { in: ["user", "assistant"] } }, orderBy: { createdAt: "desc" }, take: HISTORY_FOR_AI });
  const history = past.reverse().map((r) => ({ role: r.role, content: r.content }));
  const ctx = await buildContext(profileId, professionId);

  const out = await runAiFeature<string | null>({
    config,
    prompt: mentorPrompt(ctx, history, m.text),
    maxTokens: 700,
    validate: validateMentor,
    fallback: () => null,
  });
  if (out.mode !== "ai" || !out.data) return { ok: false, error: `Наставник не ответил: ${out.mode === "fallback" ? out.reason : "ошибка"} Попробуйте ещё раз.` };

  await prisma.mentorMessage.createMany({
    data: [
      { profileId, professionId, role: "user", content: m.text },
      { profileId, professionId, role: "assistant", content: out.data },
    ],
  });
  return { ok: true, kind: "ai" };
}
