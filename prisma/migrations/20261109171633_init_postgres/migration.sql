-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Гость',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "selectedProfession" TEXT,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChallengeAnswer" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "professionId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "answer" INTEGER NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChallengeAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChallengeAiHelp" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "professionId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "choice" INTEGER NOT NULL,
    "why" TEXT NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChallengeAiHelp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimRun" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "professionId" TEXT NOT NULL,
    "choices" TEXT NOT NULL DEFAULT '[]',
    "finished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SimRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticeAnswer" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "professionId" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "taskId" TEXT NOT NULL,
    "answer" INTEGER NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PracticeAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonRead" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "professionId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LessonRead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillCheck" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "professionId" TEXT NOT NULL,
    "skill" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SkillCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiRecord" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "basedOn" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestResult" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "answers" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TestResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskProgress" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "planKey" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanProgress" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "day" INTEGER NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PlanProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MentorMessage" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "professionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MentorMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewRun" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "professionId" TEXT NOT NULL,
    "answers" TEXT NOT NULL DEFAULT '[]',
    "evaluation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SoftRun" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "choices" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SoftRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioItem" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "skills" TEXT NOT NULL DEFAULT '[]',
    "link" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortfolioItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CycleRun" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "professionId" TEXT NOT NULL,
    "skill" TEXT NOT NULL,
    "futureSeen" BOOLEAN NOT NULL DEFAULT false,
    "aiSkipped" BOOLEAN NOT NULL DEFAULT false,
    "aiFailures" INTEGER NOT NULL DEFAULT 0,
    "aiReflection" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CycleRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CycleAnswer" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "phase" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "answer" INTEGER NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CycleAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CycleAiHelp" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "choice" INTEGER NOT NULL,
    "why" TEXT NOT NULL,
    "correct" BOOLEAN NOT NULL,

    CONSTRAINT "CycleAiHelp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChallengeAnswer_profileId_professionId_mode_taskId_key" ON "ChallengeAnswer"("profileId", "professionId", "mode", "taskId");

-- CreateIndex
CREATE UNIQUE INDEX "ChallengeAiHelp_profileId_professionId_taskId_key" ON "ChallengeAiHelp"("profileId", "professionId", "taskId");

-- CreateIndex
CREATE UNIQUE INDEX "PracticeAnswer_profileId_professionId_round_taskId_key" ON "PracticeAnswer"("profileId", "professionId", "round", "taskId");

-- CreateIndex
CREATE UNIQUE INDEX "LessonRead_profileId_professionId_lessonId_key" ON "LessonRead"("profileId", "professionId", "lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "SkillCheck_profileId_professionId_skill_key" ON "SkillCheck"("profileId", "professionId", "skill");

-- CreateIndex
CREATE UNIQUE INDEX "TaskProgress_profileId_planKey_taskId_key" ON "TaskProgress"("profileId", "planKey", "taskId");

-- CreateIndex
CREATE UNIQUE INDEX "PlanProgress_profileId_day_key" ON "PlanProgress"("profileId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "CycleAnswer_runId_phase_taskId_key" ON "CycleAnswer"("runId", "phase", "taskId");

-- CreateIndex
CREATE UNIQUE INDEX "CycleAiHelp_runId_taskId_key" ON "CycleAiHelp"("runId", "taskId");

-- AddForeignKey
ALTER TABLE "ChallengeAnswer" ADD CONSTRAINT "ChallengeAnswer_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeAiHelp" ADD CONSTRAINT "ChallengeAiHelp_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimRun" ADD CONSTRAINT "SimRun_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeAnswer" ADD CONSTRAINT "PracticeAnswer_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonRead" ADD CONSTRAINT "LessonRead_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillCheck" ADD CONSTRAINT "SkillCheck_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiRecord" ADD CONSTRAINT "AiRecord_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestResult" ADD CONSTRAINT "TestResult_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskProgress" ADD CONSTRAINT "TaskProgress_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanProgress" ADD CONSTRAINT "PlanProgress_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorMessage" ADD CONSTRAINT "MentorMessage_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewRun" ADD CONSTRAINT "InterviewRun_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SoftRun" ADD CONSTRAINT "SoftRun_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioItem" ADD CONSTRAINT "PortfolioItem_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CycleRun" ADD CONSTRAINT "CycleRun_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CycleAnswer" ADD CONSTRAINT "CycleAnswer_runId_fkey" FOREIGN KEY ("runId") REFERENCES "CycleRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CycleAiHelp" ADD CONSTRAINT "CycleAiHelp_runId_fkey" FOREIGN KEY ("runId") REFERENCES "CycleRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
