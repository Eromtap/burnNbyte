-- AlterTable
ALTER TABLE "GrocerySummary" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "archivedItems" JSONB;
