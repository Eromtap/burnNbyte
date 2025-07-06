/*
  Warnings:

  - You are about to alter the column `height_ft` on the `UserProfile` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to alter the column `height_in` on the `UserProfile` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.

*/
-- AlterTable
ALTER TABLE "UserProfile" ALTER COLUMN "height_ft" SET DATA TYPE INTEGER,
ALTER COLUMN "height_in" SET DATA TYPE INTEGER;
