import { describe, expect, it } from "vitest";
import { LANGS, dictionaryFor, isLang, translate } from "@/i18n";
import { ru } from "@/i18n/messages/ru";
import { en } from "@/i18n/messages/en";
import { kk } from "@/i18n/messages/kk";
import { OnboardingInput, INTEREST_IDS, isMinor, parseInterests } from "@/onboarding/schema";

describe("i18n", () => {
  it("en и kk содержат все ключи русского словаря и не содержат лишних", () => {
    const keys = Object.keys(ru).sort();
    expect(Object.keys(en).sort()).toEqual(keys);
    expect(Object.keys(kk).sort()).toEqual(keys);
  });
  it("нет пустых строк ни в одном языке", () => {
    for (const d of [ru, en, kk]) for (const [k, v] of Object.entries(d)) expect(v.trim().length, k).toBeGreaterThan(0);
  });
  it("плейсхолдеры совпадают во всех языках", () => {
    const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
    for (const key of Object.keys(ru) as (keyof typeof ru)[]) {
      expect(ph(en[key]), key).toBe(ph(ru[key]));
      expect(ph(kk[key]), key).toBe(ph(ru[key]));
    }
  });
  it("подстановка переменных и fallback", () => {
    expect(translate("en", "ob.step", { n: 2, total: 5 })).toBe("Step 2 of 5");
    expect(dictionaryFor("kk")["nav.home"]).toBe("Басты бет");
    expect(isLang("kk")).toBe(true);
    expect(isLang("de")).toBe(false);
    expect(LANGS).toHaveLength(3);
  });
  it("у каждого направления есть название на всех языках", () => {
    for (const id of INTEREST_IDS) for (const d of [ru, en, kk]) expect(d[`dir.${id}` as keyof typeof ru]).toBeTruthy();
  });
});

describe("онбординг: проверка данных", () => {
  it("принимает частичные данные и пустой объект", () => {
    expect(OnboardingInput.safeParse({}).success).toBe(true);
    expect(OnboardingInput.safeParse({ lang: "kk", goal: "all", interests: ["it", "med"] }).success).toBe(true);
  });
  it("отклоняет неизвестные значения и лишние поля", () => {
    expect(OnboardingInput.safeParse({ lang: "de" }).success).toBe(false);
    expect(OnboardingInput.safeParse({ ageGroup: "12" }).success).toBe(false);
    expect(OnboardingInput.safeParse({ name: "Иван" }).success).toBe(false); // лишних персональных данных не принимаем
  });
  it("не больше 4 интересов", () => {
    expect(OnboardingInput.safeParse({ interests: ["it", "med", "law", "biz", "eco"] }).success).toBe(false);
  });
  it("parseInterests отбрасывает мусор и дубли", () => {
    expect(parseInterests("it,it,hack,med")).toEqual(["it", "med"]);
    expect(parseInterests("")).toEqual([]);
  });
  it("несовершеннолетние определяются по возрастной группе", () => {
    expect(isMinor("u14")).toBe(true);
    expect(isMinor("14_17")).toBe(true);
    expect(isMinor("18_24")).toBe(false);
    expect(isMinor(null)).toBe(false);
  });
});
