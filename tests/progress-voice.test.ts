import { describe, expect, it } from "vitest";
import { ACHIEVEMENTS, activeStreak, lastNDays, levelFor, unlockedAchievements, xpToReach } from "@/progress/logic";
import { nextStreak } from "@/learn/streak";
import { scoreVoice, VOICE_PROMPTS } from "@/voice/score";

describe("уровни", () => {
  it("пороги растут, уровень по XP корректен", () => {
    expect([1, 2, 3, 4, 5].map(xpToReach)).toEqual([0, 50, 150, 300, 500]);
    expect(levelFor(0).level).toBe(1);
    expect(levelFor(49).level).toBe(1);
    expect(levelFor(50).level).toBe(2);
    expect(levelFor(299).level).toBe(3);
    expect(levelFor(120)).toMatchObject({ level: 2, into: 70, need: 100, pct: 70 });
  });
});
describe("достижения и серия", () => {
  const none = { xp: 0, streak: 0, lessonsCompleted: 0, perfectLessons: 0, simsCompleted: 0, introSolved: 0, assessmentDone: false, competenciesMastered: 0 };
  it("ничего не открыто без действий, открывается по условию", () => {
    expect(unlockedAchievements(none).every((a) => !a.unlocked)).toBe(true);
    const some = unlockedAchievements({ ...none, lessonsCompleted: 1, xp: 120, streak: 3 }).filter((a) => a.unlocked).map((a) => a.id);
    expect(some.sort()).toEqual(["first-lesson", "streak-3", "xp-100"]);
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
  });
  it("серия по дням: продолжается вчера, сбрасывается после пропуска, не растёт дважды в день", () => {
    expect(nextStreak("2026-11-12", "2026-11-13", 4)).toBe(5);
    expect(nextStreak("2026-11-13", "2026-11-13", 4)).toBe(4);
    expect(nextStreak("2026-11-10", "2026-11-13", 4)).toBe(1);
    expect(nextStreak(null, "2026-11-13", 0)).toBe(1);
    expect(activeStreak("2026-11-10", 4, "2026-11-13")).toBe(0);
    expect(activeStreak("2026-11-12", 4, "2026-11-13")).toBe(4);
    expect(lastNDays(3, new Date("2026-11-13T10:00:00Z"))).toEqual(["2026-11-11", "2026-11-12", "2026-11-13"]);
  });
});
describe("голосовая практика: оценка содержания", () => {
  const p = VOICE_PROMPTS.find((x) => x.id === "voice-patient")!;
  it("хороший ответ набирает больше пустого, оценка детерминирована", () => {
    const good = "Нужно мыть руки перед едой, потому что на них бывают микробы и бактерии. Это защищает здоровье и помогает не заболеть. Например, намыльте руки мылом и тритe 20 секунд под водой.";
    const a = scoreVoice(p, good), b = scoreVoice(p, good);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(a.total).toBeGreaterThan(scoreVoice(p, "не знаю").total);
    expect(a.hit.length).toBe(p.concepts.length);
    expect(scoreVoice(p, "").total).toBe(0);
  });
  it("оценивает только текст: критерии не про голос и эмоции", () => {
    const ids = scoreVoice(p, "текст").criteria.map((c) => c.id);
    expect(ids).toEqual(["relevance", "structure", "clarity", "completeness", "terms"]);
  });
  it("есть задания для коммуникации, собеседования, выступления и профессионального диалога", () => {
    expect(new Set(VOICE_PROMPTS.map((v) => v.kind))).toEqual(new Set(["communication", "interview", "speech", "professional"]));
  });
});