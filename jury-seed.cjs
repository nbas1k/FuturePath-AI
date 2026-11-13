const { PrismaClient } = require("@prisma/client");
const { hashPassword } = require("../src/auth/password.ts");

const email = "jury@example.test";
const password = process.env.JURY_DEMO_PASSWORD;

async function seed() {
  const url = new URL(process.env.DATABASE_URL ?? "");
  if (!url.hostname.endsWith(".neon.tech") || url.pathname !== "/futurepath_jury" ||
      (url.searchParams.get("schema") ?? "public") !== "public" ||
      !["require", "verify-full"].includes(url.searchParams.get("sslmode")) ||
      !password || password.length < 8 || password.length > 128) {
    throw new Error("Expected a dedicated Neon futurepath_jury database and private demo password");
  }

  const prisma = new PrismaClient();
  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      console.log("Demo account already exists. Its password and progress were kept.");
      return;
    }
    try {
      await prisma.user.create({
        data: {
          email,
          passwordHash: hashPassword(password),
          profile: {
            create: {
              name: "Jury Demo",
              lang: "ru",
              education: "school",
              goal: "choose",
              onboardedAt: new Date(),
              portfolioItems: {
                create: {
                  title: "Career research / Исследование профессий",
                  description: "Compare daily tasks and entry-level skills in three professions.",
                },
              },
            },
          },
        },
      });
      console.log(`Demo account prepared: ${email}`);
    } catch (error) {
      if (error.code !== "P2002" || !(await prisma.user.findUnique({ where: { email } }))) throw error;
      console.log("Demo account already exists. Its password and progress were kept.");
    }
  } finally {
    await prisma.$disconnect();
  }
}

seed().catch(() => {
  console.error("Could not seed the demo account on the dedicated jury database.");
  process.exitCode = 1;
});