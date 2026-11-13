-- AlterTable
ALTER TABLE "Exercise" ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'seed';

-- AlterTable
ALTER TABLE "LearnModule" ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'seed';

-- AlterTable
ALTER TABLE "Lesson" ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'seed';
