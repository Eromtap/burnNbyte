/*
  Warnings:

  - A unique constraint covering the columns `[userId,date]` on the table `Workout` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE INDEX "Workout_userId_date_idx" ON "Workout"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Workout_userId_date_key" ON "Workout"("userId", "date");
