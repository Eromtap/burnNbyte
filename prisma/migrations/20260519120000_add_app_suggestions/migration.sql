-- CreateEnum
CREATE TYPE "SuggestionKind" AS ENUM ('ADDITION', 'CHANGE');

-- CreateTable
CREATE TABLE "AppSuggestion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "SuggestionKind" NOT NULL,
    "message" TEXT NOT NULL,
    "dayKey" TEXT NOT NULL,
    "dailySlot" INTEGER NOT NULL,
    "timeZone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AppSuggestion_userId_dayKey_dailySlot_key" ON "AppSuggestion"("userId", "dayKey", "dailySlot");

-- CreateIndex
CREATE INDEX "AppSuggestion_userId_dayKey_idx" ON "AppSuggestion"("userId", "dayKey");

-- CreateIndex
CREATE INDEX "AppSuggestion_userId_createdAt_idx" ON "AppSuggestion"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "AppSuggestion" ADD CONSTRAINT "AppSuggestion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
