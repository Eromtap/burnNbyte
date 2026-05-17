-- CreateEnum
CREATE TYPE "MealLibraryKind" AS ENUM ('FOOD', 'MEAL');

-- CreateTable
CREATE TABLE "MealLibraryItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "MealLibraryKind" NOT NULL,
    "name" TEXT NOT NULL,
    "defaultMealType" TEXT,
    "description" TEXT,
    "calories" INTEGER,
    "costPerServing" DOUBLE PRECISION,
    "protein" DOUBLE PRECISION,
    "carbs" DOUBLE PRECISION,
    "fat" DOUBLE PRECISION,
    "ingredients" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "recipe" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MealLibraryItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MealLibraryItem_userId_kind_updatedAt_idx" ON "MealLibraryItem"("userId", "kind", "updatedAt");

-- CreateIndex
CREATE INDEX "MealLibraryItem_userId_name_updatedAt_idx" ON "MealLibraryItem"("userId", "name", "updatedAt");

-- AddForeignKey
ALTER TABLE "MealLibraryItem" ADD CONSTRAINT "MealLibraryItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
