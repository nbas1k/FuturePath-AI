import { prisma } from "./db";
import { TRACKS } from "@/content";
import { toRow } from "@/learn/convert";
import { lText } from "@/learn/engine";

// Загружает контент из src/content в БД. Идемпотентно. Строки, которые правили в админке (source = "admin"), не трогаются.
// Статус новой строки — published (материалы показываются с пометкой «экспертной проверки не было»; админ может снять с публикации).
async function doSync() {
  for (const track of TRACKS) {
    for (const [mi, m] of track.modules.entries()) {
      const mod = { trackId: track.id, order: mi + 1, title: lText(m.title), summary: m.summary ? lText(m.summary) : undefined };
      const existing = await prisma.learnModule.findUnique({ where: { id: m.id }, select: { source: true } });
      if (!existing) await prisma.learnModule.create({ data: { id: m.id, ...mod, status: "published", expertReviewed: m.expertReviewed ?? false } });
      else if (existing.source === "seed") await prisma.learnModule.update({ where: { id: m.id }, data: mod });

      for (const [li, l] of m.lessons.entries()) {
        const lesson = { moduleId: m.id, order: li + 1, title: lText(l.title), minutes: l.minutes ?? 5, objectives: l.objectives.map(lText), theory: l.theory.map((b) => ({ kind: b.kind, text: lText(b.text) })), competencies: l.comps, maxXp: l.maxXp ?? 20 };
        const ex = await prisma.lesson.findUnique({ where: { id: l.id }, select: { source: true } });
        if (!ex) await prisma.lesson.create({ data: { id: l.id, ...lesson, status: "published" } });
        else if (ex.source === "seed") await prisma.lesson.update({ where: { id: l.id }, data: lesson });

        for (const [ei, e] of l.exercises.entries()) {
          const id = `${l.id}/e${ei + 1}`;
          const row = toRow(e, id, l.comps);
          const data = { lessonId: l.id, order: ei + 1, phase: row.phase, type: row.type, prompt: row.prompt, data: row.data as object, answerKey: row.answerKey as object, explanation: row.explanation, competencies: row.competencies, verified: row.verified };
          const ee = await prisma.exercise.findUnique({ where: { id }, select: { source: true } });
          if (!ee) await prisma.exercise.create({ data: { id, ...data } });
          else if (ee.source === "seed") await prisma.exercise.update({ where: { id }, data });
        }
      }
    }
  }
}

const g = globalThis as unknown as { __contentSync?: Promise<void> };
// Один раз на процесс. При ошибке повторим при следующем обращении.
export function ensureContent(): Promise<void> {
  if (!g.__contentSync) g.__contentSync = doSync().catch((e) => { g.__contentSync = undefined; throw e; });
  return g.__contentSync;
}
