/*
  Warnings:

  - The `equipment` column on the `Workout` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `instructions` column on the `Workout` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Workout" DROP COLUMN "equipment",
ADD COLUMN     "equipment" TEXT[],
DROP COLUMN "instructions",
ADD COLUMN     "instructions" TEXT[];
