/*
  Warnings:

  - You are about to drop the column `height_ft` on the `UserProfile` table. All the data in the column will be lost.
  - You are about to drop the column `height_in` on the `UserProfile` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "UserProfile" DROP COLUMN "height_ft",
DROP COLUMN "height_in",
ADD COLUMN     "heightFt" DOUBLE PRECISION,
ADD COLUMN     "heightIn" DOUBLE PRECISION;
