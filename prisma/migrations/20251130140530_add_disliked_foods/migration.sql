-- AlterTable
ALTER TABLE "UserProfile" ADD COLUMN     "dislikedFoods" TEXT[] DEFAULT ARRAY[]::TEXT[];
