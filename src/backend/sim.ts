import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { awardXp } from "./xp";
import { CODE_SIM_BY_ID, SIM_BY_ID } from "@/sim/defs";
import { applyStep, buildReport, initialState, isComplete, xpForSim } from "@/sim/engine";
import type { SimReport, SimState } from "@/sim/types";

export async function startSim(profileId: string, simId: string) {
  const def = SIM_BY_ID.get(simId);
  if (!def) return null;
  const run = (await prisma.simulationRun.findFirst({ where: { profileId, simId, status: "in_progress" }, orderBy: { createdAt: "desc" } }))
    ?? (await prisma.simulationRun.create({ data: { profileId, simId, state: initialState(def) as unknown as Prisma.InputJsonValue } }));
  return { runId: run.id, state: run.state as unknown as SimState };
}

export async function stepSim(profileId: string, runId: string, stepId: string, answer: unknown) {
  const run = await prisma.simulationRun.findFirst({ where: { id: runId, profileId } }); // чужой ход недоступен
  if (!run) return { ok: false as const, status: 404, error: "Прохождение не найдено" };
  if (run.status !== "in_progress") return { ok: false as const, status: 409, error: "Симуляция уже завершена" };
  const def = SIM_BY_ID.get(run.simId);
  if (!def) return { ok: false as const, status: 404, error: "Симуляция не найдена" };
  const { state, result } = applyStep(def, run.state as unknown as SimState, stepId, answer);
  if (!result.ok) return { ok: false as const, status: 400, error: result.error };
  await prisma.simulationRun.update({ where: { id: runId }, data: { state: state as unknown as Prisma.InputJsonValue } });
  return { ok: true as const, result };
}

export async function finishSim(profileId: string, runId: string) {
  const run = await prisma.simulationRun.findFirst({ where: { id: runId, profileId } });
  if (!run) return { ok: false as const, status: 404, error: "Прохождение не найдено" };
  const def = SIM_BY_ID.get(run.simId);
  if (!def) return { ok: false as const, status: 404, error: "Симуляция не найдена" };
  if (run.status === "completed") return { ok: true as const, report: run.report as unknown as SimReport, xp: run.xpAwarded };
  const state = run.state as unknown as SimState;
  if (!isComplete(def, state)) return { ok: false as const, status: 409, error: "Выполните все шаги" };
  const report = buildReport(def, state);
  let xp = 0;
  await prisma.$transaction(async (tx) => {
    xp = await awardXp(tx, profileId, xpForSim(def.maxXp, report.score), "simulation", def.id);
    await tx.simulationRun.update({ where: { id: runId }, data: { status: "completed", score: report.score, report: report as unknown as Prisma.InputJsonValue, xpAwarded: xp, completedAt: new Date() } });
  });
  return { ok: true as const, report, xp };
}

// Редактор кода: тесты выполняются в браузере (изолированный Worker), сервер код НЕ запускает. Поэтому результат — самоотчёт.
export async function finishCodeSim(profileId: string, simId: string, passed: number, total: number) {
  const def = CODE_SIM_BY_ID.get(simId);
  if (!def) return { ok: false as const, status: 404, error: "Симуляция не найдена" };
  if (total !== def.tests.length || !Number.isInteger(passed) || passed < 0 || passed > total) return { ok: false as const, status: 400, error: "Некорректный результат" };
  const score = passed / total;
  let xp = 0;
  await prisma.$transaction(async (tx) => {
    xp = await awardXp(tx, profileId, xpForSim(def.maxXp, score), "simulation", def.id);
    await tx.simulationRun.create({ data: { profileId, simId, status: "completed", state: { verified: false, passed, total } as Prisma.InputJsonValue, score, xpAwarded: xp, completedAt: new Date() } });
  });
  return { ok: true as const, score, xp, verified: false };
}
