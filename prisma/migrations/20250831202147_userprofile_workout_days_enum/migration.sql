-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT');

-- AlterTable
ALTER TABLE "UserProfile" ADD COLUMN     "workoutDays" "DayOfWeek"[] DEFAULT ARRAY[]::"DayOfWeek"[];
