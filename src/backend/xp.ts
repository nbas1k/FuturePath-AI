import type { Prisma } from "@prisma/client";
import { dayKey, nextStreak } from "@/learn/streak";

// Начисление XP. Уникальность (профиль, тип, источник) в БД + ON CONFLICT DO NOTHING:
// один и тот же источник физически не может дать XP дважды, а конфликт не ломает транзакцию.
export async function awardXp(tx: Prisma.TransactionClient, profileId: string, amount: number, sourceType: string, sourceId: string): Promise<number> {
  if (amount <= 0) return 0;
  const r = await tx.xpTransaction.createMany({ data: [{ profileId, amount, sourceType, sourceId }], skipDuplicates: true });
  if (r.count === 0) return 0;
  const p = await tx.profile.findUniqueOrThrow({ where: { id: profileId }, select: { lastActiveDay: true, streakDays: true } });
  const today = dayKey(new Date());
  await tx.profile.update({ where: { id: profileId }, data: { xp: { increment: amount }, lastActiveDay: today, streakDays: nextStreak(p.lastActiveDay, today, p.streakDays) } });
  return amount;
}
