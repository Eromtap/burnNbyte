CREATE TABLE IF NOT EXISTS "NutritionTargetOverride" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "calories" INTEGER NOT NULL,
  "protein" DOUBLE PRECISION NOT NULL,
  "carbs" DOUBLE PRECISION NOT NULL,
  "fat" DOUBLE PRECISION NOT NULL,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NutritionTargetOverride_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "NutritionTargetOverride_userId_date_key"
  ON "NutritionTargetOverride"("userId", "date");

CREATE INDEX IF NOT EXISTS "NutritionTargetOverride_userId_date_idx"
  ON "NutritionTargetOverride"("userId", "date");

ALTER TABLE "NutritionTargetOverride"
  ADD CONSTRAINT "NutritionTargetOverride_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
