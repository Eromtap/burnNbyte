-- AlterTable
ALTER TABLE "UserProfile" ADD COLUMN     "equipmentAccess" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "fitnessGoals" TEXT[] DEFAULT ARRAY[]::TEXT[];
