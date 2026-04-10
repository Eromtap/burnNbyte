ALTER TABLE "UserProfile" ADD COLUMN "mealPrepMode" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "MealFeedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mealName" TEXT NOT NULL,
    "mealType" TEXT,
    "feedback" TEXT NOT NULL,
    "ingredients" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "calories" INTEGER,
    "protein" DOUBLE PRECISION,
    "carbs" DOUBLE PRECISION,
    "fat" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MealFeedback_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MealFeedback_userId_createdAt_idx" ON "MealFeedback"("userId", "createdAt");
CREATE INDEX "MealFeedback_userId_mealName_createdAt_idx" ON "MealFeedback"("userId", "mealName", "createdAt");

ALTER TABLE "MealFeedback" ADD CONSTRAINT "MealFeedback_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
