import { describe, expect, it } from "vitest";
import { CODE_SIMS, SIMS } from "@/sim/defs";
import { applyStep, buildReport, initialState, isComplete, maxCredit, xpForSim } from "@/sim/engine";
import { CAREER_BY_ID } from "@/catalog/build";
import type { SimDef, SimState } from "@/sim/types";

const doctor = SIMS.find((s) => s.id === "sim:doctor-day")!;
const arch = SIMS.find((s) => s.id === "sim:architect-plan")!;
const biz = SIMS.find((s) => s.id === "sim:entrepreneur-client")!;

function play(def: SimDef, answers: Record<string, unknown>): SimState {
  let st = initialState(def);
  for (const s of def.steps) { const r = applyStep(def, st, s.id, answers[s.id]); if (!r.result.ok) throw new Error(`${s.id}: ${r.result.error}`); st = r.state; }
  return st;
}

describe("определения симуляций", () => {
  it("у каждой есть цель, сценарий, критерии, шаги, дисклеймер и профессия из каталога", () => {
    for (const s of SIMS) {
      expect(s.goal.length).toBeGreaterThan(10);
      expect(s.scenario.length).toBeGreaterThan(20);
      expect(s.disclaimer.length).toBeGreaterThan(10);
      expect(s.steps.length).toBeGreaterThanOrEqual(3);
      expect(CAREER_BY_ID.has(s.career)).toBe(true);
      expect(s.criteria.reduce((a, c) => a + c.weight, 0)).toBeCloseTo(1, 5);
      const max = maxCredit(s);
      for (const c of s.criteria) expect(max[c.id], `${s.id}:${c.id}`).toBeGreaterThan(0); // по каждому критерию можно набрать баллы
    }
    for (const c of CODE_SIMS) { expect(CAREER_BY_ID.has(c.career)).toBe(true); expect(c.tests.length).toBeGreaterThanOrEqual(4); }
  });
  it("симуляции покрывают медицину, программирование, архитектуру и бизнес", () => {
    const careers = new Set([...SIMS, ...CODE_SIMS].map((s) => s.career));
    for (const c of ["doctor", "software-developer", "architect", "entrepreneur"]) expect(careers.has(c), c).toBe(true);
  });
  it("в медицинской симуляции нет диагнозов и лечения как рекомендаций", () => {
    const text = JSON.stringify(doctor).toLowerCase();
    expect(text).toContain("не ставя диагноз");
    expect(doctor.disclaimer.toLowerCase()).toContain("нет диагнозов");
  });
});

describe("ход симуляции", () => {
  it("лучшее прохождение даёт максимальный балл и XP", () => {
    const st = play(doctor, { s1: [0, 1, 2, 3, 4], s2: 1, s3: 0 });
    expect(isComplete(doctor, st)).toBe(true);
    const r = buildReport(doctor, st);
    expect(r.score).toBeCloseTo(1, 5);
    expect(r.improvements).toEqual([]);
    expect(xpForSim(50, r.score)).toBe(50);
  });
  it("плохое прохождение даёт низкий балл, XP нет, ошибки названы в отчёте", () => {
    const st = play(doctor, { s1: [5, 6], s2: 0, s3: 1 });
    const r = buildReport(doctor, st);
    expect(r.score).toBeLessThan(0.2);
    expect(r.improvements.length).toBeGreaterThan(0);
    expect(xpForSim(50, r.score)).toBe(0);
  });
  it("«виртуальный пациент» отвечает на выбранные вопросы", () => {
    const r = applyStep(doctor, initialState(doctor), "s1", [0, 2]);
    expect(r.result.ok && r.result.replies?.map((x) => x.reply)).toEqual([expect.stringContaining("пяти дней"), expect.stringContaining("Аллергия")]);
  });
  it("нельзя выбрать больше разрешённого, повторить шаг или перепрыгнуть вперёд", () => {
    const st0 = initialState(doctor);
    expect(applyStep(doctor, st0, "s1", [0, 1, 2, 3, 4, 5]).result.ok).toBe(false);
    expect(applyStep(doctor, st0, "s2", 1).result.ok).toBe(false); // сначала s1
    const { state } = applyStep(doctor, st0, "s1", [0]);
    expect(applyStep(doctor, state, "s1", [1]).result.ok).toBe(false);
    expect(applyStep(doctor, st0, "s1", []).result.ok).toBe(false);
    expect(applyStep(doctor, st0, "s1", [99]).result.ok).toBe(false);
    expect(applyStep(doctor, st0, "нет", 0).result.ok).toBe(false);
  });
  it("архитектура: числа проверяются с допуском, подсказка при ошибке", () => {
    let st = initialState(arch);
    const bad = applyStep(arch, st, "n1", 50);
    expect(bad.result.ok && bad.result.correct).toBe(false);
    expect(bad.result.ok && bad.result.feedback).toContain("Умножьте");
    const ok = play(arch, { n1: 5, n2: 20, n3: 10.5, n4: 30.5, p1: 1 });
    expect(buildReport(arch, ok).score).toBeCloseTo(1, 5);
    expect(applyStep(arch, st, "n1", "пять" as unknown).result.ok).toBe(false);
    st = initialState(arch);
  });
  it("бизнес: решения меняют деньги и репутацию, отчёт показывает итоговое состояние", () => {
    const best = play(biz, { s1: 1, s2: 1, s3: 0, n1: 60 });
    const rb = buildReport(biz, best);
    expect(rb.vars).toEqual({ cash: 50000, reputation: 60 });
    expect(rb.score).toBeCloseTo(1, 5);
    const worst = play(biz, { s1: 2, s2: 2, s3: 1, n1: 10 });
    expect(buildReport(biz, worst).vars.reputation).toBe(50 - 5 - 10 - 15);
    expect(buildReport(biz, worst).score).toBeLessThan(0.3);
  });
  it("отчёт детерминирован", () => {
    const a = JSON.stringify(buildReport(doctor, play(doctor, { s1: [0, 1], s2: 1, s3: 0 })));
    const b = JSON.stringify(buildReport(doctor, play(doctor, { s1: [0, 1], s2: 1, s3: 0 })));
    expect(a).toBe(b);
  });
});
