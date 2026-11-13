import { describe, it, expect } from "vitest";
import { validatePortfolio } from "../src/portfolio/logic";

const ok = { title: "Мой сайт", description: "Сделал страницу с описанием проекта", skills: ["Логическое мышление"], link: "https://example.com" };

describe("Portfolio Builder: проверка ввода", () => {
  it("принимает корректный проект и чистит пробелы", () => {
    const r = validatePortfolio({ ...ok, title: "  Мой сайт  " });
    expect(r.ok && r.value.title).toBe("Мой сайт");
  });
  it("отвергает короткие названия и описания", () => {
    expect(validatePortfolio({ ...ok, title: "ab" }).ok).toBe(false);
    expect(validatePortfolio({ ...ok, description: "коротко" }).ok).toBe(false);
    expect(validatePortfolio(null).ok).toBe(false);
  });
  it("ссылка: только http и https", () => {
    expect(validatePortfolio({ ...ok, link: "javascript:alert(1)" }).ok).toBe(false);
    expect(validatePortfolio({ ...ok, link: "ftp://x.y" }).ok).toBe(false);
    expect(validatePortfolio({ ...ok, link: "" }).ok).toBe(true);
  });
  it("навыков не больше 6, дубликаты убираются", () => {
    expect(validatePortfolio({ ...ok, skills: ["1", "2", "3", "4", "5", "6", "7"] }).ok).toBe(false);
    const r = validatePortfolio({ ...ok, skills: ["a", "a"] });
    expect(r.ok && r.value.skills).toEqual(["a"]);
  });
});

import { validateScenarios, scenariosPrompt, SCENARIO_NAMES } from "../src/backend/ai/scenariosAi";
import { PROFESSIONS } from "../src/data/professions";
import { RESOURCES, resourcesFor } from "../src/data/resources";

const sc = (over: object = {}) => ({ scenarios: SCENARIO_NAMES.map((name) => ({ name, description: "Описание", signals: ["a", "b"], actions: ["c", "d"], ...over })) });

describe("Future Career Scenarios", () => {
  it("принимает три сценария с нужными названиями", () => expect(validateScenarios(sc()).scenarios).toHaveLength(3));
  it("отвергает цифры, проценты и неверные названия", () => {
    expect(() => validateScenarios(sc({ description: "К 2030 году 50 тысяч" }))).toThrow();
    expect(() => validateScenarios({ scenarios: sc().scenarios.slice(1) })).toThrow();
    expect(() => validateScenarios({ scenarios: sc().scenarios.map((s) => ({ ...s, name: "Другой" })) })).toThrow();
  });
  it("запрос содержит оговорку «не прогноз»", () => expect(scenariosPrompt(PROFESSIONS[0]).system).toContain("не прогнозы"));
});

describe("Ресурсы", () => {
  it("все ссылки https, адреса уникальны, для профессии есть список", () => {
    expect(RESOURCES.every((r) => r.url.startsWith("https://"))).toBe(true);
    expect(new Set(RESOURCES.map((r) => r.url)).size).toBe(RESOURCES.length);
    expect(resourcesFor("ux-designer").length).toBeGreaterThan(3);
  });
});

describe("Сценарии: годы горизонта разрешены, выдуманные цифры нет", () => {
  it("годы 2030–2035 проходят проверку", () => {
    const r = validateScenarios({ scenarios: SCENARIO_NAMES.map((name) => ({ name, description: "К 2030–2035 годам профессия изменится", signals: ["a", "b"], actions: ["c", "d"] })) });
    expect(r.scenarios).toHaveLength(3);
  });
  it("проценты и суммы по-прежнему отклоняются", () => {
    expect(() => validateScenarios({ scenarios: SCENARIO_NAMES.map((name) => ({ name, description: "Рост на 30% к 2032 году", signals: ["a", "b"], actions: ["c", "d"] })) })).toThrow();
    expect(() => validateScenarios({ scenarios: SCENARIO_NAMES.map((name) => ({ name, description: "Зарплата 500000 тенге", signals: ["a", "b"], actions: ["c", "d"] })) })).toThrow();
  });
});
