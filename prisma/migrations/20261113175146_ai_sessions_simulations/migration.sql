-- CreateTable
CREATE TABLE "AiSession" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "contextId" TEXT NOT NULL,
    "messages" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimulationRun" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "simId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "state" JSONB NOT NULL DEFAULT '{}',
    "score" DOUBLE PRECISION,
    "report" JSONB,
    "xpAwarded" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "SimulationRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiSession_profileId_kind_contextId_idx" ON "AiSession"("profileId", "kind", "contextId");

-- CreateIndex
CREATE INDEX "SimulationRun_profileId_simId_idx" ON "SimulationRun"("profileId", "simId");

-- AddForeignKey
ALTER TABLE "AiSession" ADD CONSTRAINT "AiSession_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulationRun" ADD CONSTRAINT "SimulationRun_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
