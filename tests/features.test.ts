import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { FEATURES, COUNTS, featuresIn } from "../src/data/features";
import { STAGE_GROUPS, STAGE_LABELS, validateReflection, groupIndex } from "../src/cycle/logic";

const VALID_TABS = ["cycle", "course", "challenge", "sim", "interview", "soft", "skills", "scenarios", "resources", "mentor", "goal"];

describe("Реестр 27 функций", () => {
  it("ровно 27, номера 1..27 без повторов", () => {
    expect(FEATURES).toHaveLength(27);
    expect(FEATURES.map((f) => f.n)).toEqual(Array.from({ length: 27 }, (_, i) => i + 1));
  });
  it("честные итоги: 20 работает, 3 частично, 4 не реализовано", () => {
    expect(COUNTS).toEqual({ ready: 20, partial: 3, missing: 4 });
  });
  it("у нереализованных нет кнопки запуска и есть причина; у остальных есть рабочая ссылка", () => {
    for (const f of FEATURES) {
      if (f.status === "missing") {
        expect(f.href).toBeNull();
        expect(f.limit.length).toBeGreaterThan(20);
      } else {
        expect(f.href).toBeTruthy();
      }
      if (f.status === "partial") expect(f.limit.length).toBeGreaterThan(20);
    }
  });
  it("ссылки ведут на существующие страницы, а вкладки обучения существуют", () => {
    for (const f of FEATURES) {
      if (!f.href) continue;
      const url = new URL(f.href, "http://x");
      const dir = url.pathname === "/" ? "" : url.pathname.replace(/^\//, "");
      const dynamic = /^professions\/[a-z-]+$/.test(dir) && dir !== "professions/switch";
      const page = dynamic ? join("src/app/professions/[id]/page.tsx") : join("src/app", dir, "page.tsx");
      expect(existsSync(page), `${f.title}: нет страницы ${page}`).toBe(true);
      const tab = url.searchParams.get("tab");
      if (tab) expect(VALID_TABS).toContain(tab);
    }
  });
  it("в каждом из четырёх разделов есть функции, у каждой есть место в коде", () => {
    for (const s of ["path", "learn", "professions", "profile"] as const) expect(featuresIn(s).length).toBeGreaterThan(0);
    expect(FEATURES.every((f) => f.where.length > 0 && f.desc.length > 10)).toBe(true);
  });
});

describe("AI Readiness: шесть этапов", () => {
  it("каждый внутренний шаг цикла входит ровно в один этап", () => {
    const all = STAGE_GROUPS.flatMap((g) => g.stages);
    expect(STAGE_GROUPS).toHaveLength(6);
    expect(new Set(all).size).toBe(all.length);
    expect([...all].sort()).toEqual(STAGE_LABELS.map((s) => s.id).sort());
    expect(groupIndex("future")).toBe(0);
    expect(groupIndex("proof")).toBe(5);
  });
  it("объяснение решения: от 20 символов", () => {
    expect(validateReflection("коротко").ok).toBe(false);
    expect(validateReflection(5).ok).toBe(false);
    expect(validateReflection("x".repeat(601)).ok).toBe(false);
    expect(validateReflection("  Я проверил каждую подсказку вручную  ")).toEqual({ ok: true, text: "Я проверил каждую подсказку вручную" });
  });
});
