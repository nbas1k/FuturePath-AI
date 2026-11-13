-- CreateTable
CREATE TABLE "IntroAttempt" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "careerId" TEXT NOT NULL,
    "choice" INTEGER NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "solvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntroAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IntroAttempt_profileId_careerId_key" ON "IntroAttempt"("profileId", "careerId");

-- AddForeignKey
ALTER TABLE "IntroAttempt" ADD CONSTRAINT "IntroAttempt_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
