import { PrismaClient } from "@prisma/client";

// Один клиент базы на весь сервер (чтобы не плодить соединения в dev-режиме)
const g = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = g.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") g.prisma = prisma;
