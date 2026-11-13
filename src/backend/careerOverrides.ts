import { prisma } from "./db";
// Правки каталога из админки. Если таблицы нет или она пуста, каталог работает как в коде.
export async function careerOverrides(): Promise<Map<string, { status: string; titleKk: string | null; titleEn: string | null }>> {
  const rows = await prisma.careerOverride.findMany();
  return new Map(rows.map((r) => [r.careerId, r]));
}