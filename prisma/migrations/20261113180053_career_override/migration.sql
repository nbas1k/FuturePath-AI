-- CreateTable
CREATE TABLE "CareerOverride" (
    "careerId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'published',
    "titleKk" TEXT,
    "titleEn" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CareerOverride_pkey" PRIMARY KEY ("careerId")
);
