-- Restored historical migration. Every statement is additive/idempotent so it
-- is safe on databases where these fields were added manually.
ALTER TABLE "Meal"
  ADD COLUMN IF NOT EXISTS "recipeYield" INTEGER,
  ADD COLUMN IF NOT EXISTS "structuredIngredients" JSONB;

ALTER TABLE "GrocerySummary"
  ADD COLUMN IF NOT EXISTS "configuration" JSONB,
  ADD COLUMN IF NOT EXISTS "sourceHash" TEXT;

ALTER TABLE "UserProfile"
  ADD COLUMN IF NOT EXISTS "timeZone" TEXT;
